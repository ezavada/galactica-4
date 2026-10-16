#!/usr/bin/env python3
"""Render original startup music offline using macOS's General MIDI sound bank."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import platform
import subprocess
import sys
import tempfile
import wave
sys.dont_write_bytecode=True
spec=importlib.util.spec_from_file_location('export',Path(__file__).with_name('export-v3-startup-midi.py'))
export=importlib.util.module_from_spec(spec);spec.loader.exec_module(export)
BANK=Path('/System/Library/Components/CoreAudio.component/Contents/Resources/gs_instruments.dls')


def digest(blob):return hashlib.sha256(blob).hexdigest()


def render(archive,output,bank=BANK):
    if platform.system()!='Darwin':raise ValueError('This offline renderer requires macOS')
    record,movie=export.music.recover(archive);parts,events=export.composition(record,movie)
    output.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='galactica-startup-render-') as directory:
        directory=Path(directory);source=directory/'events.json';caf=directory/'render.caf';wav=directory/'render.wav'
        source.write_text(json.dumps({'timeScale':record['timeScale'],'durationTicks':record['durationTicks'],'parts':parts,'events':events}))
        rendered=subprocess.run(['swift',str(Path(__file__).with_suffix('.swift')),str(source),str(caf),str(bank)],check=True,capture_output=True,text=True)
        report=json.loads(rendered.stdout)
        subprocess.run(['afconvert','-f','WAVE','-d','LEI16',str(caf),str(wav)],check=True)
        with wave.open(str(wav)) as decoded:
            channels,width,rate,frames=decoded.getnchannels(),decoded.getsampwidth(),decoded.getframerate(),decoded.getnframes()
            pcm=decoded.readframes(frames)
        expected=(record['durationTicks']*44100+record['timeScale']//2)//record['timeScale']
        if report['frames']!=expected or report['layers']!={'0':2,'1':1}:raise ValueError('Incorrect render voices/timing')
        if (channels,width,rate,frames)!=(2,2,44100,expected) or not any(pcm):raise ValueError('Invalid rendered PCM')
        target=output/'startup.wav'
        with wave.open(str(target),'wb') as final:
            final.setnchannels(channels);final.setsampwidth(width);final.setframerate(rate);final.writeframes(pcm)
    manifest={'archiveSha256':record['archiveSha256'],'movieSha256':record['movieSha256'],
        'midiSha256':digest(export.midi(record,parts,events)),'timeScale':record['timeScale'],
        'durationTicks':record['durationTicks'],'notes':sum(e[0]=='note' for e in events),
        'controllers':sum(e[0]=='control' for e in events),'samplerLayers':report['layers'],'gmNumbers':{str(part):request['gmNumber'] for part,request in parts.items()},
        'renderer':'AVAudioUnitSampler offline, event boundaries rounded to nearest frame',
        'system':platform.mac_ver()[0],'bankFile':bank.name,'bankSha256':digest(bank.read_bytes()),
        'file':'startup.wav','rate':rate,'frames':frames,'channels':channels,'sampleWidth':width,
        'pcmSha256':digest(pcm),'wavSha256':digest(target.read_bytes()),
        'fidelity':'Original notes/controllers and loop duration; modern GM synthesis, original QuickTime acoustic equivalence not verified'}
    (output/'startup-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    return manifest


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('archive',type=Path);parser.add_argument('output',type=Path)
    parser.add_argument('--bank',type=Path,default=BANK);args=parser.parse_args()
    print(json.dumps(render(args.archive,args.output,args.bank),indent=2))
