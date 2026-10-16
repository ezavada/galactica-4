#!/usr/bin/env python3
"""Exercise build metadata generation in isolated clean, modified and Git-less projects.

The minimal WASM files are packaging fixtures; runtime validation uses the real app.
"""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

PROJECT = Path(__file__).resolve().parents[1]


@unittest.skipUnless(shutil.which('git') and shutil.which('node'), 'Git and Node required')
class BuildInfoTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='galactica-build-info-')
        self.parent = Path(self.temporary.name)
        self.root = self.parent / 'project'
        for name in ('tools', 'web', 'src', 'data'):
            (self.root / name).mkdir(parents=True, exist_ok=True)
        shutil.copyfile(PROJECT / 'tools/build-web.sh', self.root / 'tools/build-web.sh')
        for name in ('LICENSE', 'ASSET_RIGHTS.md', 'main.js', 'web/index.html', 'web/galactica-web.js', 'web/favicon.svg', 'src/module.js', 'data/strings.txt'):
            (self.root / name).write_text('fixture\n')
        self.wasm = self.parent / 'wasm'
        self.wasm.mkdir()
        (self.wasm / 'libpdg.js').write_text('')
        (self.wasm / 'libpdg.wasm').write_bytes(b'\x00asm\x01\x00\x00\x00')
        self.git('init', '--quiet')
        self.git('add', '.')
        self.git('-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', '-c', 'user.name=Build verification', '-c', 'user.email=build-verification@example.invalid', 'commit', '--quiet', '-m', 'Fixture')
        self.revision = self.git('rev-parse', 'HEAD').strip()

    def tearDown(self):
        self.temporary.cleanup()

    def git(self, *arguments):
        return subprocess.check_output(['git', '-C', str(self.root), *arguments], text=True, stderr=subprocess.DEVNULL)

    def build(self, output=None):
        import os
        output = output or self.parent / 'output'
        environment = dict(os.environ, PDG_WASM_DIR=str(self.wasm), GALACTICA_WEB_OUTPUT=str(output))
        subprocess.run(['sh', str(self.root / 'tools/build-web.sh')], env=environment, check=True, capture_output=True)
        script = "const fs=require('fs'),vm=require('vm'),context={window:{}};vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8'),context);process.stdout.write(JSON.stringify(context.window.GALACTICA_BUILD_INFO));"
        return json.loads(subprocess.check_output(['node', '-e', script, str(output / 'galactica-assets.js')], text=True))

    def test_clean_build_matches_application_commit(self):
        self.assertEqual(self.build(), {'revision': self.revision, 'dirty': False})

    def test_modified_build_retains_revision_and_marks_changes(self):
        (self.root / 'main.js').write_text('changed fixture\n')
        self.assertEqual(self.build(), {'revision': self.revision, 'dirty': True})

    def test_generated_output_does_not_change_the_input_snapshot(self):
        self.assertEqual(self.build(self.root / 'out'), {'revision': self.revision, 'dirty': False})
        self.assertTrue(self.git('status', '--porcelain').strip())

    def test_invalid_git_output_does_not_enter_javascript(self):
        import os
        from unittest.mock import patch
        executable = self.parent / 'bin' / 'git'
        executable.parent.mkdir()
        executable.write_text('#!/bin/sh\nprintf \'%s\\n\' \'invalid-revision\'\n')
        executable.chmod(0o755)
        with patch.dict(os.environ, {'PATH': str(executable.parent)+os.pathsep+os.environ['PATH']}):
            self.assertIsNone(self.build())

    def test_source_archive_does_not_invent_revision(self):
        shutil.move(self.root / '.git', self.parent / 'saved-git')
        self.assertIsNone(self.build())


if __name__ == '__main__':
    unittest.main()
