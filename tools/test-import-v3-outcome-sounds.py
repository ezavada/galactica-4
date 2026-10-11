#!/usr/bin/env python3
"""Verify source PCM and reproducible MACE6 decoding of all outcome cues."""
import importlib.util
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
import wave
import zipfile
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('converter',ROOT/'tools/import-v3-outcome-sounds.py')
converter=importlib.util.module_from_spec(spec);spec.loader.exec_module(converter)

class OutcomeSoundTests(unittest.TestCase):
    def setUp(self):
        self.archive=ROOT.parent/'galactica-anno-dominari-3/release/gad-3.0.2-cdrom.zip'
        if not self.archive.exists():self.skipTest('Original release archive unavailable')
        reference,_=converter.music.recover(self.archive)
        with zipfile.ZipFile(self.archive) as source:
            self.resources=converter.music.art.resources(converter.music.art.resource_fork(source.read(reference['appleDoubleEntry'])))

    def test_standard_victory_pcm_is_byte_identical(self):
        rate,fixed,pcm=converter.sounds.pcm_sample(self.resources[('snd ',1005)])
        with wave.open(str(ROOT/'data/sounds/1005.wav')) as wav:
            self.assertEqual((wav.getframerate(),wav.getsampwidth(),wav.getnframes()),(rate,1,len(pcm)))
            self.assertEqual(wav.readframes(wav.getnframes()),pcm)

    def test_compressed_source_packets_and_rejection(self):
        for number,frames in [(1004,648192),(1006,434172)]:
            payload=self.resources[('snd ',number)];container,rate,count=converter.mace_container(payload)
            self.assertEqual(count,frames);self.assertEqual(container[-len(payload[84:]):],payload[84:])
            for bad in [b'',payload[:-1],payload+b'\0']:
                with self.assertRaises(ValueError):converter.mace_container(bad)
            bad=bytearray(payload);bad[76:78]=b'\0\0'
            with self.assertRaises(ValueError):converter.mace_container(bad)

    def test_all_three_wavs_regenerate_identically(self):
        ffmpeg=os.environ.get('GALACTICA_FFMPEG') or shutil.which('ffmpeg')
        if not ffmpeg:self.skipTest('FFmpeg MACE6 decoder required')
        with tempfile.TemporaryDirectory() as directory:
            manifest=converter.convert(self.archive,Path(directory),ffmpeg)
            expected=json.loads((ROOT/'data/sounds/outcome-manifest.json').read_text())
            self.assertEqual(manifest['sounds'],expected['sounds'])
            for row in manifest['sounds']:
                self.assertEqual((Path(directory)/row['file']).read_bytes(),(ROOT/'data/sounds'/row['file']).read_bytes())

if __name__=='__main__':unittest.main()
