// Host documents and the native HTTP listener. Player login and turn transport
// build on this service; public game information never includes the game graph.
const Game=require('./game.js'),Config=require('./game-config.js'),Factory=require('./factory.js'),Rules=require('./rules.js'),Save=require('./game-save.js');
const {HostLogin,protocol}=require('./host-login.js');
function failure(code){const error=new Error(code);error.code=code;return error;}
function validate(config){
    if(!(config instanceof Config) || config.validate().length || !config.hosting || config.numHumans<1 || config.skipMapGeneration ||
        !Number.isSafeInteger(config.maxTimePerTurn) || config.maxTimePerTurn<0 || typeof config.endEarly!=='boolean')throw failure('invalid_host_config');
}
class NetworkHost {
    constructor(game,file,fs){validate(game.config);this.game=game;this.file=file;this.fs=fs;this.server=null;this.login=new HostLogin(game,()=>this.persist());}
    static create(options,file,fs=require('fs')){
        const config=new Config({...options,hosting:true,skipMapGeneration:false,autoplay:{enabled:false}});validate(config);
        if(typeof file!=='string' || !file)throw failure('invalid_host_file');
        const game=new Game(new Factory(),new Rules(config.fastGame),config);
        // Publish a complete document atomically without replacing an existing
        // path. Failed writes leave neither a partial host nor a temporary file.
        const host=new NetworkHost(game,file,fs);
        const path=require('path'),snapshot=Save.serialize(game);
        const temporary=fs.mkdtempSync(path.join(path.dirname(file),'.galactica-host-'));
        try {
            const staged=path.join(temporary,'host.gad4.json');
            fs.writeFileSync(staged,snapshot,{encoding:'utf8',flag:'wx',mode:0o600});
            fs.linkSync(staged,file);
        } finally {fs.rmSync(temporary,{recursive:true,force:true});}
        return host;
    }
    static open(file,fs=require('fs')){const game=Save.restore(fs.readFileSync(file,'utf8')),migrate=game.config.networkHost===undefined;const host=new NetworkHost(game,file,fs);if(migrate)host.persist();return host;}
    persist(){
        const path=require('path'),temporary=this.fs.mkdtempSync(path.join(path.dirname(this.file),'.galactica-host-'));
        try{const staged=path.join(temporary,'host.gad4.json');this.fs.writeFileSync(staged,Save.serialize(this.game),{encoding:'utf8',flag:'wx',mode:0o600});this.fs.renameSync(staged,this.file);}
        finally{this.fs.rmSync(temporary,{recursive:true,force:true});}
    }
    info(){const c=this.game.config;return {protocol,version:'4.0',title:c.gameTitle,turn:this.game.turn,
        humans:c.numHumans,computers:c.numComputers,sectorSize:c.sectorSize,density:c.density,fastGame:c.fastGame,
        fogOfWar:!c.omniscient,skill:c.compSkill,advantage:c.compAdvantage,maxTimePerTurn:c.maxTimePerTurn,endEarly:c.endEarly,
        gameId:c.networkHost.id,slots:this.login.info()};}
    handle(req,res){
        const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
            'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization',
            'Access-Control-Allow-Methods':'GET, POST, OPTIONS'};
        const respond=(status,body)=>{res.writeHead(status,headers);res.end(body===undefined?'':JSON.stringify(body));};
        const routes=['/info','/login','/session','/logout'];
        if(!routes.includes(req.url)){respond(404,{error:'not_found'});return;}
        if(req.method==='OPTIONS'){respond(204);return;}
        if(req.url==='/info'){respond(req.method==='GET'?200:405,req.method==='GET'?this.info():{error:'method_not_allowed'});return;}
        const token=()=>{const value=req.headers && req.headers.authorization;return typeof value==='string' && value.startsWith('Bearer ')?value.slice(7):null;};
        if(req.url==='/session' && req.method==='GET'){
            try{respond(200,{...this.login.authenticate(token()),gameId:this.game.config.networkHost.id,turn:this.game.turn});}
            catch(error){respond(401,{error:error.code || 'not_logged_in'});}return;
        }
        if(req.url==='/logout' && req.method==='POST'){
            try{respond(200,this.login.logout(token()));}catch(error){respond(401,{error:error.code || 'not_logged_in'});}return;
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
            server.listen(port,address,()=>{server.removeListener('error',failed);resolve(server.address());});
        });
    }
    close(){this.login.disconnectAll();if(!this.server)return Promise.resolve();const server=this.server;this.server=null;return new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
}
module.exports={NetworkHost,protocol,validate};
