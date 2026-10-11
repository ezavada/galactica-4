#!/usr/bin/env python3
"""Export the shipped QuickTime startup composition without changing its events.

Bit fields and NoteRequest layout: Apple's QuickTimeMusic.h (QuickTime 7.6.6).
Music sample durations use the movie's media time scale, verified per chunk.
Only the event types actually present in this asset are accepted.
"""
import argparse
import importlib.util
from pathlib import Path
import struct
import sys
sys.dont_write_bytecode=True
spec=importlib.util.spec_from_file_location('music',Path(__file__).with_name('import-v3-music-resources.py'))
music=importlib.util.module_from_spec(spec);spec.loader.exec_module(music)


def words(blob):
    if len(blob)%4:raise ValueError('Unaligned music events')
    return struct.unpack('>'+str(len(blob)//4)+'I',blob)


def composition(record,movie):
    media=music.atoms(music.atoms(music.atoms(music.atoms(movie)[b'moov'])[b'trak'])[b'mdia'])
    description=music.atoms(music.atoms(media[b'minf'])[b'stbl'])[b'stsd']
    header=words(description[28:]);parts={};i=0
    while i<len(header):
        head=header[i]
        if head==0x60000000 and i==len(header)-1:break
        length=head&65535;part=(head>>16)&4095
        if head>>28!=15 or length!=23 or i+length>len(header):raise ValueError('Unsupported NoteRequest')
        tail=header[i+length-1]
        if tail!=0xc0010000|length:raise ValueError('Invalid NoteRequest tail')
        if part in parts or part>15 or part==9:raise ValueError('Unsupported MIDI part allocation')
        payload=struct.pack('>21I',*header[i+1:i+length-1])
        flags,channel,polyphony,typical=struct.unpack_from('>BBHI',payload)
        instrument,gm=struct.unpack_from('>II',payload,76)
        if flags or channel or not 1<=gm<=128:raise ValueError('Unsupported instrument request')
        parts[part]={'gmNumber':gm,'instrumentNumber':instrument,'polyphony':polyphony,'typicalPolyphony':typical}
        i+=length
    if i!=len(header)-1 or not parts:raise ValueError('Missing header end marker')
    events=[];absolute=0
    for offset,duration in zip(record['chunkOffsets'],record['sampleDurationTicks']):
        sample=words(movie[offset:offset+record['sampleBytes']]);i=0;clock=0
        while i<len(sample):
            value=sample[i];kind=value>>29 if value>>29<4 else value>>28
            if kind==0:
                if value&0x1f000000:raise ValueError('Unsupported rest flags')
                clock+=value&0xffffff
            elif kind in (1,2):
                part=(value>>24)&31
                if part not in parts:raise ValueError('Unknown note/controller part')
                if kind==1:
                    events.append(('note',absolute+clock,part,((value>>18)&63)+32,(value>>11)&127,value&2047))
                else:
                    controller=(value>>16)&255;fixed=value&65535
                    if controller not in (7,64) or fixed&255 or fixed>32512:raise ValueError('Unsupported controller value')
                    events.append(('control',absolute+clock,part,controller,fixed>>8))
            elif kind==9:
                if i+1>=len(sample):raise ValueError('Truncated extended note')
                second=sample[i+1];part=(value>>16)&4095;pitch=value&65535
                if second>>30!=2 or second&0x20000000 or part not in parts or pitch>127:raise ValueError('Unsupported extended note')
                events.append(('note',absolute+clock,part,pitch,(second>>22)&127,second&0x3fffff));i+=1
            elif kind==3:
                if value!=0x60000000 or i!=len(sample)-1:raise ValueError('Unsupported sample marker')
            else:raise ValueError('Unsupported music event')
            i+=1
        if sample[-1]!=0x60000000 or clock!=duration:raise ValueError('Sample timing mismatch')
        absolute+=duration
    if absolute!=record['durationTicks']:raise ValueError('Composition timing mismatch')
    return parts,events


def variable_length(value):
    if not 0<=value<=0xfffffff:raise ValueError('MIDI delta out of range')
    result=bytearray([value&127]);value>>=7
    while value:result.insert(0,128|(value&127));value>>=7
    return bytes(result)


def midi(record,parts,events):
    # One beat per second: PPQN is the movie media scale, so ticks are exact.
    scale=record['timeScale']
    if not 1<=scale<=32767:raise ValueError('Unsupported MIDI time scale')
    timeline=[(0,0,b'\xff\x51\x03\x0f\x42\x40')]
    for part,request in sorted(parts.items()):timeline.append((0,1,bytes([0xc0|part,request['gmNumber']-1])))
    for event in events:
        kind,time,part,*data=event
        if kind=='note':
            pitch,velocity,duration=data
            if not velocity or not duration:raise ValueError('Unsupported zero-length/silent note')
            timeline.extend([(time,3,bytes([0x90|part,pitch,velocity])),(time+duration,2,bytes([0x80|part,pitch,0]))])
        elif kind=='control':timeline.append((time,1,bytes([0xb0|part,*data])))
        else:raise ValueError('Unsupported decoded event')
    end=max(record['durationTicks'],max(row[0] for row in timeline))
    timeline.append((end,4,b'\xff\x2f\x00'));timeline.sort(key=lambda row:row[:2])
    track=bytearray();previous=0
    for time,_,message in timeline:track.extend(variable_length(time-previous)+message);previous=time
    return b'MThd'+struct.pack('>IHHH',6,0,1,scale)+b'MTrk'+struct.pack('>I',len(track))+track


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('archive',type=Path);parser.add_argument('output',type=Path)
    args=parser.parse_args();record,movie=music.recover(args.archive);parts,events=composition(record,movie)
    args.output.write_bytes(midi(record,parts,events))
    print('Exported',len(events),'events;',len(parts),'parts;',record['durationTicks'],'ticks at',record['timeScale'],'Hz')
