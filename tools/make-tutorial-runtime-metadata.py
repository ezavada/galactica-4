#!/usr/bin/env python3
"""Rebuild common tutorial runtime controls from the decoded v3 reference.

Translated presentation is maintained in data/tutorial/languages/*.json.
"""
import argparse
import json
from pathlib import Path

GROUPS = {
    "tutorial": [
        1
    ],
    "setup": [
        2,
        3,
        4
    ],
    "introduction": [
        5
    ],
    "map": [
        6,
        7
    ],
    "system": [
        8,
        9
    ],
    "production": [
        10,
        11,
        20,
        26
    ],
    "turns": [
        12,
        21,
        52,
        54
    ],
    "events": [
        13,
        14,
        27,
        29,
        30,
        35,
        45,
        46
    ],
    "orders": [
        15,
        16,
        17,
        22,
        28
    ],
    "retry": [
        18
    ],
    "defense": [
        19,
        23
    ],
    "colony": [
        24,
        47
    ],
    "rename": [
        25
    ],
    "technology": [
        31,
        33,
        34,
        44
    ],
    "patrol": [
        32,
        48,
        49
    ],
    "fleet": [
        36,
        37,
        38,
        39,
        40,
        41,
        42,
        43,
        56
    ],
    "compare": [
        50,
        51
    ],
    "idle": [
        53
    ],
    "class": [
        55
    ],
    "contents": [
        57
    ],
    "exchange": [
        58
    ],
    "damage": [
        59
    ],
    "finish": [
        60
    ],
    "hide": [
        100
    ],
    "dialog": [
        101
    ],
    "hosting": [
        103
    ]
}
BUTTONS = {'Start': 'start', 'OK': 'ok', 'Retry': 'retry', 'Bye': 'finish', 'Hide it': 'hide', '': ''}
CONTROL_FIELDS = ('id', 'variant', 'size', 'picture', 'pictureRect', 'sound', 'binding', 'position', 'nextPage', 'exceptions')

def generate(reference, output):
    source = json.loads(reference.read_text(encoding='utf-8'))
    titles = {number: title for title, numbers in GROUPS.items() for number in numbers}
    german = {page['id']: page for page in source['languages']['de']['pages']}
    pages = []
    for page in source['languages']['en']['pages']:
        logical = page['id']-1000 if page['id'] >= 1000 else page['id']
        for key in ('variant', 'picture', 'sound', 'binding', 'nextPage', 'exceptions'):
            if page[key] != german[page['id']][key]:
                raise ValueError('Source-language controls differ: '+str(page['id'])+' '+key)
        pages.append({**{key: page[key] for key in CONTROL_FIELDS},
            'textKey': str(logical), 'titleKey': titles[logical], 'buttonKey': BUTTONS[page['button']]})
    output.write_text(json.dumps({'format': 1, 'pages': pages}, indent=2)+'\n', encoding='utf-8')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('reference', type=Path, nargs='?', default=Path('docs/reference/v3-tutorial.json'))
    parser.add_argument('output', type=Path, nargs='?', default=Path('data/tutorial/pages.json'))
    args = parser.parse_args()
    generate(args.reference, args.output)
