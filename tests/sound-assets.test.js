const test=require('./test-framework.js'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.join(__dirname,'../data/sounds'),manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
module.exports=()=>test.describe('Converted v3 sound samples',()=>{
 test.it('preserves the identical shipped tutorial cue and its PCM bytes',()=>{
  const directory=path.join(__dirname,'../data/tutorial/sounds'),m=JSON.parse(fs.readFileSync(path.join(directory,'manifest.json'),'utf8'));
  const source=JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/reference/v3-tutorial.json'),'utf8'));
  test.assertEqual(m.sounds.length,1);test.assertEqual(m.sounds[0].id,7000);const sample=m.sounds[0],b=fs.readFileSync(path.join(directory,sample.file));
  for(const lang of ['en','de'])test.assertEqual(sample.source_sha256,source.languages[lang].sounds[0].sha256);
  test.assertEqual(m.source_sha256,source.languages.en.sourceSha256);
  test.assertEqual(b.toString('ascii',0,4),'RIFF');test.assertEqual(b.toString('ascii',8,12),'WAVE');test.assertEqual(b.readUInt16LE(20),1);test.assertEqual(b.readUInt16LE(22),1);test.assertEqual(b.readUInt16LE(34),8);test.assertEqual(b.readUInt32LE(24),10000);test.assertEqual(b.readUInt32LE(40),3824);test.assertEqual(b.length,3868);
  test.assertEqual(crypto.createHash('sha256').update(b).digest('hex'),sample.wav_sha256);test.assertEqual(crypto.createHash('sha256').update(b.subarray(44)).digest('hex'),sample.pcm_sha256);
 });
 test.it('loads the tutorial WAV through public PDG resources with a playable duration',()=>{
  const ref=pdg.res.openResourceFile(path.join(__dirname,'../data/tutorial/sounds'));
  try {const sample=pdg.res.getSound('7000.wav');test.assertNotNull(sample);test.assertFalse(sample===false);test.assertEqual(typeof sample.start,'function');sample.setLooping(false);sample.stop();}
  finally{pdg.res.closeResourceFile(ref);}
 });

 test.it('preserves the shipped sample inventory, PCM bytes and portable WAV header',()=>{
  test.assertEqual(manifest.sounds.map(s=>s.id).join(','),'1000,1001,1002,1003,1007,1008,1009,1010,1011,1012,1013,1014');
  for(const sound of manifest.sounds) {
   const b=fs.readFileSync(path.join(root,sound.file));test.assertEqual(b.toString('ascii',0,4),'RIFF');test.assertEqual(b.toString('ascii',8,12),'WAVE');test.assertEqual(b.readUInt16LE(20),1);test.assertEqual(b.readUInt16LE(22),1);test.assertEqual(b.readUInt16LE(34),8);test.assertEqual(b.readUInt32LE(24),sound.rate);test.assertEqual(b.readUInt32LE(40),sound.frames);test.assertEqual(b.length,44+sound.frames);test.assertEqual(crypto.createHash('sha256').update(b).digest('hex'),sound.wav_sha256);test.assertEqual(crypto.createHash('sha256').update(b.subarray(44)).digest('hex'),sound.pcm_sha256);
   test.assertTrue(Math.abs(sound.rate/(sound.source_fixed_rate/65536)-1)<.00003);
  }
 });
 test.it('loads every converted sound through the public PDG resource manager',()=>{
  const ref=pdg.res.openResourceFile(root);try {for(const entry of manifest.sounds){const sound=pdg.res.getSound(entry.file);test.assertNotNull(sound);test.assertFalse(sound===false);test.assertEqual(typeof sound.start,'function');sound.setLooping(false);sound.stop();}}
  finally{pdg.res.closeResourceFile(ref);}
 });
});
