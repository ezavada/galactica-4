// Host documents and the native HTTP listener. Player login and turn transport
// build on this service; public game information never includes the game graph.
const Game=require('./game.js'),Config=require('./game-config.js'),Factory=require('./factory.js'),Rules=require('./rules.js'),Save=require('./game-save.js');
const protocol=1;
function failure(code){const error=new Error(code);error.code=code;return error;}
function validate(config){
    if(!(config instanceof Config) || config.validate().length || !config.hosting || config.numHumans<1 || config.skipMapGeneration ||
        !Number.isSafeInteger(config.maxTimePerTurn) || config.maxTimePerTurn<0 || typeof config.endEarly!=='boolean')throw failure('invalid_host_config');
}
class NetworkHost {
    constructor(game,file,fs){validate(game.config);this.game=game;this.file=file;this.fs=fs;this.server=null;}
    static create(options,file,fs=require('fs')){
        const config=new Config({...options,hosting:true,skipMapGeneration:false,autoplay:{enabled:false}});validate(config);
        if(typeof file!=='string' || !file)throw failure('invalid_host_file');
        const game=new Game(new Factory(),new Rules(config.fastGame),config);
        // Publish a complete document atomically without replacing an existing
        // path. Failed writes leave neither a partial host nor a temporary file.
        const path=require('path'),snapshot=Save.serialize(game);
        const temporary=fs.mkdtempSync(path.join(path.dirname(file),'.galactica-host-'));
        try {
            const staged=path.join(temporary,'host.gad4.json');
            fs.writeFileSync(staged,snapshot,{encoding:'utf8',flag:'wx',mode:0o600});
            fs.linkSync(staged,file);
        } finally {fs.rmSync(temporary,{recursive:true,force:true});}
        return new NetworkHost(game,file,fs);
    }
    static open(file,fs=require('fs')){const game=Save.restore(fs.readFileSync(file,'utf8'));return new NetworkHost(game,file,fs);}
    info(){const c=this.game.config;return {protocol,version:'4.0',title:c.gameTitle,turn:this.game.turn,
        humans:c.numHumans,computers:c.numComputers,sectorSize:c.sectorSize,density:c.density,fastGame:c.fastGame,
        fogOfWar:!c.omniscient,skill:c.compSkill,advantage:c.compAdvantage,maxTimePerTurn:c.maxTimePerTurn,endEarly:c.endEarly,
        slots:Array.from({length:c.numHumans},(_,i)=>({player:i+1,status:'open'}))};}
    handle(req,res){
        // Only lobby information is public. Save graphs, filesystem paths and
        // future authentication state must never be returned by this endpoint.
        const ok=req.method==='GET' && req.url==='/info';
        res.writeHead(ok?200:req.url==='/info'?405:404,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
        res.end(JSON.stringify(ok?this.info():{error:req.url==='/info'?'method_not_allowed':'not_found'}));
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
    close(){if(!this.server)return Promise.resolve();const server=this.server;this.server=null;return new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
}
module.exports={NetworkHost,protocol,validate};
