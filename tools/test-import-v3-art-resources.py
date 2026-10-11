#!/usr/bin/env python3
"""Verify recovered shipped resources and reject damaged archive structures."""
import importlib.util
import json
from pathlib import Path
import struct
import sys
import unittest
sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('art', ROOT/'tools/import-v3-art-resources.py')
art = importlib.util.module_from_spec(spec)
spec.loader.exec_module(art)


class ArtReferenceTests(unittest.TestCase):
    def setUp(self):
        self.reference = json.loads((ROOT/'docs/reference/v3-art-resources.json').read_text())

    def test_release_archive_regeneration(self):
        source = ROOT.parent/'galactica-anno-dominari-3/release/gad-3.0.2-cdrom.zip'
        if not source.exists():
            self.skipTest('Original release archive unavailable')
        self.assertEqual(art.import_reference(source), self.reference)

    def test_appledouble_entry_selection_and_corruption(self):
        # Finder metadata precedes the resource fork; do not treat it as art.
        header = struct.pack('>II16sH',0x00051607,0x00020000,b'\0'*16,2)
        good = header+struct.pack('>IIIIII',9,50,4,2,54,5)+b'info'+b'paint'
        self.assertEqual(art.resource_fork(good),b'paint')
        for bad in (b'',good[:-1],b'\1'+good[1:],good[:24]+b'\0\3'+good[26:],
                    good[:38]+struct.pack('>I',9)+good[42:]):
            with self.assertRaises(ValueError): art.resource_fork(bad)

    def test_layer_colors_modes_and_record_bounds(self):
        row = struct.pack('>hhhI9HI',2202,8,33,0,1,2,3,4,5,6,7,8,9,0)
        good = b'\0\1'+row
        self.assertEqual(art.layers(good),[{'picture':2202,'depth':8,'mode':33,'flags':0,
            'foreground':[1,2,3],'background':[4,5,6],'operation':[7,8,9]}])
        for bad in (b'',good[:-1],good+b'\0',good[:-1]+b'\1'):
            with self.assertRaises(ValueError): art.layers(bad)

    def test_resource_map_payload_offsets(self):
        payload = b'art'
        data = struct.pack('>I',len(payload))+payload
        header = struct.pack('>IIII',16,16+len(data),len(data),50)
        resource_map = header+b'\0'*8+struct.pack('>HH',28,50)
        resource_map += struct.pack('>H4sHH',0,b'PICT',0,10)
        resource_map += struct.pack('>hhB3sI',4000,-1,0,b'\0'*3,0)
        good = header+data+resource_map
        self.assertEqual(art.resources(good),{('PICT',4000):payload})
        for bad in (b'',good[:-1],header+struct.pack('>I',99)+good[20:]):
            with self.assertRaises(ValueError): art.resources(bad)

    def test_shipped_class_layer_order_and_fallback(self):
        layers = self.reference['layers']
        self.assertEqual(len(layers),146)
        for n in range(300,315):
            rows=layers[str(n)]['layers']
            self.assertEqual([(r['picture'],r['mode']) for r in rows],
                             [(2000,0),(3000+min(n-300,12),36),(2100,36)])
        for n in range(400,411):
            self.assertEqual([(r['picture'],r['mode']) for r in layers[str(n)]['layers']],
                             [(2001,0),(2202+n-400,33),(2101,36)])
        for n in ('2000','2001','2100','2101','2202','3012'):
            self.assertEqual((self.reference['pictures'][n]['width'],self.reference['pictures'][n]['height']),(408,240))
        for n in ('4000','4001'):
            self.assertEqual((self.reference['pictures'][n]['width'],self.reference['pictures'][n]['height']),(500,432))
        # Explosion PICT lives in the game resources, not this art fork.
        self.assertEqual(self.reference['pictures']['1000'],{'missing':True})


if __name__ == '__main__': unittest.main()
