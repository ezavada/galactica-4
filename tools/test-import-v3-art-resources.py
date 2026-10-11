#!/usr/bin/env python3
"""Verify recovered shipped resources and reject damaged archive structures."""
import importlib.util
import json
from pathlib import Path
import struct
import shutil
import subprocess
import tempfile
import zipfile
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

    def test_decodable_shipped_blueprint_pixels_match_packaged_images(self):
        archive = ROOT.parent/'galactica-anno-dominari-3/release/gad-3.0.2-cdrom.zip'
        magick = shutil.which('magick')
        if not archive.exists() or not magick:
            self.skipTest('Original release archive and ImageMagick required')
        with zipfile.ZipFile(archive) as source:
            inventory = art.resources(art.resource_fork(source.read(self.reference['appleDoubleEntry'])))
        with tempfile.TemporaryDirectory(prefix='galactica-blueprints-') as directory:
            # PICT2208 fails the available decoder; see EVENT_REPORTS.md.
            for number in [*range(2202,2208),*range(2209,2213)]:
                pict = Path(directory)/f'{number}.pict'
                png = Path(directory)/f'{number}.png'
                pict.write_bytes(b'\0'*512+inventory[('PICT',number)])
                subprocess.run([magick,str(pict),str(png)],check=True,capture_output=True)
                packaged = ROOT/'data/tech'/f'blue-{number-2200:02d}.png'
                result = subprocess.run([magick,'compare','-metric','AE',str(png),str(packaged),'null:'],capture_output=True,text=True)
                self.assertEqual(result.returncode,0,f'PICT{number}: {result.stderr}')
                self.assertEqual(result.stderr.strip(),'0 (0)')

    def test_runtime_lookup_regeneration_includes_application_fallback(self):
        source = ROOT.parent/'galactica-anno-dominari-3'
        if not source.exists():
            self.skipTest('Original source unavailable')
        spec=importlib.util.spec_from_file_location('runtime',ROOT/'tools/make-v3-layer-runtime.py')
        runtime=importlib.util.module_from_spec(spec);spec.loader.exec_module(runtime)
        main=(source/'Resources/gal-mainrsrc.r').read_bytes().decode('mac_roman')
        expected=runtime.runtime(self.reference,main)
        self.assertEqual((ROOT/'src/js/shipped-art-layers.js').read_text(),expected)
        self.assertIn('"0":[{"picture":100',expected)

    def test_fallback_provenance_matches_recovered_picture_payloads(self):
        archive=ROOT.parent/'galactica-anno-dominari-3/release/gad-3.0.2-cdrom.zip'
        if not archive.exists():self.skipTest('Original release archive unavailable')
        with zipfile.ZipFile(archive) as source:
            inventory=art.resources(art.resource_fork(source.read(self.reference['appleDoubleEntry'])))
        nonmodule=(archive.parents[1]/'Resources/gal-non-module.r').read_bytes().decode('mac_roman')
        spec=importlib.util.spec_from_file_location('presentation',ROOT/'tools/import-v3-presentation.py')
        presentation=importlib.util.module_from_spec(spec);spec.loader.exec_module(presentation)
        inventory[('PICT',100)]=presentation.resource(nonmodule,'PICT',100)
        provenance=json.loads((ROOT/'data/events/layers/provenance.json').read_text())
        self.assertEqual(provenance['archiveSha256'],self.reference['archiveSha256'])
        for number,row in provenance['pictures'].items():
            self.assertEqual(row['pictSha256'],art.digest(inventory[('PICT',int(number))]))

    def test_shipped_ship_class_limits_and_basic_hull_order(self):
        root=ROOT.parent/'galactica-anno-dominari-3/Resources'
        if not root.exists():self.skipTest('Original source unavailable')
        spec=importlib.util.spec_from_file_location('presentation',ROOT/'tools/import-v3-presentation.py')
        presentation=importlib.util.module_from_spec(spec);spec.loader.exec_module(presentation)
        for name in ('gal-en-shareware.r','gal-de-shareware.r','gal-en-cdrom.r','gal-de-cdrom.r'):
            blob=presentation.resource((root/name).read_bytes().decode('mac_roman'),'STR#',401)
            self.assertEqual(struct.unpack_from('>H',blob)[0],23)
            cursor=2;names=[]
            for _ in range(23):
                size=blob[cursor];cursor+=1;names.append(blob[cursor:cursor+size].decode('mac_roman'));cursor+=size
            self.assertEqual(cursor,len(blob))
            strings=ROOT/'data'/('strings-de.txt' if '-de-' in name else 'strings.txt')
            current=next(line.split('\t',1)[1].split('|') for line in strings.read_text().splitlines() if line.startswith('800\t'))
            self.assertEqual(current,names[3:])

        self.assertEqual([self.reference['layers'][str(n)]['layers'][1]['picture'] for n in range(300,304)],
                         [3000,3001,3002,3003])
        for n in (313,314):self.assertEqual(self.reference['layers'][str(n)]['layers'][1]['picture'],3012)

    def test_shipped_outcome_image_pixels_and_provenance(self):
        archive=ROOT.parent/'galactica-anno-dominari-3/release/gad-3.0.2-cdrom.zip'
        magick=shutil.which('magick')
        if not archive.exists() or not magick:self.skipTest('Original archive and ImageMagick required')
        with zipfile.ZipFile(archive) as source:
            inventory=art.resources(art.resource_fork(source.read(self.reference['appleDoubleEntry'])))
        provenance=json.loads((ROOT/'data/events/outcome-art.json').read_text())
        with tempfile.TemporaryDirectory() as directory:
            for name,number in [('victory',4000),('defeat',4001)]:
                payload=inventory[('PICT',number)];row=provenance[name]
                self.assertEqual(row['pictSha256'],art.digest(payload))
                self.assertEqual(row['archiveSha256'],self.reference['archiveSha256'])
                source=Path(directory)/(name+('.tiff' if number==4000 else '.pict'))
                data=art.outcome_tiff(payload) if number==4000 else b'\0'*512+payload
                if number==4000:self.assertEqual(row['embeddedTiffSha256'],art.digest(data))
                source.write_bytes(data);png=Path(directory)/(name+'.png')
                subprocess.run([magick,str(source),str(png)],check=True,capture_output=True)
                packaged=ROOT/'data/events'/(name+'.png')
                self.assertEqual(row['sha256'],art.digest(packaged.read_bytes()))
                result=subprocess.run([magick,'compare','-metric','AE',str(png),str(packaged),'null:'],capture_output=True,text=True)
                self.assertEqual(result.returncode,0,result.stderr)
                self.assertEqual(result.stderr.strip(),'0 (0)')

    def test_outcome_tiff_rejects_corrupt_and_unsupported_records(self):
        archive=ROOT.parent/'galactica-anno-dominari-3/release/gad-3.0.2-cdrom.zip'
        if not archive.exists():self.skipTest('Original archive required')
        with zipfile.ZipFile(archive) as source:
            payload=art.resources(art.resource_fork(source.read(self.reference['appleDoubleEntry'])))[('PICT',4000)]
        self.assertEqual(art.outcome_tiff(payload)[:4],b'MM\0*')
        for bad in [b'',payload[:100],payload[:648000]]:
            with self.assertRaises(ValueError):art.outcome_tiff(bad)
        for offset,value in [(72,b'\0\0'),(80,b'\0'*4),(116,b'\0\0\0\1'),
                             (142,b'\0'*4),(160,b'jpeg'),(200,b'\xff'*4),(258,b'BAD!')]:
            bad=bytearray(payload);bad[offset:offset+len(value)]=value
            with self.assertRaises(ValueError):art.outcome_tiff(bad)

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
