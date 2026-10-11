#!/usr/bin/env python3
"""Check source events and independently read back the exported MIDI timeline."""
import collections
import importlib.util
from pathlib import Path
import struct
import sys
import unittest
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('export',ROOT/'tools/export-v3-startup-midi.py')
export=importlib.util.module_from_spec(spec);spec.loader.exec_module(export)


def read_midi(blob):
    if blob[:4]!=b'MThd' or struct.unpack_from('>IHHH',blob,4)!=(6,0,1,600):raise ValueError('Invalid MIDI header')
    if blob[14:18]!=b'MTrk' or struct.unpack_from('>I',blob,18)[0]!=len(blob)-22:raise ValueError('Invalid MIDI track')
    i=22;time=0;rows=[]
    while i<len(blob):
        delta=0
        while True:
            byte=blob[i];i+=1;delta=(delta<<7)|(byte&127)
            if byte<128:break
        time+=delta;status=blob[i];i+=1
        if status==255:
            kind,size=blob[i:i+2];i+=2;rows.append((time,status,kind,blob[i:i+size]));i+=size
        else:
            size=1 if status&240==192 else 2
            rows.append((time,status,*blob[i:i+size]));i+=size
    return rows


class StartupMidiTests(unittest.TestCase):
    def setUp(self):
        self.archives=sorted((ROOT.parent/'galactica-anno-dominari-3/release').glob('gad-*.zip'))
        if not self.archives:self.skipTest('Original release archives unavailable')
        self.record,self.movie=export.music.recover(self.archives[-1])
        self.parts,self.events=export.composition(self.record,self.movie)

    def test_original_notes_instruments_and_duration(self):
        self.assertEqual({part:p['gmNumber'] for part,p in self.parts.items()},{0:1,1:45})
        self.assertEqual(collections.Counter(e[0] for e in self.events),{'note':967,'control':15})
        self.assertEqual(self.record['durationTicks'],58007)
        self.assertEqual(self.record['timeScale'],600)
        self.assertEqual(min(e[3] for e in self.events if e[0]=='note'),26)
        self.assertEqual({e[3] for e in self.events if e[0]=='control'},{7,64})

    def test_midi_round_trip_preserves_all_note_and_control_events(self):
        rows=read_midi(export.midi(self.record,self.parts,self.events));expected=[]
        for event in self.events:
            kind,time,part,*data=event
            if kind=='note':
                pitch,velocity,duration=data
                expected.extend([(time,144|part,pitch,velocity),(time+duration,128|part,pitch,0)])
            else:expected.append((time,176|part,*data))
        actual=[row for row in rows if row[1]&240 in (128,144,176)]
        self.assertEqual(collections.Counter(actual),collections.Counter(expected))
        self.assertEqual([row for row in rows if row[1]&240==192],[(0,192,0),(0,193,44)])
        self.assertEqual(rows[0],(0,255,81,b'\x0f\x42\x40'))
        # The final source notes ring beyond the movie's loop boundary.
        self.assertEqual(rows[-1],(58721,255,47,b''))

    def test_all_six_original_editions_export_identical_compositions(self):
        self.assertEqual(len(self.archives),6)
        reference=export.midi(self.record,self.parts,self.events)
        for archive in self.archives:
            record,movie=export.music.recover(archive);parts,events=export.composition(record,movie)
            self.assertEqual(export.midi(record,parts,events),reference,archive.name)

    def test_rejects_unknown_events_malformed_notes_and_timing(self):
        offset=self.record['chunkOffsets'][0]
        for value in [0xa0000000,0x42070100,0x02000001,0x60000000,0x900000ff]:
            damaged=bytearray(self.movie);struct.pack_into('>I',damaged,offset,value)
            with self.assertRaises(ValueError):export.composition(self.record,bytes(damaged))
        record=dict(self.record);record['sampleDurationTicks']=list(record['sampleDurationTicks']);record['sampleDurationTicks'][0]+=1
        with self.assertRaisesRegex(ValueError,'timing mismatch'):export.composition(record,self.movie)

    def test_variable_length_boundaries(self):
        for value,result in [(0,b'\0'),(127,b'\x7f'),(128,b'\x81\0'),(16383,b'\xff\x7f'),(16384,b'\x81\x80\0')]:
            self.assertEqual(export.variable_length(value),result)
        for value in [-1,0x10000000]:
            with self.assertRaises(ValueError):export.variable_length(value)

if __name__=='__main__':unittest.main()
