#!/usr/bin/env python3
"""Decode shipped Evnt128 recipient presentation rules for the parity audit."""
import argparse
import importlib.util
import json
from pathlib import Path
import struct
import sys

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('presentation', Path(__file__).with_name('import-v3-presentation.py'))
presentation = importlib.util.module_from_spec(spec)
spec.loader.exec_module(presentation)


def decode_events(blob):
    if len(blob) < 2:
        raise ValueError('Missing event count')
    count = struct.unpack_from('>H', blob)[0]
    if len(blob) != 2 + 24 * count:
        raise ValueError('Invalid event count or record length')
    events = []
    for code in range(1, count + 1):
        row = struct.unpack_from('>11h2B', blob, 2 + (code - 1) * 24)
        if row[11] not in (0, 1) or row[12] != 0:
            raise ValueError('Invalid autoShow flag or padding')
        events.append({'code': code, 'autoShow': bool(row[11]), 'stringResource': row[3],
                       'textResource': row[10], 'recipients': {
                           name: {'sound': row[i], 'stringIndex': row[4+i], 'window': row[7+i]}
                           for i, name in enumerate(('winner', 'loser', 'other'))}})
    return events


def decode_strings(blob):
    """Decode a complete MacRoman STR# payload; reject truncated/trailing data."""
    if len(blob) < 2:
        raise ValueError('Missing string count')
    count = struct.unpack_from('>H', blob)[0]
    entries, offset = [], 2
    for index in range(1, count + 1):
        if offset >= len(blob):
            raise ValueError('Missing Pascal string length')
        size = blob[offset]
        offset += 1
        if offset + size > len(blob):
            raise ValueError('Truncated Pascal string')
        entries.append({'index': index, 'text': blob[offset:offset+size].decode('mac_roman')})
        offset += size
    if offset != len(blob):
        raise ValueError('Trailing string resource data')
    return entries


def import_reference(root):
    relative = 'Resources/gal-mainrsrc.r'
    source = (root / relative).read_bytes().decode('mac_roman')
    blob = presentation.resource(source, 'Evnt', 128)
    events = decode_events(blob)
    window_ids = sorted({r['window'] for e in events for r in e['recipients'].values() if r['window']})
    windows = {}
    for number in window_ids:
        path = 'Resources/gal-en-shareware.r' if number == 10 else 'Resources/gal-non-module.r'
        window_source = (root / path).read_bytes().decode('mac_roman')
        payload = presentation.resource(window_source, 'PPob', number)
        window = presentation.decode_window(window_source, number)
        window['source'] = path
        window['objectClasses'] = [obj[:4].decode('ascii') for obj in presentation.objects(payload)]
        windows[str(number)] = window
    text_source = 'Resources/gal-en-shareware.r'
    text_blob = presentation.resource((root / text_source).read_bytes().decode('mac_roman'), 'STR#', 500)
    texts = {'source': text_source, 'resource': 500, 'sha256': presentation.digest(text_blob),
             'entries': decode_strings(text_blob)}
    return {'format': 1, 'purpose': 'Source presentation evidence, not proof of runtime parity',
            'source': relative, 'resource': 128, 'sha256': presentation.digest(blob),
            'events': events, 'windows': windows, 'texts': texts}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('output', nargs='?', type=Path, default=Path('docs/reference/v3-events.json'))
    args = parser.parse_args()
    args.output.write_text(json.dumps(import_reference(args.source), ensure_ascii=False, indent=2)+'\n')
