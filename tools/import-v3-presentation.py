#!/usr/bin/env python3
"""Import shipped startup/About resource evidence; not a runtime UI port."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import struct


def resource(source, kind, number):
    pattern = r"data\s+'" + re.escape(kind) + r"'\s*\(\s*" + str(number) + r"(?:\s*,[^)]*)?\)\s*\{(.*?)\};"
    matches = list(re.finditer(pattern, source, re.S))
    if len(matches) != 1:
        raise ValueError(f'Expected one {kind} {number} resource')
    body = re.sub(r'/\*.*?\*/', '', matches[0][1], flags=re.S)
    if re.sub(r'\$"[0-9A-Fa-f\s]*"', '', body).strip():
        raise ValueError(f'Unsupported payload: {kind} {number}')
    return bytes.fromhex(''.join(re.findall(r'\$"([0-9A-Fa-f\s]*)"', body)))


def digest(blob):
    return hashlib.sha256(blob).hexdigest()


def objects(blob):
    if blob[:2] != b'\x00\x02':
        raise ValueError('Unsupported PPob format')
    offset = 2
    while offset < len(blob):
        tag = blob[offset:offset+4]
        offset += 4
        if tag in (b'begs', b'ends'):
            continue
        if tag == b'end.' and offset == len(blob):
            return
        if tag != b'objd' or offset+4 > len(blob):
            raise ValueError('Invalid PPob object tag')
        size = struct.unpack_from('>I', blob, offset)[0]
        offset += 4
        if size < 4 or offset+size > len(blob):
            raise ValueError('Truncated PPob object')
        yield blob[offset:offset+size]
        offset += size
    raise ValueError('Missing PPob terminator')


def decode_window(source, number):
    blob = resource(source, 'PPob', number)
    result = {'resource': number, 'sha256': digest(blob), 'captions': [], 'pictures': []}
    for obj in objects(blob):
        kind = obj[:4]
        if kind in (b'capt', b'RCap'):
            length = obj[34]
            if 35+length > len(obj):
                raise ValueError('Truncated caption')
            result['captions'].append(obj[35:35+length].decode('mac_roman').replace('\r', '\n'))
        if kind in (b'pict', b'SPic'):
            picture = struct.unpack_from('>h', obj, 60)[0]
            entry = {'resource': picture}
            if kind == b'SPic':
                if len(obj) != 77:
                    raise ValueError('Unexpected scrolling picture size')
                start, cadence, dx, dy = struct.unpack_from('>IIhh', obj, 62)
                entry['scroll'] = {'startTicks': start, 'ticksPerMove': cadence, 'horizontalPixels': dx, 'verticalPixels': dy}
            result['pictures'].append(entry)
    return result


def decode_menu(source, number):
    menu = resource(source, 'MENU', number)
    commands = resource(source, 'Mcmd', number)
    if len(menu) < 16 or struct.unpack_from('>h', menu)[0] != number or len(commands) < 2:
        raise ValueError('Invalid menu header')
    count = struct.unpack_from('>H', commands)[0]
    if len(commands) != 2+4*count:
        raise ValueError('Invalid command payload length')
    command_ids = struct.unpack_from('>'+str(count)+'i', commands, 2)
    offset = 14
    def caption():
        nonlocal offset
        if offset >= len(menu):
            raise ValueError('Missing menu caption')
        length = menu[offset]
        offset += 1
        if offset+length > len(menu):
            raise ValueError('Truncated menu caption')
        text = menu[offset:offset+length].decode('mac_roman')
        offset += length
        return text
    title = caption()
    items = []
    while offset < len(menu) and menu[offset]:
        label = caption()
        if offset+4 > len(menu):
            raise ValueError('Truncated menu item attributes')
        attributes = list(menu[offset:offset+4])
        offset += 4
        items.append({'label': label, 'attributes': attributes})
    if offset >= len(menu) or any(menu[offset:]) or len(items) != count:
        raise ValueError('Invalid menu terminator or item count')
    for item, command in zip(items, command_ids):
        item['command'] = command
    return {'resource': number, 'title': title, 'menuSha256': digest(menu),
            'commandsSha256': digest(commands), 'items': items}


def import_reference(root):
    result = {'format': 2, 'purpose': 'Source evidence for startup/About and application commands; parity tracked separately', 'variants': {}}
    for language in ('en', 'de'):
        for edition in ('shareware', 'cdrom'):
            relative = f'Resources/gal-{language}-{edition}.r'
            blob = (root / relative).read_bytes()
            source = blob.decode('mac_roman')
            windows = {name: decode_window(source, number) for name, number in [('about', 22), ('startup', 32)]}
            pictures = {}
            for window in windows.values():
                for entry in window['pictures']:
                    number = entry['resource']
                    picture_source = relative
                    if re.search(r"data\s+'PICT'\s*\(\s*"+str(number)+r'(?:[,\s])', source):
                        payload = resource(source, 'PICT', number)
                    else:
                        picture_source = 'Resources/gal-non-module.r'
                        payload = resource((root / picture_source).read_bytes().decode('mac_roman'), 'PICT', number)
                    top, left, bottom, right = struct.unpack_from('>4h', payload, 2)
                    pictures[str(number)] = {'source': picture_source, 'sha256': digest(payload), 'bytes': len(payload), 'frame': [top, left, bottom, right]}
            result['variants'][language+'-'+edition] = {'source': relative, 'sha256': digest(blob), 'windows': windows, 'pictures': pictures, 'menus': {str(number): decode_menu(source, number) for number in (128, 129, 130, 134, 137)}}
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('output', nargs='?', type=Path, default=Path('docs/reference/v3-presentation.json'))
    args = parser.parse_args()
    args.output.write_text(json.dumps(import_reference(args.source), ensure_ascii=False, indent=2)+'\n')
