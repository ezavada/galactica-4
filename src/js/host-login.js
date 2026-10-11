// Server-side player admission. V3's rejoin key identifies the game; the
// optional player password verifies rejoining, and the last successful login wins.
const crypto=require('crypto'),PlayerName=require('./player-name.js'),Admission=require('./host-admission.js');
const {protocol}=require('./network-protocol.js');
function failure(code){const error=new Error(code);error.code=code;return error;}
const random=()=>crypto.randomBytes(32).toString('hex');
function passwordHash(password,salt){return crypto.pbkdf2Sync(password,salt,100000,32,'sha256').toString('hex');}
function validPassword(value){return typeof value==='string' && Array.from(value).length<=64 && !/[\u0000-\u001f\u007f-\u009f]/.test(value);}
class HostLogin {
    constructor(game,commit){
        this.game=game;this.commit=commit;this.sessions=new Map();this.revocations=new Map();
        const c=game.config;
        if(c.networkHost===undefined)c.networkHost={id:random(),players:Array(c.numHumans).fill(null)};
        const host=c.networkHost;
        if(host)Admission.validateSaved(host);
        if(!host || typeof host.id!=='string' || !/^[0-9a-f]{64}$/.test(host.id) || !Array.isArray(host.players) || host.players.length!==c.numHumans)throw failure('invalid_host_players');
        if(host.playersRevision!==undefined && (!Number.isSafeInteger(host.playersRevision) || host.playersRevision<0))throw failure('invalid_host_players');
        if(host.initialStateRevision!==undefined && (!Number.isSafeInteger(host.initialStateRevision) || host.initialStateRevision<0))throw failure('invalid_host_players');
        if(host.playerStateRevision!==undefined && (!Number.isSafeInteger(host.playerStateRevision) || host.playerStateRevision<0 || host.playerStateRevision>(host.playersRevision || 0)+(host.initialStateRevision || 0)))throw failure('invalid_host_players');
        for(const p of game.players.slice(1))if(typeof p.isComputer!=='boolean' || typeof p.isHuman!=='boolean' || p.isComputer===c.isHumanPlayer(p.playerNum) || p.isHuman!==c.isHumanPlayer(p.playerNum))throw failure('invalid_host_players');
        const names=new Set();
        for(const player of host.players){
            if(player===null)continue;
            if(!player || typeof player!=='object' || Array.isArray(player) || !PlayerName.validName(player.name) || typeof player.salt!=='string' || typeof player.hash!=='string' || !/^[0-9a-f]{64}$/.test(player.salt) || !/^[0-9a-f]{64}$/.test(player.hash) || names.has(player.name))throw failure('invalid_host_players');
            names.add(player.name);
        }
        // A restored host has no live connections, regardless of saved flags.
        for(const i of c.getHumanPlayerSlots())game.players[i].isLoggedIn=false;
    }
    info(){const slots=this.game.config.getHumanPlayerSlots();return this.game.config.networkHost.players.map((claim,i)=>({player:slots[i],status:claim?'occupied':'open',
        ...(claim?{name:claim.name,online:this.game.players[slots[i]].isLoggedIn}:{} )}));}
    login(request){
        if(!request || typeof request!=='object' || Array.isArray(request) || request.protocol!==protocol)throw failure('bad_protocol');
        if(!['join','rejoin'].includes(request.mode) || !PlayerName.validName(request.name) || !validPassword(request.password===undefined?'':request.password))throw failure('bad_login_request');
        if(request.admissionCode!==undefined && (typeof request.admissionCode!=='string' || request.admissionCode!=='' && !Admission.validCode(request.admissionCode)))throw failure('bad_login_request');
        const c=this.game.config,host=c.networkHost,password=request.password===undefined?'':request.password;
        if(request.gameId!==undefined && request.gameId!==host.id)throw failure('wrong_game');
        const matching=host.players.findIndex(p=>p && p.name===request.name),free=host.players.indexOf(null);
        let slot;const slots=c.getHumanPlayerSlots();
        if(request.mode==='join'){
            if((host.playersRevision || 0)===Number.MAX_SAFE_INTEGER)throw failure('invalid_host_players');
            if(free<0)throw failure('game_full');
            if(matching>=0)throw failure('duplicate_name');
            if(!Admission.allows(this.game,request.admissionCode))throw failure('not_admitted');
            slot=free;
            const salt=random(),claim={name:request.name,salt,hash:passwordHash(password,salt)};
            const previousName=this.game.players[slots[slot]].name,previousNames=c.humanPlayerNames,previousEvents=this.game.eventLog,previousChatKey=require('./host-chat.js').claimKey(this.game,slots[slot]);
            c.networkHost={...host,playersRevision:(host.playersRevision || 0)+1,players:host.players.map((p,i)=>i===slot?claim:p)};
            c.humanPlayerNames={...previousNames,[slots[slot]]:request.name};this.game.players[slots[slot]].name=request.name;
            require('./host-chat.js').bindClaim(this.game,slots[slot],previousChatKey);
            try{this.commit();}catch(error){this.game.eventLog=previousEvents;c.networkHost=host;c.humanPlayerNames=previousNames;this.game.players[slots[slot]].name=previousName;throw error;}
        }else{
            if(matching<0)throw failure('player_not_found');
            slot=matching;const claim=host.players[slot];
            if(!crypto.timingSafeEqual(Buffer.from(claim.hash,'hex'),Buffer.from(passwordHash(password,claim.salt),'hex')))throw failure('bad_password');
        }
        const player=slots[slot];
        for(const [token,session] of this.sessions)if(session.player===player)this.sessions.delete(token);
        const token=random();this.sessions.set(token,{player,name:request.name});this.game.players[player].isLoggedIn=true;
        return {protocol,gameId:c.networkHost.id,player,name:request.name,token,turn:this.game.turn};
    }
    revokePlayer(player,reason='not_logged_in'){for(const [token,session] of this.sessions)if(session.player===player){this.sessions.delete(token);if(reason==='admin_ejected')this.revocations.set(token,reason);}while(this.revocations.size>256)this.revocations.delete(this.revocations.keys().next().value);this.game.players[player].isLoggedIn=false;}
    authenticate(token){const session=typeof token==='string' && this.sessions.get(token);if(!session)throw failure(this.revocations.get(token) || 'not_logged_in');return session;}
    logout(token){const session=this.authenticate(token);this.sessions.delete(token);this.game.players[session.player].isLoggedIn=false;return {player:session.player};}
    disconnectAll(){this.sessions.clear();this.revocations.clear();for(const i of this.game.config.getHumanPlayerSlots())this.game.players[i].isLoggedIn=false;}
}
module.exports={HostLogin,protocol};
