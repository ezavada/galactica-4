#!/usr/bin/env python3
"""Verify event presentation evidence against source and damaged binary input."""
import importlib.util
import json
from pathlib import Path
import struct
import sys
import unittest
sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('events', ROOT/'tools/import-v3-events.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class EventReferenceTests(unittest.TestCase):
    def setUp(self):
        self.reference = json.loads((ROOT/'docs/reference/v3-events.json').read_text())

    def test_regenerated_source_matches_committed_evidence(self):
        source = ROOT.parent/'galactica-anno-dominari-3'
        if not source.exists():
            self.skipTest('Shipped v3 source checkout unavailable')
        self.assertEqual(module.import_reference(source), self.reference)

    def test_recipient_columns_and_24_byte_record_layout(self):
        # Distinct sentinel values ensure winner/loser/other fields cannot swap.
        row = struct.pack('>11h2B', 1009,1010,1014,500,1,2,3,4002,4001,10,42,1,0)
        event = module.decode_events(b'\x00\x01'+row)[0]
        self.assertEqual(event['recipients']['winner'], {'sound':1009,'stringIndex':1,'window':4002})
        self.assertEqual(event['recipients']['loser'], {'sound':1010,'stringIndex':2,'window':4001})
        self.assertEqual(event['recipients']['other'], {'sound':1014,'stringIndex':3,'window':10})
        self.assertEqual(event['textResource'],42)
        self.assertTrue(event['autoShow'])

    def test_corrupt_count_lengths_flags_and_padding_rejected(self):
        good = struct.pack('>H11h2B',1,*([0]*11),1,0)
        for bad in (b'',good[:-1],good+b'\0',b'\0\2'+good[2:],good[:-2]+b'\2\0',good[:-1]+b'\1'):
            with self.assertRaises(ValueError): module.decode_events(bad)

    def test_complete_45_template_inventory_and_manual_attention_codes(self):
        events=self.reference['events']
        self.assertEqual([e['code'] for e in events],list(range(1,23)))
        indices={r['stringIndex'] for e in events for r in e['recipients'].values()}-{0}
        self.assertEqual(indices,set(range(1,46)))
        self.assertEqual([e['code'] for e in events if not e['autoShow']], [8,9,10,13,15,16,20,21,22])
        self.assertTrue(all(e['stringResource']==500 and e['textResource']==0 for e in events))

    def test_modal_window_recipient_and_artwork_roles(self):
        events=self.reference['events']
        windows=[(e['code'],name,r['window']) for e in events for name,r in e['recipients'].items() if r['window']]
        self.assertEqual(windows,[(7,'winner',10),(7,'other',10),(11,'winner',4002),(12,'winner',4003),(17,'winner',4001),(18,'winner',4000)])
        for n in ('4002','4003'):
            self.assertIn('lofV',self.reference['windows'][n]['objectClasses'])
            self.assertEqual(self.reference['windows'][n]['pictures'],[])
        for n in ('4000','4001'):
            self.assertEqual(self.reference['windows'][n]['pictures'],[{'resource':int(n)}])

if __name__=='__main__': unittest.main()
