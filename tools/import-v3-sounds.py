#!/usr/bin/env python3
"""Convert the shipped Galactica v3 snd resources to uncompressed PCM WAV.

Usage: python3 tools/import-v3-sounds.py /path/to/v3/Galactica.rsrc [output]
The input is the data fork of the shipped application's resource bundle.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import runpy
import wave


def resources(blob, kind):
    data, resource_map, data_size, map_size = struct.unpack_from('>4I', blob)
    if data + data_size > len(blob) or resource_map + map_size > len(blob):
        raise ValueError('Truncated resource bundle')
    types = resource_map + struct.unpack_from('>H', blob, resource_map + 24)[0]
    for i in range(struct.unpack_from('>H', blob, types)[0] + 1):
        resource_type, count, references = struct.unpack_from('>4sHH', blob, types + 2 + i * 8)
        if resource_type != kind:
            continue
        for j in range(count + 1):
            reference = types + references + j * 12
            resource_id = struct.unpack_from('>h', blob, reference)[0]
            offset = data + int.from_bytes(blob[reference + 5:reference + 8], 'big')
            size = struct.unpack_from('>I', blob, offset)[0]
            sample = blob[offset + 4:offset + 4 + size]
            if len(sample) != size:
                raise ValueError('Truncated resource payload')
            yield resource_id, sample


def pcm_sample(blob):
    # Format 1: synthesizer list, followed by a command list. Discovery has
    # an extra command before bufferCmd; never assume the header is at byte 20.
    if struct.unpack_from('>H', blob)[0] != 1:
        raise ValueError('Only format-1 sound lists are supported')
    synthesizers = struct.unpack_from('>H', blob, 2)[0]
    commands = 4 + synthesizers * 6
    count = struct.unpack_from('>H', blob, commands)[0]
    buffers = []
    for i in range(count):
        command, argument, offset = struct.unpack_from('>HHI', blob, commands + 2 + i * 8)
        if command == 0x8051:  # bufferCmd, with its resource-relative offset flag
            buffers.append(offset)
    if len(buffers) != 1:
        raise ValueError('Expected one sample buffer')
    offset = buffers[0]
    sample_pointer, length, fixed_rate, loop_start, loop_end, encoding, base_frequency = struct.unpack_from('>5I2B', blob, offset)
    if sample_pointer or encoding != 0:
        raise ValueError('Expected an inline standard unsigned 8-bit mono sample')
    frames = blob[offset + 22:offset + 22 + length]
    if len(frames) != length or offset + 22 + length != len(blob):
        raise ValueError('Unexpected sample size or trailing bytes')
    # WAV has an integer sample rate; nearest rounding changes these legacy
    # fractional rates by less than 0.003%. Sample bytes are preserved exactly.
    return round(fixed_rate / 65536), fixed_rate, frames


def write_samples(samples, source_hash, destination):
    destination.mkdir(parents=True, exist_ok=True)
    entries = []
    for resource_id, sound in sorted(samples):
        rate, fixed_rate, frames = pcm_sample(sound)
        target = destination / f'{resource_id}.wav'
        with wave.open(str(target), 'wb') as output:
            output.setnchannels(1)
            output.setsampwidth(1)
            output.setframerate(rate)
            output.writeframes(frames)
        entries.append({'id':resource_id, 'file':target.name, 'frames':len(frames),
            'rate':rate, 'source_fixed_rate':fixed_rate,
            'source_sha256':hashlib.sha256(sound).hexdigest(),
            'pcm_sha256':hashlib.sha256(frames).hexdigest(),
            'wav_sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
    if not entries:
        raise ValueError('No sound resources found')
    (destination / 'manifest.json').write_text(json.dumps({'source_sha256':source_hash,
        'format':'unsigned 8-bit mono PCM', 'sounds':entries}, indent=2) + '\n')
    return entries


def convert(source, destination):
    blob = source.read_bytes()
    return write_samples(resources(blob, b'snd '), hashlib.sha256(blob).hexdigest(), destination)


def convert_tutorial(source, destination):
    # The shipped tutorial Rez dump contains the same cue in both languages.
    read_rez = runpy.run_path(str(Path(__file__).with_name('import-v3-tutorial.py')))['read_rez']
    english = (source / 'Resources/gal-tutorial-en.r').read_bytes()
    decoded = read_rez(english)
    samples = [(number, payload) for (kind, number), payload in decoded.items() if kind == 'snd ']
    german = read_rez((source / 'Resources/gal-tutorial-de.r').read_bytes())
    if not samples or any(german.get(('snd ', number)) != payload for number, payload in samples):
        raise ValueError('Tutorial sound resources differ between shipped languages')
    return write_samples(samples, hashlib.sha256(english).hexdigest(), destination)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('output', nargs='?', type=Path, default=Path(__file__).resolve().parents[1] / 'data/sounds')
    parser.add_argument('--tutorial', action='store_true', help='Read the shipped tutorial Rez resources from a v3 repository')
    args = parser.parse_args()
    destination = args.output
    if args.tutorial and destination == Path(__file__).resolve().parents[1] / 'data/sounds':
        destination = Path(__file__).resolve().parents[1] / 'data/tutorial/sounds'
    for sound in (convert_tutorial if args.tutorial else convert)(args.source, destination):
        print(f"{sound['file']}: {sound['frames']} frames at {sound['rate']} Hz")
