#!/usr/bin/env python3
"""Check deterministic class-report captures for actual additive Lab rendering.

Run test-web-class-observer-cues.cjs before and after the blend change in all
six languages, then pass the two screenshot roots to this checker.
"""
import argparse
from pathlib import Path
import shutil
import subprocess


def check(before, after):
    magick = shutil.which('magick')
    if not magick:
        raise RuntimeError('ImageMagick required for rendered pixel checks')
    for language in ('en','de','es','fr','ja','ru'):
        baseline = sorted((before/language).glob('*.png'))
        if len(baseline) != 8:
            raise AssertionError(f'Expected eight baseline scenes for {language}')
        for image in baseline:
            result = after/language/image.name
            if image.name != 'owner-discovery-artwork.png':
                if image.read_bytes() != result.read_bytes():
                    raise AssertionError(f'Unrelated scene changed: {language}/{image.name}')
                continue
            pixels = []
            for source in (image,result):
                pixels.append(subprocess.check_output([magick,str(source),'-depth','8','rgb:-']))
            a,b = pixels
            if len(a) != 800*600*3 or len(a) != len(b):
                raise AssertionError('Expected matching 800x600 browser captures')
            differences = [y-x for x,y in zip(a,b)]
            # A mode getter alone passed when drawImage ignored the blend.
            # Real additive rendering must materially brighten the blueprint.
            if sum(v>1 for v in differences) < 10000 or sum(differences) <= 0:
                raise AssertionError(f'No rendered additive blueprint: {language}')
            # The room on the right has no blueprint: black must not cover it.
            for y in range(120,300):
                start=(y*800+550)*3;end=(y*800+700)*3
                if a[start:end] != b[start:end]:
                    raise AssertionError(f'Background altered outside blueprint: {language}')
        print(f'PASS rendered additive Lab and seven unchanged scenes: {language}')


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('before',type=Path)
    parser.add_argument('after',type=Path)
    args=parser.parse_args()
    check(args.before,args.after)
