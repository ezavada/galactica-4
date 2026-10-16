#!/usr/bin/env python3
import importlib.util
from pathlib import Path
import struct
import sys
import tempfile
import unittest
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('tutorial_import',Path(__file__).with_name('import-v3-tutorial.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

class ImportTests(unittest.TestCase):
    def test_rez_ignores_hex_looking_comments_and_decodes_signed_ids(self):
        rez = b"data 'TEXT' (-1, \"name\") { $\"41 0D\" /* $\"FF\" */ $\"42\" };"
        self.assertEqual(m.read_rez(rez),{('TEXT',-1):b'A\rB'})
    def test_duplicate_and_unsupported_payloads_fail(self):
        for rez in [b"data 'TEXT' (1) {$\"41\"}; data 'TEXT' (1) {$\"42\"};",b"data 'TEXT' (1) {anything};",b'no resources']:
            with self.assertRaises(ValueError): m.read_rez(rez)
    def test_mac_roman_and_one_based_string_lists(self):
        resources = {('STR ',1):bytes([1,0x8e]),('STR#',2):b'\x00\x02\x01A\x01B'}
        self.assertEqual(m.resource_string(resources,1,0),'é')
        self.assertEqual(m.resource_string(resources,2,2),'B')
        with self.assertRaises(ValueError): m.resource_string(resources,2,3)
        with self.assertRaises(ValueError): m.pascal(b'\x03A')
    def make_page(self,count=1):
        return struct.pack('>14hi8Bhh',2,120,200,1,0,-1,2,0,5,10,20,30,40,-1,-123,1,0,0,0,1,0,0,0,0,count)
    def test_packed_layout_default_ids_bindings_and_exceptions(self):
        resources={('STR ',1):b'\x05Title',('STR ',2):b'\x02OK',('TEXT',7007):b'A\r\rB'}
        page=m.decode_page(self.make_page()+struct.pack('>ih',-1,101),7,resources)
        self.assertEqual(page['binding'],-123)
        self.assertEqual(page['pictureRect'],[10,20,30,40])
        self.assertEqual(page['text'],'A\n\nB')
        self.assertEqual(page['sound'],7000)
        self.assertEqual(page['position'],dict(top=True,left=False,bottom=True,right=False))
        self.assertEqual(page['exceptions'],[dict(window=-1,page=101)])
        self.assertEqual(page['title'],'Title')
    def test_truncated_negative_and_extra_exception_lengths_fail(self):
        for blob in [b'\x00',self.make_page(),self.make_page(-1),self.make_page(0)+b'extra']:
            with self.assertRaises(ValueError): m.decode_page(blob,7,{})
    def test_missing_recovery_title_is_retained_as_unresolved(self):
        resources={('STR ',2):b'\x02OK',('TEXT',7007):b'Text'}
        page=m.decode_page(self.make_page(0),7,resources)
        self.assertIsNone(page['title'])
        self.assertEqual(page['titleResource'],dict(id=1,index=0))

if __name__ == '__main__': unittest.main()
