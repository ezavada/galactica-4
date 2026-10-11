// Host documents and the native HTTP listener. Player login and turn transport
// build on this service; public game information never includes the game graph.
const Game=require('./game.js'),Config=require('./game-config.js'),Factory=require('./factory.js'),Rules=require('./rules.js'),Save=require('./game-save.js');
const {HostLogin,protocol}=require('./host-login.js');
const HostView=require('./host-view.js');
const Orders=require('./player-orders.js');
function failure(code){const error=new Error(code);error.code=code;return error;}
function validate(config){
    if(!(config instanceof Config) || config.validate().length || !config.hosting || config.skipMapGeneration ||
        !Number.isSafeInteger(config.maxTimePerTurn) || config.maxTimePerTurn<0 || config.maxTimePerTurn>Math.floor(Number.MAX_SAFE_INTEGER/1000) || typeof config.endEarly!=='boolean')throw failure('invalid_host_config');
}
class NetworkHost {
    constructor(game,file,fs){validate(game.config);if(game.config.networkHost && game.config.networkHost.settingsRevision!==undefined && (!Number.isSafeInteger(game.config.networkHost.settingsRevision) || game.config.networkHost.settingsRevision<0))throw failure('invalid_host_settings');this.game=game;this.file=file;this.fs=fs;this.server=null;this.login=new HostLogin(game,()=>this.persist());
        // Each host owns its portable stream, so failed staging never consumes live/global randomness.
        if(game.tutorialRandom==null)game.tutorialRandom=require('./simulation-random.js').create(parseInt(game.config.networkHost.id.slice(0,8),16)%2147483646+1);
        this.clock=new (require('./host-clock.js'))(game);this.clockTimer=null;this.clockError=null;}
    static create(options,file,fs=require('fs')){
        const admission=options.admission===undefined?undefined:require('./host-admission.js').validate(options.admission);
        const config=new Config({...options,hosting:true,skipMapGeneration:false,autoplay:{enabled:false}});validate(config);
        if(typeof file!=='string' || !file)throw failure('invalid_host_file');
        const game=new Game(new Factory(),new Rules(config.fastGame),config);
        return NetworkHost.publish(game,file,fs,admission);
    }
    static fromLocal(text,numHumans,file,fs=require('fs')){return NetworkHost.publish(require('./host-conversion.js').prepare(text,numHumans),file,fs);}
    static publish(game,file,fs,admission){
        if(typeof file!=='string' || !file)throw failure('invalid_host_file');
        // Publish a complete document atomically without replacing an existing
        // path. Failed writes leave neither a partial host nor a temporary file.
        const host=new NetworkHost(game,file,fs);if(admission!==undefined)game.config.networkHost.admission=require('./host-admission.js').validate(admission);game.config.networkHost.clock=host.clock.snapshot();
        const path=require('path'),snapshot=Save.serialize(game);
        const temporary=fs.mkdtempSync(path.join(path.dirname(file),'.galactica-host-'));
        try {
            const staged=path.join(temporary,'host.gad4.json');
            fs.writeFileSync(staged,snapshot,{encoding:'utf8',flag:'wx',mode:0o600});
            fs.linkSync(staged,file);
        } finally {fs.rmSync(temporary,{recursive:true,force:true});}
        return host;
    }
    static open(file,fs=require('fs')){const text=fs.readFileSync(file,'utf8'),game=Save.restore(text);if(!game.config.hosting){if(game.config.networkHost!==undefined)throw failure('invalid_host_config');const error=failure('local_turn_file');error.sourceText=text;error.local={title:game.config.gameTitle,totalPlayers:game.config.totalPlayers,turn:game.turn};throw error;}const migrate=game.config.networkHost===undefined;const host=new NetworkHost(game,file,fs);if(migrate)host.persist();return host;}
    persist(){
        const path=require('path'),temporary=this.fs.mkdtempSync(path.join(path.dirname(this.file),'.galactica-host-'));
        const host=this.game.config.networkHost,previous=host.clock;host.clock=this.clock.snapshot();
        try{const staged=path.join(temporary,'host.gad4.json');this.fs.writeFileSync(staged,Save.serialize(this.game),{encoding:'utf8',flag:'wx',mode:0o600});this.fs.renameSync(staged,this.file);}
        catch(error){if(previous===undefined)delete host.clock;else host.clock=previous;throw error;}
        finally{this.fs.rmSync(temporary,{recursive:true,force:true});}
    }
    info(){const c=this.game.config;return {protocol,version:'4.0',title:c.gameTitle,turn:this.game.turn,
        humans:c.numHumans,computers:c.numComputers,sectorSize:c.sectorSize,density:c.density,fastGame:c.fastGame,
        fogOfWar:!c.omniscient,skill:c.compSkill,advantage:c.compAdvantage,maxTimePerTurn:c.maxTimePerTurn,endEarly:c.endEarly,
        requiresAdmissionCode:!!(c.networkHost.admission && (c.networkHost.admission.allowed.length || !c.networkHost.admission.allowWithoutCode)),gameId:c.networkHost.id,slots:this.login.info(),clock:this.clock.info()};}
    postOrders(player,request){
        if(!request || typeof request!=='object' || Array.isArray(request))throw failure('bad_orders');
        const digest=require('crypto').createHash('sha256').update(JSON.stringify(request)).digest('hex');
        const old=this.game,host=old.config.networkHost,receipt=host.posts && host.posts[player];
        if(receipt && receipt.postId===request.postId){if(receipt.digest!==digest)throw failure('bad_orders');return;}
        if(request.gameId!==host.id)throw failure('wrong_game');
        if(request.turn!==old.turn)throw failure('wrong_turn');
        if(old.players[player].lastTurnPosted===old.turn)throw failure('already_posted');
        if(old.isGameOver)throw failure('game_complete');
        this.transact(staged=>{
            const ids=Orders.apply(staged,player,request);staged.players[player].lastTurnPosted=staged.turn;
            staged.config.networkHost.posts={...(staged.config.networkHost.posts || {}),[player]:{postId:request.postId,digest,turn:request.turn,ids}};
            // V3 leaves turn 1 untimed until all human slots have posted.
            const ready=this.ready(staged);
            if(ready && (staged.turn===1 || staged.config.maxTimePerTurn===0 || staged.config.endEarly) && !this.clock.paused)staged.endTurn();
        });
    }
    transact(change){
        const old=this.game,clock=this.clock,types=[require('./star.js'),require('./ship.js'),require('./fleet.js'),require('./rendezvous.js')],counters=types.map(type=>type.nextId);
        const clockState={turn:clock.turn,limit:clock.limit,configuredLimit:clock.configuredLimit,remainingMs:clock.remainingMs,paused:clock.paused,startedAt:clock.startedAt};
        try{
            const staged=Save.restore(Save.serialize(old));change(staged);this.game=staged;this.login.game=staged;
            if(staged.turn!==old.turn || staged.isGameOver)clock.reset(staged,!!this.server);
            try{this.persist();}catch(error){throw failure('host_save_failed');}
            this.clockError=null;
        }catch(error){this.game=old;this.login.game=old;Object.assign(clock,clockState);types.forEach((type,index)=>{type.nextId=counters[index];});throw error;}
    }
    ready(game){
        // V3 robot hosts advance continuously while multiple AIs survive.
        if(game.config.numHumans===0)return game.players.filter(p=>p && p.isComputer && p.isAlive).length>1;
        const slots=game.config.getHumanPlayerSlots(),living=slots.map(id=>game.players[id]).filter(p=>p.isAlive);
        if(!living.length)return game.players.some(p=>p && p.isLoggedIn) && game.players.filter(p=>p && p.isComputer && p.isAlive).length>1;
        return game.config.networkHost.players.every((claim,index)=>claim && (!game.players[slots[index]].isAlive || game.players[slots[index]].lastTurnPosted===game.turn));
    }
    tick(){
        if(!this.server || this.game.isGameOver || this.clock.paused)return false;
        const ready=this.ready(this.game) && (this.game.config.numHumans===0 || this.game.turn===1 || this.game.config.maxTimePerTurn===0 || this.game.config.endEarly);
        if(!ready && (this.game.config.numHumans===0 || !this.clock.expired()))return false;
        this.transact(game=>game.endTurn());return true;
    }
    changePlayer(value,revision,turn){
        const Players=require('./host-players.js'),current=Players.revision(this.game);
        if(!Number.isSafeInteger(revision) || revision!==current || current===Number.MAX_SAFE_INTEGER || turn!==this.game.turn)throw failure('stale_host_player');
        if(this.game.isGameOver && value?.action!=='eject')throw failure('game_complete');
        let revoke;this.transact(game=>{revoke=Players.apply(game,value);});if(revoke)this.login.revokePlayer(value.player,value.action==='eject'?'admin_ejected':'not_logged_in');
    }
    updateAdmission(value,revision){
        const Admission=require('./host-admission.js'),policy=Admission.validate(value),current=Admission.revision(this.game);
        if(!Number.isSafeInteger(revision) || revision!==current || current===Number.MAX_SAFE_INTEGER)throw failure('stale_host_admission');
        this.transact(game=>{game.config.networkHost.admission=policy;game.config.networkHost.admissionRevision=current+1;});
    }
    updateSettings(value,revision){
        const Settings=require('./host-settings.js'),settings=Settings.validate(value),current=this.game.config.networkHost.settingsRevision || 0;
        if(!Number.isSafeInteger(revision) || revision!==current || current===Number.MAX_SAFE_INTEGER)throw failure('stale_host_settings');
        if(this.game.isGameOver)throw failure('game_complete');
        this.transact(game=>{Settings.apply(game,settings);game.config.networkHost.settingsRevision=current+1;this.clock.configure(game,!!this.server);});
    }
    forceEndTurn(expectedTurn){
        if(expectedTurn!==this.game.turn)throw failure('stale_host_turn');
        if(this.game.isGameOver)throw failure('game_complete');
        this.transact(game=>game.endTurn());
    }
    pauseClock(){this.transact(()=>this.clock.pause());}
    resumeClock(){this.transact(()=>this.clock.resume(!!this.server));}
    playerState(viewer){return {...HostView.snapshot(this.game,viewer),gameId:this.game.config.networkHost.id,clock:this.clock.info()};}
    handle(req,res){
        const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
            'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization',
            'Access-Control-Allow-Methods':'GET, POST, OPTIONS'};
        const respond=(status,body)=>{res.writeHead(status,headers);res.end(body===undefined?'':JSON.stringify(body));};
        const routes=['/info','/login','/session','/logout','/state','/orders'];
        if(!routes.includes(req.url)){respond(404,{error:'not_found'});return;}
        if(req.method==='OPTIONS'){respond(204);return;}
        if(req.url==='/info'){respond(req.method==='GET'?200:405,req.method==='GET'?this.info():{error:'method_not_allowed'});return;}
        const token=()=>{const value=req.headers && req.headers.authorization;return typeof value==='string' && value.startsWith('Bearer ')?value.slice(7):null;};
        if(req.url==='/state' && req.method==='GET'){
            let session;try{session=this.login.authenticate(token());}catch(error){respond(401,{error:error.code || 'not_logged_in'});return;}
            try{respond(200,this.playerState(session.player));}
            catch(error){respond(500,{error:'host_state_failed'});}return;
        }
        if(req.url==='/session' && req.method==='GET'){
            try{respond(200,{...this.login.authenticate(token()),gameId:this.game.config.networkHost.id,turn:this.game.turn});}
            catch(error){respond(401,{error:error.code || 'not_logged_in'});}return;
        }
        if(req.url==='/logout' && req.method==='POST'){
            try{respond(200,this.login.logout(token()));}catch(error){respond(401,{error:error.code || 'not_logged_in'});}return;
        }
        if(req.url==='/orders' && req.method==='POST'){
            let session;try{session=this.login.authenticate(token());}catch(error){respond(401,{error:error.code || 'not_logged_in'});return;}
            let body='',bytes=0,answered=false;req.setEncoding('utf8');req.on('error',()=>{answered=true;});
            req.on('data',chunk=>{bytes+=Buffer.byteLength(chunk,'utf8');if(bytes>64*1024*1024){if(!answered){answered=true;respond(413,{error:'orders_too_large'});}return;}body+=chunk;});
            req.on('end',()=>{if(answered)return;let request;try{request=JSON.parse(body);}catch(error){respond(400,{error:'bad_orders'});return;}
                try{const current=this.login.authenticate(token());if(current.player!==session.player)throw failure('not_logged_in');this.postOrders(current.player,request);
                    respond(200,{...this.playerState(current.player),orderIds:this.game.config.networkHost.posts[current.player].ids});}
                catch(error){const status=['not_logged_in','admin_ejected'].includes(error.code)?401:['wrong_game','wrong_turn','already_posted','game_complete'].includes(error.code)?409:error.code==='bad_orders'?400:500;
                    respond(status,{error:status===500?'host_save_failed':error.code});}
            });return;
        }
        if(req.url!=='/login' || req.method!=='POST'){respond(405,{error:'method_not_allowed'});return;}
        let body='',bytes=0,answered=false;req.setEncoding('utf8');
        req.on('error',()=>{answered=true;});
        req.on('data',chunk=>{bytes+=Buffer.byteLength(chunk,'utf8');if(bytes>8192){if(!answered){answered=true;respond(413,{error:'login_too_large'});}return;}body+=chunk;});
        req.on('end',()=>{
            if(answered)return;
            let request;try{request=JSON.parse(body);}catch(error){respond(400,{error:'bad_login_request'});return;}
            try{respond(200,this.login.login(request));}
            catch(error){const status=['bad_password','not_logged_in'].includes(error.code)?401:
                ['duplicate_name','game_full','player_not_found','wrong_game'].includes(error.code)?409:
                error.code==='not_admitted'?403:
                ['bad_protocol','bad_login_request'].includes(error.code)?400:500;
                respond(status,{error:status===500?'host_save_failed':error.code});}
        });
    }
    listen({port=0,address='127.0.0.1'}={}){
        if(this.server) return Promise.reject(failure('host_already_listening'));
        if(!Number.isInteger(port) || port<0 || port>65535 || typeof address!=='string' || !address)return Promise.reject(failure('invalid_host_address'));
        const server=require('http').createServer((req,res)=>this.handle(req,res));this.server=server;
        return new Promise((resolve,reject)=>{
            const failed=error=>{this.server=null;reject(error);};server.once('error',failed);
            server.listen(port,address,()=>{server.removeListener('error',failed);this.clock.start();this.clockTimer=setInterval(()=>{try{this.tick();}catch(error){this.clockError=error.code || 'host_save_failed';}},250);resolve(server.address());});
        });
    }
    async close(){
        const previous={remainingMs:this.clock.remainingMs,startedAt:this.clock.startedAt};
        this.clock.stop();try{this.persist();}catch(error){Object.assign(this.clock,previous);throw error;}
        if(this.clockTimer!==null){clearInterval(this.clockTimer);this.clockTimer=null;}
        this.login.disconnectAll();const server=this.server;this.server=null;
        if(server)await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
    }
}
module.exports={NetworkHost,protocol,validate};
