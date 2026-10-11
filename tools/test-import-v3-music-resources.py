#!/usr/bin/env python3
"""Verify music provenance, media ranges and recovery across shipped editions."""
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
import zipfile
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[1]

def module(name,file):
    spec=importlib.util.spec_from_file_location(name,ROOT/'tools'/file)
    result=importlib.util.module_from_spec(spec);spec.loader.exec_module(result);return result
music=module('music','import-v3-music-resources.py')
sounds=module('sounds','import-v3-sounds.py')

class MusicRecoveryTests(unittest.TestCase):
    def setUp(self):
        self.directory=ROOT.parent/'galactica-anno-dominari-3/release'
        self.archive=self.directory/'gad-3.0.2-cdrom.zip'
        if not self.archive.exists():self.skipTest('Original release archive unavailable')
        self.reference=json.loads((ROOT/'docs/reference/v3-music-resources.json').read_text())

    def test_inventory_and_self_contained_movie(self):
        record,movie=music.recover(self.archive)
        self.assertEqual(record,self.reference)
        self.assertEqual(len(movie),7055)
        self.assertEqual(list(music.atoms(movie)),[b'mdat',b'moov'])
        self.assertEqual(record['chunkOffsets'],[8,1032,2056,3080,4104,5128])
        self.assertEqual(record['durationTicks'],58007)
        self.assertEqual(record['timeScale'],600)

    def test_all_six_release_editions_preserve_music_and_cues(self):
        archives=sorted(self.directory.glob('gad-*.zip'));self.assertEqual(len(archives),6)
        for archive in archives:
            record,movie=music.recover(archive)
            for key in ['forkSha256','dataSha256','movieSha256','resources']:
                self.assertEqual(record[key],self.reference[key],archive.name)

    def test_rejects_truncated_media_and_damaged_atoms(self):
        with zipfile.ZipFile(self.archive) as source:
            apple=source.read(self.reference['appleDoubleEntry']);data=source.read(self.reference['dataEntry'])
        with tempfile.TemporaryDirectory() as directory:
            bad=Path(directory)/'damaged.zip'
            with zipfile.ZipFile(bad,'w') as output:
                output.writestr(self.reference['appleDoubleEntry'],apple)
                output.writestr(self.reference['dataEntry'],data[:-1])
            with self.assertRaises(ValueError):music.recover(bad)
        for blob in [b'bad',b'\0'*8,b'\0\0\0\x10moov']:
            with self.assertRaises(ValueError):music.atoms(blob)

    def test_recovered_pcm_cue_and_compressed_header_presence(self):
        with zipfile.ZipFile(self.archive) as source:
            resources=music.art.resources(music.art.resource_fork(source.read(self.reference['appleDoubleEntry'])))
        rate,fixed,frames=sounds.pcm_sample(resources[('snd ',1005)])
        self.assertEqual(rate,11127);self.assertEqual(len(frames),221901)
        for number in [1004,1006]:
            with self.assertRaisesRegex(ValueError,'standard unsigned 8-bit'):sounds.pcm_sample(resources[('snd ',number)])

if __name__=='__main__':unittest.main()
