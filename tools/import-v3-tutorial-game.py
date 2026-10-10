#!/usr/bin/env python3
"""Convert the fixed v1.2b10 tutorial starting game, not arbitrary saves."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import struct

class Reader:
    def __init__(self, blob):
        self.blob, self.offset = blob, 0
    def take(self, size):
        if size < 0 or self.offset+size > len(self.blob):
            raise ValueError('Truncated tutorial game at '+str(self.offset))
        chunk=self.blob[self.offset:self.offset+size];self.offset+=size
        return chunk
    def read(self, fmt):
        values=struct.unpack('>'+fmt,self.take(struct.calcsize('>'+fmt)))
        if any(isinstance(v,float) and not math.isfinite(v) for v in values):
            raise ValueError('Non-finite game value')
        return values[0] if len(values)==1 else values
    def handle(self):
        length=self.read('i')
        if length < -1: raise ValueError('Invalid handle length')
        return self.take(max(0,length))
    def waypoint(self):
        kind=self.read('B')
        if not 64<=kind<=71: raise ValueError('Unsupported waypoint type')
        result={'type':kind}
        if kind!=64:
            result.update(zip(['distance','x','y','z'],self.read('4i')))
            if kind>65:result['id']=self.read('i')
        return result

def text(blob):
    if not blob or blob[0]+1>len(blob):raise ValueError('Truncated Pascal text')
    return blob[1:blob[0]+1].decode('mac_roman')

def decode(blob):
    r=Reader(blob)
    if r.take(4)!=b'game' or r.read('I')!=0x0102b00a:
        raise ValueError('Expected v1.2b10 tutorial game')
    r.take(72) # Legacy DBPlayerInfoT login record, not current player state.
    header=r.take(312) # Packed GameInfoT_v12, including 256-byte title.
    turn,limit,remaining,total,alive,humans,computers,humans_alive,computers_alive,host,state=struct.unpack_from('>3i2h6B',header,12)
    sequence,skill,advantage,density,size,omniscient,fast=struct.unpack_from('>I4h2B',header,42)
    turn+=3
    if (r.read('i')-13)//3!=turn:raise ValueError('Inconsistent saved turn')
    r.take(60) # Fifteen reserved longs.
    if r.handle() or r.handle():raise ValueError('Unexpected legacy database aliases')
    count=r.read('h')
    if count!=total or count!=3 or humans!=1:raise ValueError('Unexpected tutorial player count')
    players=[]
    for owner in range(1,count+1):
        record=r.take(72)
        posted,pieces,score,home=struct.unpack_from('>4i',record,12)
        hi_star,hi_ship,colony,scout,satellite,unused=struct.unpack_from('>2h4B',record,64)
        players.append({'owner':owner,'name':text(record[30:55]),'homeStarId':home,
            'numPiecesRemaining':pieces,'lastTurnPosted':posted,'hiStarTech':hi_star,'hiShipTech':hi_ship,
            'builtColony':bool(colony),'builtScout':bool(scout),'builtSatellite':bool(satellite)})
    ui_turn=r.read('i');flags=r.read('6B');selected=r.read('i');auto,gotos=r.read('2h');enemy=r.read('B')
    rect=r.read('4h');scroll=r.read('2i');zoom=r.read('f');sound,fullscreen=r.read('2B');mode=r.read('h');courses=r.read('B');events=r.read('B')
    if events:r.read('4hB')
    r.take(8*12) # Eight pairs of RGBColor, three UInt16 channels each.
    if r.handle() or r.handle():raise ValueError('Unexpected pending tutorial arrays')
    objects,star_count,sector=r.read('3i')
    if objects!=42 or star_count!=objects or sector!=size:raise ValueError('Unexpected tutorial galaxy')
    stars=[]
    for _ in range(objects):
        start=r.offset
        if r.take(4)!=b'star':raise ValueError('Unexpected non-star tutorial object')
        identity=r.read('i');owner=r.read('B');info=r.read('H');position=r.waypoint()
        changed=r.read('i');tech=r.read('h');damage=r.read('i');object_flags=r.read('3B');callin=r.read('i')
        name=r.take(r.read('B')).decode('mac_roman');name_width=r.read('h')
        if r.read('B'):raise ValueError('Unexpected star lanes')
        credits=list(r.read('4f'))
        if r.read('H'):raise ValueError('Unexpected completed ships')
        cost,hull,research,population,patrol=r.read('fhhII');destination=r.waypoint()
        if position['type']!=65 or destination['type']!=64 or damage or patrol:
            raise ValueError('Unexpected initial star position/damage/orders')
        allocations=[]
        for _ in range(3):
            value,desired,rate,benefit,economy,locked=r.read('3hfhB')
            allocations.append({'value':value/10,'desired':desired/10,'rate':rate/10,
                'benefit':benefit,'economy':economy,'locked':bool(locked)})
        stars.append({'id':identity,'owner':owner,'name':name,'x':position['x'],'y':position['y'],
            'techLevel':tech,'population':population,'buildCredits':credits,'buildHull':hull,
            'buildCost':cost,'paidTowardResearch':research,'allocations':allocations,
            'recordOffset':start,'recordBytes':r.offset-start,
            'recordSha256':hashlib.sha256(blob[start:r.offset]).hexdigest()})
    if r.read('I') or r.offset!=len(blob):raise ValueError('Unexpected messages or trailing data')
    identities={s['id'] for s in stars}
    if len(identities)!=42 or any(s['owner'] not in range(4) for s in stars):raise ValueError('Invalid star identities/owners')
    if any(not any(s['id']==p['homeStarId'] and s['owner']==p['owner'] for s in stars) for p in players):raise ValueError('Invalid homeworld reference')
    return {'format':1,'sourceSha256':hashlib.sha256(blob).hexdigest(),'sourceBytes':len(blob),'seed':101,
        'turn':turn,'sequence':sequence,'config':{'gameTitle':text(header[56:312]),'numHumans':humans,
            'numComputers':computers,'compSkill':skill,'compAdvantage':advantage,'sectorDensity':density,
            'sectorSize':size,'omniscient':bool(omniscient),'fastGame':bool(fast)},'players':players,'stars':stars,
        'originalUI':{'turn':ui_turn,'selectedId':selected,'zoom':zoom,'scroll':list(scroll),
            'drawFlags':list(flags),'enemyEvents':bool(enemy),'showCourses':bool(courses)}}

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source',type=Path)
    parser.add_argument('output',nargs='?',type=Path,default=Path('data/tutorial/galaxy.json'))
    args=parser.parse_args();result=decode(args.source.read_bytes())
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
