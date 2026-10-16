const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),Art=require('../src/js/art-resources.js');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const manifest=require('../data/artwork.json');
assert.equal(manifest.default,'anime');assert.equal(manifest.assets.length,19);
for(const asset of manifest.assets){
 assert.equal(hash(path.join(root,'data',asset.path)),asset.sha256);
 assert.equal(hash(path.join(root,asset.source)),asset.sha256);
 if(asset.name==='labtop'||asset.path.includes('pict-30')||asset.name==='stardockfront')assert(Art.hasAlpha(asset.path));
}
for(const id of [3110,3112,2202])assert(!Art.hasAlpha('events/layers/pict-'+id+'.png'));
assert(!fs.existsSync(path.join(root,'src/js/art-styles.js')));
assert(!fs.existsSync(path.join(root,'data/old-art')));
for(const dir of fs.readdirSync(path.join(root,'old-art/art-styles'))){
 const base=path.join(root,'old-art/art-styles',dir),file=path.join(base,'generation.json');
 if(!fs.existsSync(file))continue;
 for(const asset of JSON.parse(fs.readFileSync(file)).assets)assert.equal(hash(path.join(root,asset.savedPath)),asset.sha256,dir+'/'+asset.name);
}
// Every tracked former default image must survive byte-for-byte in the root archive.
const tracked=require('../old-art/original-default/archive.json').gitBlobs;
for(const [name,expected] of Object.entries(tracked)){
 const bytes=fs.readFileSync(path.join(root,'old-art/original-default',name.slice(5)));
 const blob=crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
 assert.equal(blob,expected,name+' archive changed');
}
console.log('PASS default anime assets, archived set checksums, alpha roles and byte-for-byte former-default archive');
