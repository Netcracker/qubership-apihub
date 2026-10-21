"""Generate an Archi (archimatetool.com) model file with elements, relationships and views."""
from model import *
from xml.sax.saxutils import escape as xe
import itertools

cnt = itertools.count(1)
def nid(prefix='id'):
    return f'{prefix}-{next(cnt):04d}'

elements = {}   # key -> (xsi type, name, folder, documentation)
rels = []       # (type, src_key, dst_key)
def el(key, typ, name, folder, doc=''):
    elements[key] = (typ, name, folder, doc)

# strategy
for c in CAPABILITIES:
    el(c['id'], 'Capability', f'{c["id"]} {c["name"]}', 'strategy', c['desc'])
    for (lid, name, owners, tech, mat) in c['l2']:
        el(lid, 'Capability', f'{lid} {name}', 'strategy', f'Technology: {tech}\nOwners: {", ".join(CONTAINERS[o]["name"] for o in owners) or "design only"}\nMaturity: {MATURITY[mat]["label"]}')
        rels.append(('Composition', c['id'], lid))
# business
for a, n in ACTORS: el(a, 'BusinessActor', n, 'business')
for s, n in BUSINESS_SERVICES: el(s, 'BusinessService', n, 'business')
for p_, n, bs in BUSINESS_PROCESSES:
    el(p_, 'BusinessProcess', n, 'business'); rels.append(('Realization', p_, bs))
for a, s in ACTOR_SERVICE: rels.append(('Serving', s, a))
# application
comp_keys = [k for k in CONTAINERS if k not in ('LIB', 'OPS')]
for k in comp_keys: el(k, 'ApplicationComponent', CONTAINERS[k]['name'], 'application', CONTAINERS[k]['tech'])
for s, n, comps in APP_SERVICES:
    el(s, 'ApplicationService', n, 'application')
    for k in comps: rels.append(('Realization', k, s))
for s, b in SERVICE_TO_BUSINESS: rels.append(('Realization', s, b))
for cid, svcs in CAP_TO_SERVICE.items():
    for s in svcs: rels.append(('Realization', s, cid))
# L2 capability ← component realization (from owners)
for c in CAPABILITIES:
    for (lid, name, owners, tech, mat) in c['l2']:
        for o in owners:
            if o in comp_keys: rels.append(('Realization', o, lid))
# technology
ttype = {'node': 'Node', 'sysSw': 'SystemSoftware', 'artifact': 'Artifact'}
for n, name, t in NODES: el(n, ttype[t], name, 'technology')
for k, n in COMPONENT_TO_NODE: rels.append(('Serving', n, k))

# ids
eid = {k: nid('e') for k in elements}
rid = {}
rel_items = []
for (t, s, d) in rels:
    r = nid('r'); rid[(t, s, d)] = r; rel_items.append((r, t, s, d))

folders = {'strategy': 'Strategy', 'business': 'Business', 'application': 'Application', 'technology': 'Technology & Physical'}
out = ['<?xml version="1.0" encoding="UTF-8"?>',
       '<archimate:model xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:archimate="http://www.archimatetool.com/archimate" '
       f'name="Qubership APIHUB" id="{nid("m")}" version="5.0.0">']
for fkey, fname in folders.items():
    out.append(f'  <folder name="{xe(fname)}" id="{nid("f")}" type="{fkey}">')
    for k, (typ, name, folder, doc) in elements.items():
        if folder == fkey:
            if doc:
                out.append(f'    <element xsi:type="archimate:{typ}" name="{xe(name)}" id="{eid[k]}"><documentation>{xe(doc)}</documentation></element>')
            else:
                out.append(f'    <element xsi:type="archimate:{typ}" name="{xe(name)}" id="{eid[k]}"/>')
    out.append('  </folder>')
for fname, fkey in [('Motivation', 'motivation'), ('Implementation &amp; Migration', 'implementation_migration'), ('Other', 'other')]:
    out.append(f'  <folder name="{fname}" id="{nid("f")}" type="{fkey}"/>')
out.append(f'  <folder name="Relations" id="{nid("f")}" type="relations">')
for (r, t, s, d) in rel_items:
    out.append(f'    <element xsi:type="archimate:{t}Relationship" id="{r}" source="{eid[s]}" target="{eid[d]}"/>')
out.append('  </folder>')

# ---------------- views
def view(name, objects, connections, groups=None):
    """objects: key -> (x,y,w,h, fillColor|None); groups: list of (name,x,y,w,h). connections: relationships (t,s,d) to draw."""
    vid = nid('v')
    lines = [f'    <element xsi:type="archimate:ArchimateDiagramModel" name="{xe(name)}" id="{vid}">']
    did = {k: nid('d') for k in objects}
    conns = {}
    for (t, s, d) in connections:
        if s in did and d in did:
            conns.setdefault(s, []).append((nid('c'), d, rid[(t, s, d)]))
    for g in (groups or []):
        gname, gx, gy, gw, gh = g
        lines.append(f'      <child xsi:type="archimate:Group" name="{xe(gname)}" id="{nid("g")}" fillColor="#f1f5f9"><bounds x="{gx}" y="{gy}" width="{gw}" height="{gh}"/></child>')
    for k, (x, y, w, h, fill) in objects.items():
        fc = f' fillColor="{fill}"' if fill else ''
        lines.append(f'      <child xsi:type="archimate:DiagramObject" id="{did[k]}"{fc} archimateElement="{eid[k]}">')
        lines.append(f'        <bounds x="{x}" y="{y}" width="{w}" height="{h}"/>')
        for (cid, d, r) in conns.get(k, []):
            lines.append(f'        <sourceConnection xsi:type="archimate:Connection" id="{cid}" source="{did[k]}" target="{did[d]}" archimateRelationship="{r}"/>')
        lines.append('      </child>')
    lines.append('    </element>')
    return lines

out.append(f'  <folder name="Views" id="{nid("f")}" type="diagrams">')

# View 1: layered
objs = {}
for i, (a, n) in enumerate(ACTORS): objs[a] = (60 + i * 400, 40, 200, 60, None)
for i, (s, n) in enumerate(BUSINESS_SERVICES): objs[s] = (60 + i * 285, 150, 240, 60, None)
for i, (s, n, comps) in enumerate(APP_SERVICES): objs[s] = (40 + i * 202, 320, 190, 60, None)
for i, k in enumerate(comp_keys): objs[k] = (60 + i * 285, 480, 240, 90, None)
for i, (n, name, t) in enumerate(NODES): objs[n] = (40 + i * 224, 700, 210, 80, None)
conns = [r for r in rels if r[0] in ('Serving', 'Realization') and r[1] in objs and r[2] in objs and not r[2].startswith('C')]
out += view('Layered view', objs, conns)

# View 2: capability realization
objs = {}
for i, c in enumerate(CAPABILITIES): objs[c['id']] = (40, 40 + i * 90, 480, 70, None)
for i, (s, n, comps) in enumerate(APP_SERVICES): objs[s] = (700, 40 + i * 80, 440, 60, None)
for i, k in enumerate(comp_keys): objs[k] = (1320, 40 + i * 110, 440, 90, None)
conns = [r for r in rels if r[0] == 'Realization' and r[1] in objs and r[2] in objs]
out += view('Capability realization view', objs, conns)

# View 3 / 4: capability map (plain) and technology heatmap
def capmap(fill_fn, name):
    objs, groups = {}, []
    x = 20
    for c in CAPABILITIES:
        gh = 60 + len(c['l2']) * 100
        groups.append((f'{c["id"]} {c["name"]}', x, 20, 262, gh))
        for r, (lid, nm, owners, tech, mat) in enumerate(c['l2']):
            objs[lid] = (x + 16, 60 + r * 100, 230, 84, fill_fn(owners, mat))
        x += 286
    return view(name, objs, [], groups)
out += capmap(lambda o, m: None, 'Business capability map (L2)')
out += capmap(lambda o, m: '#' + (CONTAINERS[o[0]]['color'] if o else '94A3B8'), 'Capability heatmap - technology / ownership')
out += capmap(lambda o, m: '#' + MATURITY[m]['fill'], 'Capability heatmap - maturity')
out.append('  </folder>')
out.append('</archimate:model>')
open('APIHUB_capability_model.archimate', 'w', encoding='utf-8').write('\n'.join(out))
print('elements', len(elements), 'relations', len(rels))
