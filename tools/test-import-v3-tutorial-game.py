#!/usr/bin/env python3
import importlib.util
from pathlib import Path
import struct
import sys
import unittest
sys.dont_write_bytecode=True
spec=importlib.util.spec_from_file_location('tutorial_game_import',Path(__file__).with_name('import-v3-tutorial-game.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
source=None
if len(sys.argv)>1 and not sys.argv[1].startswith('-'):
    source=Path(sys.argv.pop(1)).read_bytes()
class ReaderTests(unittest.TestCase):
    def test_waypoint_boundaries_and_references(self):
        r=m.Reader(b'\x40\x42'+struct.pack('>5i',9,10,20,30,77))
        self.assertEqual(r.waypoint(),{'type':64})
        self.assertEqual(r.waypoint(),dict(type=66,distance=9,x=10,y=20,z=30,id=77))
        self.assertEqual(r.offset,22)
    def test_bounds_and_invalid_handles_or_waypoints(self):
        for fn in [lambda:m.Reader(b'').read('I'),lambda:m.Reader(b'abc').take(4),lambda:m.Reader(b'').take(-1),lambda:m.Reader(struct.pack('>i',-2)).handle(),lambda:m.Reader(b'\x01').waypoint()]:
            with self.assertRaises(ValueError):fn()
    def test_nan_and_truncated_strings_fail(self):
        with self.assertRaises(ValueError):m.Reader(struct.pack('>f',float('nan'))).read('f')
        with self.assertRaises(ValueError):m.text(b'\x09A')
        self.assertEqual(m.text(bytes([1,0x8e])),'é')
    def test_unknown_signature_or_version_fail(self):
        for data in [b'',b'nope'+struct.pack('>I',0x0102b00a),b'game'+struct.pack('>I',0)]:
            with self.assertRaises(ValueError):m.decode(data)
    @unittest.skipUnless(source,'Provide the shipped tutorial plugin to test complete decoding')
    def test_full_fixture_and_truncated_records(self):
        result=m.decode(source)
        self.assertEqual(len(result['stars']),42)
        self.assertTrue(result['config']['fastGame'])
        self.assertEqual(next(s for s in result['stars'] if s['id']==9)['name'],'S-20')
        for size in [80,391,466,726,842,3000,len(source)-1]:
            with self.assertRaises(ValueError):m.decode(source[:size])
    @unittest.skipUnless(source,'Provide the shipped tutorial plugin to test identity validation')
    def test_duplicate_ids_wrong_homeworld_and_trailing_bytes_fail(self):
        result=m.decode(source);first=result['stars'][0]['recordOffset'];second=result['stars'][1]['recordOffset']
        changed=bytearray(source);changed[second+4:second+8]=changed[first+4:first+8]
        with self.assertRaises(ValueError):m.decode(changed)
        changed=bytearray(source);struct.pack_into('>i',changed,466+24,999)
        with self.assertRaises(ValueError):m.decode(changed)
        with self.assertRaises(ValueError):m.decode(source+b'\x00')
if __name__=='__main__':unittest.main()
