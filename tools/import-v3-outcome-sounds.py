#!/usr/bin/env python3
"""Convert original music-fork outcome cues to PCM WAV; MACE6 needs FFmpeg."""
import argparse
import importlib.util
import json
from pathlib import Path
import struct
import subprocess
import sys
import tempfile
import wave
sys.dont_write_bytecode=True

def module(name,file):
    spec=importlib.util.spec_from_file_location(name,Path(__file__).with_name(file))
    result=importlib.util.module_from_spec(spec);spec.loader.exec_module(result);return result
music=module('music','import-v3-music-resources.py')
sounds=module('sounds','import-v3-sounds.py')


def mace_container(blob):
    # These shipped cues each contain one inline MACE6 buffer command.
    if blob[:20]!=struct.pack('>HHHIHHHI',1,1,5,0x4a0,1,0x8051,0,20):
        raise ValueError('Unsupported compressed sound command list')
    h=music.art.span(blob,20,64)
    pointer,channels,rate,loop_start,loop_end,encoding,base=struct.unpack_from('>5I2B',h)
    packets=struct.unpack_from('>I',h,22)[0]
    if pointer or channels!=1 or encoding!=254 or h[36:56]!=b'\0'*20 or struct.unpack_from('>4H',h,56)!=(4,8,13,8):
        raise ValueError('Unsupported compressed sound header')
    compressed=music.art.span(blob,84,packets)
    if len(blob)!=84+packets:raise ValueError('Incorrect MACE6 packet count')
    def chunk(kind,data):return kind+struct.pack('>I',len(data))+data+(b'\0' if len(data)%2 else b'')
    comm=struct.pack('>hIh',1,packets*6,8)+h[26:36]+b'MAC6'+b'\x0bMACE 6-to-1'
    body=b'AIFC'+chunk(b'FVER',struct.pack('>I',0xa2805140))+chunk(b'COMM',comm)+chunk(b'SSND',b'\0'*8+compressed)
    return b'FORM'+struct.pack('>I',len(body))+body,rate,packets*6


def convert(archive,destination,ffmpeg='ffmpeg'):
    reference,_=music.recover(archive)
    import zipfile
    with zipfile.ZipFile(archive) as source:
        resources=music.art.resources(music.art.resource_fork(source.read(reference['appleDoubleEntry'])))
    destination.mkdir(parents=True,exist_ok=True);entries=[]
    version=subprocess.run([ffmpeg,'-version'],capture_output=True,text=True,check=True).stdout.splitlines()[0]
    with tempfile.TemporaryDirectory() as directory:
        for number in [1004,1005,1006]:
            blob=resources[('snd ',number)]
            if number==1005:
                rate,fixed,pcm=sounds.pcm_sample(blob);width=1;codec='unsigned 8-bit PCM';frames=len(pcm)
            else:
                aifc,fixed,frames=mace_container(blob);rate=round(fixed/65536);width=2;codec='MACE 6:1'
                source=Path(directory)/'source.aifc';decoded=Path(directory)/'decoded.wav';source.write_bytes(aifc)
                subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-nostdin','-i',str(source),'-c:a','pcm_s16le','-y',str(decoded)],check=True,capture_output=True)
                with wave.open(str(decoded)) as wav:
                    if (wav.getnchannels(),wav.getsampwidth(),wav.getnframes())!=(1,width,frames):raise ValueError('Unexpected decoded PCM layout')
                    pcm=wav.readframes(frames)
            target=destination/f'{number}.wav'
            with wave.open(str(target),'wb') as wav:
                wav.setnchannels(1);wav.setsampwidth(width);wav.setframerate(rate);wav.writeframes(pcm)
            entries.append({'id':number,'file':target.name,'codec':codec,'sampleWidth':width,'frames':frames,'rate':rate,'source_fixed_rate':fixed,
                'source_sha256':music.art.digest(blob),'pcm_sha256':music.art.digest(pcm),'wav_sha256':music.art.digest(target.read_bytes())})
    manifest={'archiveSha256':reference['archiveSha256'],'forkSha256':reference['forkSha256'],'decoder':version,'sounds':entries}
    (destination/'outcome-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');return manifest

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('archive',type=Path);p.add_argument('output',type=Path);p.add_argument('--ffmpeg',default='ffmpeg')
    args=p.parse_args();print(json.dumps(convert(args.archive,args.output,args.ffmpeg),indent=2))
