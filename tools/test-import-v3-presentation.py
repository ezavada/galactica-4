#!/usr/bin/env python3
"""Validate the imported presentation reference and reject damaged resource input."""
import importlib.util
import json
from pathlib import Path
import unittest
import sys
import struct

sys.dont_write_bytecode = True

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('presentation', ROOT / 'tools/import-v3-presentation.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class PresentationReferenceTests(unittest.TestCase):
    def test_shipped_window_roles_and_attribution(self):
        reference = json.loads((ROOT / 'docs/reference/v3-presentation.json').read_text())
        self.assertEqual(set(reference['variants']), {'en-shareware', 'en-cdrom', 'de-shareware', 'de-cdrom'})
        for variant in reference['variants'].values():
            startup = variant['windows']['startup']
            about = variant['windows']['about']
            self.assertEqual(startup['resource'], 32)
            self.assertEqual(about['resource'], 22)
            self.assertIn('Edmund Zavada\nJames Whitehouse\nClaudio Berni', startup['captions'])
            self.assertIn('Edmund R. Zavada\nJames Whitehouse', about['captions'])
            self.assertIn('^0\n', about['captions'])
            self.assertEqual([p['resource'] for p in startup['pictures']], [131, 134])
            self.assertEqual([p['resource'] for p in about['pictures']], [131, 132, 135, 136])
            self.assertEqual(startup['pictures'][1]['scroll'], {'startTicks':60, 'ticksPerMove':4, 'horizontalPixels':0, 'verticalPixels':1})
            self.assertEqual(about['pictures'][1]['scroll'], {'startTicks':120, 'ticksPerMove':3, 'horizontalPixels':0, 'verticalPixels':1})
            for picture in variant['pictures'].values():
                self.assertEqual(len(picture['sha256']), 64)
                t,l,b,r = picture['frame']
                self.assertGreater(b,t)
                self.assertGreater(r,l)

    def test_menu_labels_keep_the_shipped_command_mapping(self):
        reference = json.loads((ROOT / 'docs/reference/v3-presentation.json').read_text())
        self.assertEqual(reference['format'], 2)
        for name, variant in reference['variants'].items():
            menus = variant['menus']
            self.assertEqual(menus['128']['items'][0]['command'], 1)
            file = menus['129']['items']
            self.assertEqual(file[0]['command'], 2)
            self.assertEqual(file[1]['command'], 3)
            self.assertEqual(file[-1]['command'], 10)
            preferences = [item for item in file if item['command'] == 27]
            self.assertEqual(len(preferences), 1 if name == 'en-cdrom' else 0)
            if preferences:
                self.assertEqual(preferences[0]['label'], 'Prefererences…')
            select = [item for item in menus['130']['items'] if item['command'] == 16]
            self.assertEqual(len(select), 1)
            if name.startswith('en-'):
                self.assertEqual(select[0]['label'], 'Select All')
            sound = [item for item in menus['137']['items'] if item['command'] == 4017]
            self.assertEqual(len(sound), 0 if name == 'en-cdrom' else 1)
            if sound:
                self.assertEqual(sound[0]['label'], 'Sound')

    def test_invalid_menu_lengths_and_command_counts_rejected(self):
        menu = struct.pack('>h', 129)+bytes(12)+b'\x04File\x03New'+bytes(4)+b'\0'
        commands = struct.pack('>Hi', 1, 2)
        def source(m, c):
            return 'data \'MENU\' (129) { $"'+m.hex()+'" }; data \'Mcmd\' (129) { $"'+c.hex()+'" };'
        self.assertEqual(module.decode_menu(source(menu, commands), 129)['items'][0]['command'], 2)
        for m, c in [(menu[:-1], commands), (menu[:18], commands), (menu, commands[:-1]), (menu, struct.pack('>H', 0))]:
            with self.assertRaises(ValueError):
                module.decode_menu(source(m, c), 129)

    def test_comments_cannot_inject_payload(self):
        self.assertEqual(module.resource("data 'PPob' (32) { $\"0002\" /* $\"FFFF\" */ };", 'PPob',32), b'\x00\x02')

    def test_missing_and_duplicate_resources_rejected(self):
        source = "data 'PPob' (32) { $\"0002\" };"
        for damaged in ('', source+source):
            with self.assertRaises(ValueError):
                module.resource(damaged,'PPob',32)

    def test_non_hex_payload_rejected(self):
        with self.assertRaises(ValueError):
            module.resource("data 'PPob' (32) { $\"0002\" unexpected; };", 'PPob',32)

    def test_truncated_objects_and_missing_terminator_rejected(self):
        for damaged in (b'\x00\x02objd\x00\x00\x00\x08abcd', b'\x00\x02', b'\x00\x02oops'):
            with self.assertRaises(ValueError):
                list(module.objects(damaged))


if __name__ == '__main__':
    unittest.main()
