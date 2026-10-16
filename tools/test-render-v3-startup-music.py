#!/usr/bin/env python3
"""Regenerate real source music offline and inspect the rendered PCM."""
import array
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
import wave
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('render',ROOT/'tools/render-v3-startup-music.py')
render=importlib.util.module_from_spec(spec);spec.loader.exec_module(render)

@unittest.skipUnless(sys.platform=='darwin','Requires macOS offline sampler')
class RenderTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.archive=ROOT.parent/'galactica-anno-dominari-3/release/gad-3.0.2-cdrom.zip'
        if not cls.archive.exists():raise unittest.SkipTest('Original release archive unavailable')
        cls.directory=tempfile.TemporaryDirectory(prefix='galactica-music-test-')
        cls.output=Path(cls.directory.name)
        cls.record=render.render(cls.archive,cls.output)

    @classmethod
    def tearDownClass(cls):cls.directory.cleanup()

    def test_source_and_frame_boundary_with_independent_overlap_voices(self):
        self.assertEqual(self.record['samplerLayers'],{'0':2,'1':1})
        self.assertEqual(self.record['frames'],4263515)
        self.assertEqual(self.record['gmNumbers'],{'0':1,'1':45})
        self.assertEqual(self.record['durationTicks'],58007)
        with wave.open(str(self.output/'startup.wav')) as sound:
            self.assertEqual(sound.getnframes(),4263515);self.assertEqual(sound.getnchannels(),2)
            self.assertEqual(sound.getsampwidth(),2);self.assertEqual(sound.getframerate(),44100)
            data=sound.readframes(sound.getnframes())
        pcm=array.array('h',data)
        if sys.byteorder!='little':pcm.byteswap()
        self.assertGreater(max(pcm),10000);self.assertLess(min(pcm),-10000)
        self.assertLess(max(pcm),32767);self.assertGreater(min(pcm),-32768)
        self.assertEqual(render.digest(data),self.record['pcmSha256'])

    def test_identical_render_with_recorded_system_and_bank(self):
        reference=json.loads((ROOT/'data/sounds/startup-manifest.json').read_text())
        for key in ['archiveSha256','movieSha256','midiSha256','notes','controllers']:
            self.assertEqual(self.record[key],reference[key])
        if (self.record['bankSha256'],self.record['system'])!=(reference['bankSha256'],reference['system']):
            self.skipTest('Recorded renderer OS/bank differs; acoustic byte equality is not portable')
        self.assertEqual(self.record['pcmSha256'],reference['pcmSha256'])
        self.assertEqual((self.output/'startup.wav').read_bytes(),(ROOT/'data/sounds/startup.wav').read_bytes())

if __name__=='__main__':unittest.main()
