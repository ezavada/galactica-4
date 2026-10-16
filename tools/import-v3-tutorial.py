#!/usr/bin/env python3
"""Decode v3 Rez tutorial resources into a reproducible port reference.

This imports source evidence, not a playable tutorial or localized v4 UI.
Usage: python3 tools/import-v3-tutorial.py /path/to/galactica-v3 [output]
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import struct


def digest(blob):
    return hashlib.sha256(blob).hexdigest()


def read_rez(blob):
    # The checked-in Rez dumps encode resource payloads as hexadecimal; the
    # MacRoman comments are annotations, never part of the payload.
    source = blob.decode('mac_roman')
    resources = {}
    for match in re.finditer(r"data\s+'(.{4})'\s*\(\s*(-?\d+)(?:\s*,[^)]*)?\)\s*\{(.*?)\};", source, re.S):
        kind, number, body = match.groups()
        body = re.sub(r'/\*.*?\*/', '', body, flags=re.S)
        chunks = re.findall(r'\$"([0-9A-Fa-f\s]*)"', body)
        if not chunks or re.sub(r'\$"[0-9A-Fa-f\s]*"', '', body).strip():
            raise ValueError('Unsupported Rez payload: '+kind+' '+number)
        key = (kind, int(number))
        if key in resources:
            raise ValueError('Duplicate resource: '+str(key))
        resources[key] = bytes.fromhex(''.join(chunks))
    if not resources:
        raise ValueError('No hexadecimal Rez resources')
    return resources


def pascal(blob, offset=0):
    if offset >= len(blob) or offset+1+blob[offset] > len(blob):
        raise ValueError('Truncated Pascal string')
    end = offset+1+blob[offset]
    return blob[offset+1:end].decode('mac_roman'), end


def resource_string(resources, number, index):
    if not number:
        return ''
    if not index:
        text, end = pascal(resources[('STR ', number)])
        # Rez dumps may pad STR resources to even byte alignment.
        if any(resources[('STR ', number)][end:]):
            raise ValueError('Unexpected STR trailing data')
        return text
    blob = resources[('STR#', number)]
    if len(blob) < 2:
        raise ValueError('Truncated string list')
    count = struct.unpack_from('>H', blob)[0]
    if not 1 <= index <= count:
        raise ValueError('String-list index outside resource')
    offset = 2
    for i in range(index):
        text, offset = pascal(blob, offset)
    return text


def decode_page(blob, number, resources):
    # GalacticaTutorial.h pageResT uses 2-byte packed fields. Rect contains
    # four signed shorts; PaneIDT is signed 32-bit; flags have padding bytes.
    if len(blob) < 44:
        raise ValueError('Truncated page header')
    fields = struct.unpack_from('>14hi8Bhh', blob)
    variant, height, width, title_id, title_index, text_id, button_id, button_index, picture_id = fields[:9]
    if variant not in (0, 1, 2):
        raise ValueError('Unknown page variant')
    binding = fields[14]
    flags = fields[15:23]
    next_page, count = fields[23:25]
    if count < 0 or len(blob) != 44+count*6:
        raise ValueError('Invalid page exception length')
    # LoadPage substitutes default TEXT and sound IDs only when -1 occurs.
    if text_id == -1:
        text_id = number+7000
    text = resources[('TEXT', text_id)].decode('mac_roman').replace('\r', '\n')
    return {'id':number, 'variant':variant, 'size':{'height':height,'width':width},
        'title':resource_string(resources,title_id,title_index) if ('STR#' if title_index else 'STR ',title_id) in resources or not title_id else None,
        'titleResource':{'id':title_id,'index':title_index},
        'text':text, 'textResource':text_id,
        'button':resource_string(resources,button_id,button_index) if ('STR#' if button_index else 'STR ',button_id) in resources or not button_id else None,
        'buttonResource':{'id':button_id,'index':button_index},
        'picture':picture_id, 'pictureRect':list(fields[9:13]),
        'sound':7000 if fields[13] == -1 else fields[13], 'binding':binding,
        'position':dict(zip(['top','left','bottom','right'],[bool(flags[i]) for i in (0,2,4,6)])),
        'nextPage':next_page,
        'exceptions':[dict(zip(['window','page'],struct.unpack_from('>ih',blob,44+i*6))) for i in range(count)],
        'pageResourceSha256':digest(blob), 'textResourceSha256':digest(resources[('TEXT',text_id)])}


def import_tutorial(source, output):
    languages = {}
    for language in ['en','de']:
        name = 'Resources/gal-tutorial-'+language+'.r'
        blob = (source/name).read_bytes()
        resources = read_rez(blob)
        # page 7000 is an editor/template artifact with an invalid variant;
        # runtime page selection never requests it. Preserve its hash below.
        pages = [decode_page(payload,number,resources) for (kind,number),payload in sorted(resources.items())
            if kind == 'page' and number != 7000]
        if not set(range(1,61)).issubset({page['id'] for page in pages}):
            raise ValueError('Missing tutorial lesson')
        languages[language] = {'source':name,'sourceSha256':digest(blob),'pages':pages,
            'templatePageSha256':digest(resources[('page',7000)]) if ('page',7000) in resources else None,
            'pictures':[{'id':number,'sha256':digest(payload),'bytes':len(payload)} for (kind,number),payload in sorted(resources.items()) if kind=='PICT'],
            'sounds':[{'id':number,'sha256':digest(payload),'bytes':len(payload)} for (kind,number),payload in sorted(resources.items()) if kind=='snd ']}
    fixture_name = 'release/shareware/Galactica.app/Contents/MacOS/Plug-ins/Galactica Tutorial'
    fixture = (source/fixture_name).read_bytes()
    result = {'format':1,'purpose':'Source reference for interactive tutorial port; not runtime UI',
        'lessonCount':60,'macOSOverrides':[1001,1002,1060],
        'fixture':{'source':fixture_name,'sha256':digest(fixture),'bytes':len(fixture),'signature':fixture[:4].decode('ascii'),'seed':101},
        'languages':languages}
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source',type=Path)
    parser.add_argument('output',nargs='?',type=Path,default=Path('docs/reference/v3-tutorial.json'))
    args = parser.parse_args()
    import_tutorial(args.source,args.output)
