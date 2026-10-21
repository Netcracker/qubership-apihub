from drawio_base import Page, escape
from model import (
    ACTORS,
    ACTOR_SERVICE,
    APP_SERVICES,
    BUSINESS_SERVICES,
    CAPABILITIES,
    CAP_TO_SERVICE,
    COMPONENT_TO_NODE,
    CONTAINERS,
    MATURITY,
    NODES,
    SERVICE_TO_BUSINESS,
    TIERS,
)

pages = []
CW, CH, G = 230, 96, 16  # capability cell size / gap
COL_W = CW + 2 * 16  # column (L1 group) width


def rawcell(p, x, y, w, h, value, style):
    i = p._id()
    p.cells.append(
        f'<mxCell id="{i}" value="{escape(value, {chr(34): "&quot;"})}" style="{style}" vertex="1" parent="1">'
        f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>'
    )
    return i


def cap_cell(p, x, y, lid, name, sub=None, fill='EFF6FF', stroke='2563EB', font='1E3A5F', h=CH, key=None):
    value = f'<b>{escape(lid)}</b> {escape(name)}'
    if sub:
        value += f'<br><span style="font-size:8px">{escape(sub)}</span>'
    style = (
        f'rounded=1;whiteSpace=wrap;html=1;fillColor=#{fill};strokeColor=#{stroke};fontColor=#{font};'
        f'fontSize=10;arcSize=8;align=center;verticalAlign=middle;spacing=4;'
    )
    i = p._id(key)
    p.cells.append(
        f'<mxCell id="{i}" value="{escape(value, {chr(34): "&quot;"})}" style="{style}" vertex="1" parent="1">'
        f'<mxGeometry x="{x}" y="{y}" width="{CW}" height="{h}" as="geometry"/></mxCell>'
    )
    return i


def cap_grid(p, y0, mode):
    """Draw all 9 L1 columns with their L2 cells. mode: plain | tech | maturity."""
    tier_col = {
        'core': ('DBEAFE', '1E40AF'),
        'differentiating': ('EDE9FE', '5B21B6'),
        'supporting': ('F1F5F9', '334155'),
    }
    x = 40
    ch = CH if mode != 'tech' else CH + 26
    for c in CAPABILITIES:
        f, s = tier_col[c['tier']]
        gh = 60 + len(c['l2']) * (ch + G)
        rawcell(
            p,
            x,
            y0,
            COL_W,
            gh,
            f'<b>{c["id"]} {escape(c["name"])}</b><br><span style="font-size:8px">{escape(c["desc"])}</span>',
            f'rounded=1;whiteSpace=wrap;html=1;fillColor=#{f};strokeColor=#{s};strokeWidth=2;fontColor=#{s};fontSize=11;'
            f'verticalAlign=top;align=center;spacingTop=4;arcSize=4;',
        )
        for r, (lid, name, owners, tech, mat) in enumerate(c['l2']):
            cy = y0 + 56 + r * (ch + G)
            if mode == 'plain':
                cap_cell(p, x + 16, cy, lid, name, key=lid)
            elif mode == 'tech':
                col = CONTAINERS[owners[0]]['color'] if owners else '94A3B8'
                owner = ' + '.join(CONTAINERS[o]['name'] for o in owners) or 'design only'
                cap_cell(
                    p,
                    x + 16,
                    cy,
                    lid,
                    name,
                    f'{owner}\n{tech}',
                    fill=col,
                    stroke='1E293B',
                    font='FFFFFF',
                    h=ch,
                    key=lid,
                )
            else:
                m = MATURITY[mat]
                cap_cell(
                    p, x + 16, cy, lid, name, m['label'], fill=m['fill'], stroke=m['color'], font=m['color'], key=lid
                )
        x += COL_W + 24
    return x


def tier_legend(p, x, y):
    tier_col = {
        'core': ('DBEAFE', '1E40AF'),
        'differentiating': ('EDE9FE', '5B21B6'),
        'supporting': ('F1F5F9', '334155'),
    }
    for i, (t, label) in enumerate(TIERS.items()):
        f, s = tier_col[t]
        rawcell(
            p,
            x + i * 230,
            y,
            210,
            26,
            label,
            f'rounded=1;whiteSpace=wrap;html=1;fillColor=#{f};strokeColor=#{s};fontColor=#{s};fontSize=10;',
        )


# ---------------- 1. Capability map L1
p = Page('1 Capability Map L1')
pages.append(p)
p.text(20, 10, 1400, 30, 'Qubership APIHUB — Business Capability Map, Level 1', 18, True)
tier_col = {'core': ('DBEAFE', '1E40AF'), 'differentiating': ('EDE9FE', '5B21B6'), 'supporting': ('F1F5F9', '334155')}
y = 70
for t, label in TIERS.items():
    caps = [c for c in CAPABILITIES if c['tier'] == t]
    f, s = tier_col[t]
    rawcell(
        p,
        40,
        y,
        1560,
        190,
        label,
        f'rounded=1;whiteSpace=wrap;html=1;fillColor=#{f};strokeColor=#{s};strokeWidth=2;fontColor=#{s};fontSize=12;fontStyle=1;verticalAlign=top;align=left;spacingLeft=10;spacingTop=4;arcSize=4;',
    )
    for i, c in enumerate(caps):
        rawcell(
            p,
            70 + i * 250,
            y + 40,
            230,
            130,
            f'<b style="font-size:12px">{c["id"]} {escape(c["name"])}</b><br><br><span style="font-size:9px">{escape(c["desc"])}</span><br><i style="font-size:9px">{len(c["l2"])} L2 capabilities</i>',
            f'rounded=1;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#{s};strokeWidth=1.5;fontColor=#0F172A;fontSize=10;arcSize=8;spacing=6;',
        )
    y += 210
p.text(
    40,
    y + 10,
    1500,
    60,
    'A capability describes what APIHUB does, independent of implementation. Tiers: core = the reason the product exists; differentiating = capabilities competitors of an API registry rarely have; supporting = necessary to operate the platform.',
    10,
)

# ---------------- 2. Capability map L2
p = Page('2 Capability Map L2')
pages.append(p)
p.text(20, 10, 1400, 30, 'Business Capability Map — Level 2 (all capabilities)', 18, True)
xe = cap_grid(p, 60, 'plain')
tier_legend(p, 40, 30 + 60 + 8 * (CH + G) + 60)

# ---------------- 3. Heatmap technology
p = Page('3 Heatmap Technology')
pages.append(p)
p.text(
    20,
    10,
    1600,
    30,
    'Capability Heatmap — technology & ownership overlay (colour = owning container, text = implementing components)',
    18,
    True,
)
cap_grid(p, 60, 'tech')
ly = 60 + 60 + 8 * (CH + 26 + G) + 40
p.text(40, ly, 300, 24, 'Legend — owning container / technology', 11, True)
for i, (k, c) in enumerate(CONTAINERS.items()):
    rawcell(
        p,
        40 + (i % 5) * 300,
        ly + 30 + (i // 5) * 40,
        280,
        32,
        f'<b>{escape(c["name"])}</b> — {escape(c["tech"])}',
        f'rounded=1;whiteSpace=wrap;html=1;fillColor=#{c["color"]};strokeColor=#1E293B;fontColor=#FFFFFF;fontSize=9;',
    )

# ---------------- 4. Heatmap maturity
p = Page('4 Heatmap Maturity')
pages.append(p)
p.text(20, 10, 1600, 30, 'Capability Heatmap — maturity (assessment from code evidence, 2026-09)', 18, True)
cap_grid(p, 60, 'maturity')
ly = 60 + 60 + 8 * (CH + G) + 40
p.text(40, ly, 300, 24, 'Legend — maturity', 11, True)
for i, m in enumerate(MATURITY.values()):
    rawcell(
        p,
        40 + i * 380,
        ly + 30,
        360,
        44,
        f'<b>{m["label"]}</b><br><span style="font-size:8px">{escape(m["text"])}</span>',
        f'rounded=1;whiteSpace=wrap;html=1;fillColor=#{m["fill"]};strokeColor=#{m["color"]};fontColor=#{m["color"]};fontSize=10;',
    )

# ---------------- 5. Application-to-capability matrix (as table cells)
p = Page('5 App-Capability Matrix')
pages.append(p)
p.text(20, 10, 1600, 30, 'Application-to-capability matrix (● = container contributes to the capability)', 18, True)
keys = list(CONTAINERS.keys())
x0, y0, cw0, cw, rh = 40, 60, 330, 96, 22
rawcell(
    p,
    x0,
    y0,
    cw0,
    36,
    'Capability',
    'whiteSpace=wrap;html=1;fillColor=#0F1F3D;strokeColor=#0F1F3D;fontColor=#FFFFFF;fontStyle=1;fontSize=10;',
)
for j, k in enumerate(keys):
    rawcell(
        p,
        x0 + cw0 + j * cw,
        y0,
        cw,
        36,
        CONTAINERS[k]['name'],
        f'whiteSpace=wrap;html=1;fillColor=#{CONTAINERS[k]["color"]};strokeColor=#0F1F3D;fontColor=#FFFFFF;fontStyle=1;fontSize=9;',
    )
rawcell(
    p,
    x0 + cw0 + len(keys) * cw,
    y0,
    110,
    36,
    'Maturity',
    'whiteSpace=wrap;html=1;fillColor=#0F1F3D;strokeColor=#0F1F3D;fontColor=#FFFFFF;fontStyle=1;fontSize=10;',
)
y = y0 + 36
for c in CAPABILITIES:
    rawcell(
        p,
        x0,
        y,
        cw0 + len(keys) * cw + 110,
        rh,
        f'<b>{c["id"]} {escape(c["name"])}</b>',
        'whiteSpace=wrap;html=1;fillColor=#E2E8F0;strokeColor=#CBD5E1;fontColor=#0F172A;fontSize=9;align=left;spacingLeft=6;',
    )
    y += rh
    for lid, name, owners, tech, mat in c['l2']:
        rawcell(
            p,
            x0,
            y,
            cw0,
            rh,
            f'{lid} {escape(name)}',
            'whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#CBD5E1;fontColor=#0F172A;fontSize=9;align=left;spacingLeft=6;',
        )
        for j, k in enumerate(keys):
            on = k in owners
            rawcell(
                p,
                x0 + cw0 + j * cw,
                y,
                cw,
                rh,
                '●' if on else '',
                f'whiteSpace=wrap;html=1;fillColor=#{CONTAINERS[k]["color"] + "" if on else "FFFFFF"};strokeColor=#CBD5E1;fontColor=#FFFFFF;fontSize=12;',
            )
        m = MATURITY[mat]
        rawcell(
            p,
            x0 + cw0 + len(keys) * cw,
            y,
            110,
            rh,
            m['label'],
            f'whiteSpace=wrap;html=1;fillColor=#{m["fill"]};strokeColor=#CBD5E1;fontColor=#{m["color"]};fontSize=8;',
        )
        y += rh

# ---------------- ArchiMate helpers
AM = {  # ArchiMate 3 layer colours
    'strategy': 'F5DEAA',
    'business': 'FFFF99',
    'application': '99FFFF',
    'technology': 'AFFFAF',
}


def arch(p, key, x, y, w, h, name, layer, app_type, arch_type='square', sub=None):
    fill = AM[layer]
    value = f'<b>{escape(name)}</b>' + (f'<br><span style="font-size:8px">{escape(sub)}</span>' if sub else '')
    style = (
        f'html=1;outlineConnect=0;whiteSpace=wrap;fillColor=#{fill};strokeColor=#333333;fontColor=#1F2937;fontSize=10;'
        f'shape=mxgraph.archimate3.application;appType={app_type};archiType={arch_type};'
    )
    i = p._id(key)
    p.cells.append(
        f'<mxCell id="{i}" value="{escape(value, {chr(34): "&quot;"})}" style="{style}" vertex="1" parent="1">'
        f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>'
    )
    return i


def rel(p, src, dst, kind, label=''):
    styles = {
        'realization': 'endArrow=block;endFill=0;dashed=1;strokeColor=#333333;',
        'serving': 'endArrow=open;endFill=1;strokeColor=#333333;',
        'assignment': 'startArrow=oval;startFill=1;endArrow=block;endFill=1;strokeColor=#333333;',
        'association': 'endArrow=none;strokeColor=#333333;',
    }
    i = p._id()
    style = (
        'edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;fontSize=8;labelBackgroundColor=#ffffff;'
        + styles[kind]
    )
    p.cells.append(
        f'<mxCell id="{i}" value="{escape(label)}" style="{style}" edge="1" parent="1" source="{p.ids[src]}" target="{p.ids[dst]}">'
        f'<mxGeometry relative="1" as="geometry"/></mxCell>'
    )


def layer_box(p, x, y, w, h, title, layer):
    rawcell(
        p,
        x,
        y,
        w,
        h,
        title,
        f'rounded=0;whiteSpace=wrap;html=1;fillColor=#{AM[layer]};strokeColor=#9CA3AF;opacity=45;fontColor=#374151;fontSize=12;fontStyle=1;verticalAlign=top;align=left;spacingLeft=8;spacingTop=2;',
    )


# ---------------- 6. ArchiMate layered view
p = Page('6 ArchiMate Layered View')
pages.append(p)
p.text(20, 10, 1600, 30, 'ArchiMate 3.2 — Layered view (Business → Application → Technology)', 18, True)
layer_box(p, 40, 60, 2040, 250, 'Business layer', 'business')
for i, (aid, an) in enumerate(ACTORS):
    arch(p, aid, 80 + i * 400, 95, 200, 60, an, 'business', 'actor')
for i, (sid, sn) in enumerate(BUSINESS_SERVICES):
    arch(p, sid, 80 + i * 285, 210, 240, 60, sn, 'business', 'serv', 'rounded')
layer_box(p, 40, 340, 2040, 330, 'Application layer', 'application')
for i, (sid, sn, comps) in enumerate(APP_SERVICES):
    arch(p, sid, 60 + i * 202, 380, 190, 60, sn, 'application', 'serv', 'rounded')
comp_keys = [k for k in CONTAINERS if k not in ('LIB', 'OPS')]
for i, k in enumerate(comp_keys):
    arch(p, k, 80 + i * 285, 540, 240, 90, CONTAINERS[k]['name'], 'application', 'comp', sub=CONTAINERS[k]['tech'])
layer_box(p, 40, 700, 2040, 200, 'Technology layer', 'technology')
for i, (nid, nn, nt) in enumerate(NODES):
    arch(p, nid, 60 + i * 224, 760, 210, 80, nn, 'technology', nt)
for a, s in ACTOR_SERVICE:
    rel(p, s, a, 'serving')
for s, b in SERVICE_TO_BUSINESS:
    rel(p, s, b, 'realization')
for sid, sn, comps in APP_SERVICES:
    for k in comps:
        rel(p, k, sid, 'realization')
for k, nid in COMPONENT_TO_NODE:
    rel(p, nid, k, 'serving')
p.text(
    40,
    920,
    1600,
    60,
    'Relationships: solid arrow with open head = serving; dashed arrow with hollow head = realization. Application components correspond to C4 containers (tools/architecture-model/c4). TS libraries and Helm are not shown as components: libraries are packaged inside the components, Helm is an artifact in the technology layer.',
    9,
)

# ---------------- 7. ArchiMate capability realization view
p = Page('7 ArchiMate Capability Realization')
pages.append(p)
p.text(
    20,
    10,
    1600,
    30,
    'ArchiMate 3.2 — Capability realization view (Strategy → Application services → Application components)',
    18,
    True,
)
layer_box(p, 40, 60, 560, 40 + len(CAPABILITIES) * 90, 'Strategy layer — Capabilities', 'strategy')
for i, c in enumerate(CAPABILITIES):
    arch(p, c['id'], 80, 100 + i * 90, 480, 70, f'{c["id"]} {c["name"]}', 'strategy', 'capability', sub=c['desc'])
layer_box(p, 700, 60, 520, 40 + len(APP_SERVICES) * 80, 'Application layer — Services', 'application')
for i, (sid, sn, comps) in enumerate(APP_SERVICES):
    arch(p, sid, 740, 100 + i * 80, 440, 60, sn, 'application', 'serv', 'rounded')
layer_box(p, 1320, 60, 520, 40 + len(comp_keys) * 110, 'Application layer — Components', 'application')
for i, k in enumerate(comp_keys):
    arch(p, k, 1360, 100 + i * 110, 440, 90, CONTAINERS[k]['name'], 'application', 'comp', sub=CONTAINERS[k]['tech'])
for cid, svcs in CAP_TO_SERVICE.items():
    for s in svcs:
        rel(p, s, cid, 'realization')
for sid, sn, comps in APP_SERVICES:
    for k in comps:
        rel(p, k, sid, 'realization')
p.text(
    40,
    100 + len(CAPABILITIES) * 90 + 20,
    560,
    60,
    'C9 Platform Operations is realized by technology-layer elements (Kubernetes, Helm, PostgreSQL, Olric, Prometheus), see the layered view.',
    9,
)

xml = (
    '<mxfile host="app.diagrams.net" modified="2026-09-11T00:00:00.000Z" agent="claude-capability-generator" version="26.0.0" type="device">'
    + ''.join(pg.xml() for pg in pages)
    + '</mxfile>'
)
open('APIHUB_capability_architecture.drawio', 'w', encoding='utf-8').write(xml)
print('pages', len(pages), 'bytes', len(xml))
