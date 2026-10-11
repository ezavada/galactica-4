#!/usr/bin/env python3
"""Recover original music metadata and reconstruct its self-contained movie."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import struct
import sys
import zipfile
sys.dont_write_bytecode = True
spec=importlib.util.spec_from_file_location('art',Path(__file__).with_name('import-v3-art-resources.py'))
art=importlib.util.module_from_spec(spec);spec.loader.exec_module(art)


def atoms(blob):
    rows={};offset=0
    while offset<len(blob):
        size,kind=struct.unpack('>I4s',art.span(blob,offset,8))
        if size<8:raise ValueError('Unsupported atom size')
        payload=art.span(blob,offset+8,size-8)
        if kind in rows:raise ValueError('Duplicate atom')
        rows[kind]=payload;offset+=size
    return rows


def recover(archive):
    with zipfile.ZipFile(archive) as source:
        entries=[n for n in source.namelist() if n.endswith('/._Galactica Music')]
        if len(entries)!=1:raise ValueError('Expected one AppleDouble music entry')
        entry=entries[0];data_entry=entry.replace('__MACOSX/','',1).replace('/._Galactica Music','/Galactica Music')
        apple=source.read(entry);data=source.read(data_entry)
    fork=art.resource_fork(apple);resources=art.resources(fork);moov=resources[('moov',128)]
    media=atoms(atoms(atoms(moov)[b'moov'])[b'trak'])[b'mdia'];media=atoms(media)
    if media[b'hdlr'][8:12]!=b'musi':raise ValueError('Expected music media')
    scale,duration=struct.unpack('>II',art.span(media[b'mdhd'],12,8))
    info=atoms(media[b'minf']);table=atoms(info[b'stbl']);dref=atoms(info[b'dinf'])[b'dref']
    if dref!=struct.pack('>III4sI',0,1,12,b'alis',1):raise ValueError('External media reference')
    description=table[b'stsd']
    if description[:8]!=struct.pack('>II',0,1) or description[12:16]!=b'musi':raise ValueError('Unsupported sample description')
    sample_size,count=struct.unpack('>II',art.span(table[b'stsz'],4,8))
    offsets=table[b'stco'];chunk_count=struct.unpack('>I',art.span(offsets,4,4))[0]
    if count!=chunk_count or len(offsets)!=8+count*4 or not sample_size:raise ValueError('Unsupported sample chunks')
    if table[b'stsc']!=struct.pack('>5I',0,1,1,1,1):raise ValueError('Unsupported sample-to-chunk table')
    chunks=list(struct.unpack('>'+str(count)+'I',offsets[8:]));timing=table[b'stts']
    if len(timing)!=8+count*8 or struct.unpack_from('>I',timing,4)[0]!=count:raise ValueError('Unsupported timing table')
    lengths=[]
    for i in range(count):
        samples,ticks=struct.unpack_from('>II',timing,8+i*8)
        if samples!=1:raise ValueError('Unsupported timing run')
        lengths.append(ticks)
    if sum(lengths)!=duration or scale==0:raise ValueError('Inconsistent media duration')
    if list(atoms(data))!=[b'mdat']:raise ValueError('Expected original media data atom')
    if chunks!=list(range(8,len(data),sample_size)) or len(data)!=8+count*sample_size:raise ValueError('Invalid sample offsets')
    for offset in chunks:art.span(data,offset,sample_size)
    movie=data+moov
    record={'archiveSha256':art.digest(archive.read_bytes()),'appleDoubleEntry':entry,
        'appleDoubleSha256':art.digest(apple),'dataEntry':data_entry,'dataSha256':art.digest(data),
        'forkSha256':art.digest(fork),'movieSha256':art.digest(movie),'movieBytes':len(movie),
        'mediaType':'musi','timeScale':scale,'durationTicks':duration,'sampleBytes':sample_size,
        'chunkOffsets':chunks,'sampleDurationTicks':lengths,
        'resources':[{'type':kind,'id':number,'bytes':len(payload),'sha256':art.digest(payload)}
                     for (kind,number),payload in sorted(resources.items())]}
    return record,movie


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('archive',type=Path)
    parser.add_argument('reference',type=Path);parser.add_argument('--movie',type=Path)
    args=parser.parse_args();record,movie=recover(args.archive)
    args.reference.write_text(json.dumps(record,indent=2)+'\n')
    if args.movie:args.movie.write_bytes(movie)
