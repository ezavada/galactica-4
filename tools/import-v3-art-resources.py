#!/usr/bin/env python3
"""Recover shipped layer evidence from release ZIP AppleDouble resource forks."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import zipfile


def span(blob, offset, size):
    if offset < 0 or size < 0 or offset + size > len(blob):
        raise ValueError('Resource range outside container')
    return blob[offset:offset+size]


def resource_fork(blob):
    if len(blob) < 26 or struct.unpack_from('>II', blob) != (0x00051607, 0x00020000):
        raise ValueError('Invalid AppleDouble header')
    count = struct.unpack_from('>H', blob, 24)[0]
    span(blob, 26, count * 12)
    forks = []
    for i in range(count):
        kind, offset, size = struct.unpack_from('>III', blob, 26+i*12)
        payload = span(blob, offset, size)
        if kind == 2:
            forks.append(payload)
    if len(forks) != 1:
        raise ValueError('Expected one resource fork entry')
    return forks[0]


def resources(blob):
    if len(blob) < 16:
        raise ValueError('Missing resource fork header')
    data_offset, map_offset, data_size, map_size = struct.unpack_from('>IIII', blob)
    data = span(blob, data_offset, data_size)
    resource_map = span(blob, map_offset, map_size)
    if len(resource_map) < 28:
        raise ValueError('Missing resource map header')
    type_offset, name_offset = struct.unpack_from('>HH', resource_map, 24)
    span(resource_map, name_offset, 0)
    count_bytes = span(resource_map, type_offset, 2)
    type_count = struct.unpack('>H', count_bytes)[0] + 1
    result = {}
    for i in range(type_count):
        tag, count, reference_offset = struct.unpack('>4sHH', span(resource_map, type_offset+2+i*8, 8))
        for j in range(count+1):
            reference = span(resource_map, type_offset+reference_offset+j*12, 12)
            number = struct.unpack_from('>h', reference)[0]
            offset = int.from_bytes(reference[5:8], 'big')
            size = struct.unpack('>I', span(data, offset, 4))[0]
            key = (tag.decode('ascii'), number)
            if key in result:
                raise ValueError('Duplicate resource identity')
            result[key] = span(data, offset+4, size)
    return result


def layers(blob):
    if len(blob) < 2:
        raise ValueError('Missing layer count')
    count = struct.unpack_from('>H', blob)[0]
    if len(blob) != 2 + count*32:
        raise ValueError('Invalid layer record length')
    result = []
    for i in range(count):
        row = struct.unpack_from('>hhhI9HI', blob, 2+i*32)
        result.append({'picture': row[0], 'depth': row[1], 'mode': row[2], 'flags': row[3],
                       'foreground': list(row[4:7]), 'background': list(row[7:10]),
                       'operation': list(row[10:13])})
        if row[13] != 0:
            raise ValueError('Unexpected serialized runtime pointer')
    return result


def digest(blob):
    return hashlib.sha256(blob).hexdigest()


def import_reference(archive):
    with zipfile.ZipFile(archive) as source:
        candidates = [n for n in source.namelist() if n.endswith('/._Galactica Art (Large)')]
        if len(candidates) != 1:
            raise ValueError('Expected one shipped large-art AppleDouble entry')
        entry = candidates[0]
        fork = resource_fork(source.read(entry))
    inventory = resources(fork)
    layer_inventory = {str(number): {'sha256': digest(payload), 'layers': layers(payload)}
                       for (tag, number), payload in sorted(inventory.items()) if tag == 'Layr'}
    wanted = {row['picture'] for value in layer_inventory.values() for row in value['layers']}
    wanted.update((1000, 4000, 4001))
    pictures = {}
    for number in sorted(wanted):
        payload = inventory.get(('PICT', number))
        if payload is None:
            pictures[str(number)] = {'missing': True}
            continue
        top, left, bottom, right = struct.unpack('>hhhh', span(payload, 2, 8))
        pictures[str(number)] = {'sha256': digest(payload), 'bytes': len(payload),
                                 'bounds': [left, top, right, bottom],
                                 'width': right-left, 'height': bottom-top}
    return {'format': 1, 'purpose': 'Shipped resource evidence, not rendered equivalence',
            'archive': archive.name, 'archiveSha256': digest(archive.read_bytes()),
            'appleDoubleEntry': entry, 'resourceForkSha256': digest(fork),
            'layers': layer_inventory, 'pictures': pictures}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    args.output.write_text(json.dumps(import_reference(args.archive), indent=2)+'\n')
