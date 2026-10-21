from model import *

out = []
w = out.append

def esc(s):
    return s.replace('"', '&quot;').replace('<', '&lt;').replace('>', '&gt;')

def cap_block(caps, title, colour_by, direction='LR'):
    """Mermaid flowchart with one subgraph per L1 capability; nodes coloured by container or maturity."""
    lines = [f'flowchart {direction}']
    styles = []
    for c in caps:
        lines.append(f'    subgraph {c["id"]} ["{c["id"]} · {esc(c["name"])}"]')
        lines.append('        direction TB')
        ids = []
        for (lid, name, owners, tech, mat) in c['l2']:
            nid = lid.replace('.', '_')
            ids.append(nid)
            if colour_by == 'tech':
                owner = ', '.join(CONTAINERS[o]['name'] for o in owners) or 'design only'
                label = f'<b>{lid} {esc(name)}</b><br/><i>{esc(owner)}</i><br/>{esc(tech)}'
                col = CONTAINERS[owners[0]]['color'] if owners else '94A3B8'
                styles.append(f'    style {nid} fill:#{col},stroke:#1E293B,color:#fff')
            elif colour_by == 'maturity':
                m = MATURITY[mat]
                label = f'<b>{lid} {esc(name)}</b><br/>{m["label"]}'
                styles.append(f'    style {nid} fill:#{m["fill"]},stroke:#{m["color"]},color:#{m["color"]}')
            else:
                label = f'<b>{lid}</b> {esc(name)}'
                styles.append(f'    style {nid} fill:#EFF6FF,stroke:#2563EB,color:#1E3A5F')
            lines.append(f'        {nid}["{label}"]')
        if len(ids) > 1:
            lines.append('        ' + ' ~~~ '.join(ids))
        lines.append('    end')
        lines.append(f'    style {c["id"]} fill:#F8FAFC,stroke:#334155,stroke-width:2px,color:#0F172A')
    if len(caps) > 1:
        lines.append('    ' + ' ~~~ '.join(c['id'] for c in caps))
    lines += styles
    return '```mermaid\n' + '\n'.join(lines) + '\n```'

core = [c for c in CAPABILITIES if c['tier'] == 'core']
rest = [c for c in CAPABILITIES if c['tier'] != 'core']

w('# Qubership APIHUB — Business Capability Map, Capability Heatmaps and ArchiMate Views')
w('')
w('Generated: 2026-09-11 · Source: `APIHUB-ALL` workspace (same verification base as `diagrams/c4-2026-09/`) ·')
w('Companion files: `APIHUB_capability_architecture.drawio` (editable, ArchiMate 3 shapes), `APIHUB_capability_architecture.pptx`,')
w('`APIHUB_capability_model.archimate` (Archi model).')
w('')
w('## Table of contents')
w('')
w('1. [Business Capability Map](#1-business-capability-map)')
w('2. [Capability Heatmaps](#2-capability-heatmaps)')
w('   - 2.1 [Technology & ownership overlay](#21-technology--ownership-overlay)')
w('   - 2.2 [Maturity heatmap](#22-maturity-heatmap)')
w('   - 2.3 [Application-to-capability matrix](#23-application-to-capability-matrix)')
w('3. [ArchiMate Views](#3-archimate-views)')
w('   - 3.1 [Layered view](#31-layered-view-business--application--technology)')
w('   - 3.2 [Capability realization view](#32-capability-realization-view-strategy--application)')
w('   - 3.3 [Element catalogue](#33-element-catalogue)')
w('- [Appendix — Method notes](#appendix--method-notes)')
w('')
w('---')
w('')
w('## 1. Business Capability Map')
w('')
w('A capability describes **what** APIHUB does, independent of how it is implemented or who runs it. Level 1 groups capabilities')
w('into three tiers (core, differentiating, supporting); Level 2 lists the individual capabilities used by the heatmaps below.')
w('')
w('### 1.1 Level 1 overview')
w('')
lines = ['flowchart LR']
for tier, tlabel in TIERS.items():
    lines.append(f'    subgraph {tier} ["{tlabel}"]')
    lines.append('        direction TB')
    ids = []
    for c in CAPABILITIES:
        if c['tier'] == tier:
            ids.append(c['id'])
            lines.append(f'        {c["id"]}["<b>{c["id"]} {esc(c["name"])}</b><br/>{esc(c["desc"])}<br/><i>{len(c["l2"])} capabilities</i>"]')
    if len(ids) > 1:
        lines.append('        ' + ' ~~~ '.join(ids))
    lines.append('    end')
lines.append('    core ~~~ differentiating ~~~ supporting')
tier_fill = {'core': ('#DBEAFE', '#1E40AF'), 'differentiating': ('#EDE9FE', '#5B21B6'), 'supporting': ('#F1F5F9', '#334155')}
for tier, (f, s) in tier_fill.items():
    lines.append(f'    style {tier} fill:{f},stroke:{s},stroke-width:2px,color:{s}')
for c in CAPABILITIES:
    f, s = tier_fill[c['tier']]
    lines.append(f'    style {c["id"]} fill:#ffffff,stroke:{s},color:#0F172A')
w('```mermaid\n' + '\n'.join(lines) + '\n```')
w('')
w('### 1.2 Level 2 — core capabilities')
w('')
w(cap_block(core, 'core', 'plain'))
w('')
w('### 1.3 Level 2 — differentiating and supporting capabilities')
w('')
w(cap_block(rest, 'rest', 'plain'))
w('')
w('### 1.4 Capability catalogue')
w('')
w('| ID | Capability | Description | L2 count | Tier |')
w('|---|---|---|---|---|')
for c in CAPABILITIES:
    w(f'| {c["id"]} | **{c["name"]}** | {c["desc"]} | {len(c["l2"])} | {TIERS[c["tier"]]} |')
w('')
w('---')
w('')
w('## 2. Capability Heatmaps')
w('')
w('Heatmaps keep the capability map layout and add one dimension per view. Two overlays are provided; the data behind both is the')
w('matrix in 2.3, so further overlays (cost, risk, owner team) can be derived from the same table.')
w('')
w('### 2.1 Technology & ownership overlay')
w('')
w('Colour = container that owns the capability (first owner); text = implementing components / technology.')
w('')
w('| Colour | Container | Technology |')
w('|---|---|---|')
for k, c in CONTAINERS.items():
    w(f'| <span style="display:inline-block;width:14px;height:14px;background:#{c["color"]};border-radius:3px"></span> `#{c["color"]}` | {c["name"]} | {c["tech"]} |')
w('')
w(cap_block(core, 'core', 'tech'))
w('')
w(cap_block(rest, 'rest', 'tech'))
w('')
w('### 2.2 Maturity heatmap')
w('')
w('Assessment based on code evidence (release history, deprecated code paths, "pending" / "not active" markers, test coverage). Treat it as a')
w('starting point for the architecture board, not as a measured metric.')
w('')
w('| Level | Meaning |')
w('|---|---|')
for m in MATURITY.values():
    w(f'| <span style="display:inline-block;width:14px;height:14px;background:#{m["fill"]};border:1px solid #{m["color"]};border-radius:3px"></span> **{m["label"]}** | {m["text"]} |')
w('')
w(cap_block(core, 'core', 'maturity'))
w('')
w(cap_block(rest, 'rest', 'maturity'))
w('')
w('### 2.3 Application-to-capability matrix')
w('')
keys = list(CONTAINERS.keys())
w('| Capability | ' + ' | '.join(CONTAINERS[k]['name'] for k in keys) + ' | Technology | Maturity |')
w('|---|' + '---|' * len(keys) + '---|---|')
for c in CAPABILITIES:
    w(f'| **{c["id"]} {c["name"]}** |' + ' |' * len(keys) + ' | |')
    for (lid, name, owners, tech, mat) in c['l2']:
        cells = ' | '.join('●' if k in owners else '' for k in keys)
        w(f'| {lid} {name} | {cells} | {tech} | {MATURITY[mat]["label"]} |')
w('')
w('Summary per container (number of L2 capabilities it contributes to):')
w('')
w('| Container | Capabilities |')
w('|---|---|')
for k in keys:
    n = sum(1 for c in CAPABILITIES for l2 in c['l2'] if k in l2[2])
    w(f'| {CONTAINERS[k]["name"]} | {n} |')
w('')
w('---')
w('')
w('## 3. ArchiMate Views')
w('')
w('ArchiMate 3.2 notation. Mermaid cannot draw ArchiMate symbols, so element types are written in the label («Business Actor»,')
w('«Application Component» …) and layers use the standard ArchiMate colours: strategy — beige, business — yellow, application — cyan,')
w('technology — green. The draw.io file uses the native ArchiMate 3 shape library and the `.archimate` file opens in Archi.')
w('')
w('### 3.1 Layered view (Business → Application → Technology)')
w('')
lines = ['flowchart BT']
lines.append('    subgraph business ["Business layer"]')
lines.append('        direction TB')
lines.append('        subgraph actors [" "]')
lines.append('            direction LR')
for aid, an in ACTORS:
    lines.append(f'            {aid}["«Business Actor»<br/><b>{esc(an)}</b>"]')
lines.append('        end')
lines.append('        subgraph bsvcs [" "]')
lines.append('            direction LR')
for sid, sn in BUSINESS_SERVICES:
    lines.append(f'            {sid}(["«Business Service»<br/><b>{esc(sn)}</b>"])')
lines.append('        end')
lines.append('    end')
lines.append('    subgraph application ["Application layer"]')
lines.append('        direction TB')
lines.append('        subgraph asvcs [" "]')
lines.append('            direction LR')
for sid, sn, comps in APP_SERVICES:
    lines.append(f'            {sid}(["«Application Service»<br/><b>{esc(sn)}</b>"])')
lines.append('        end')
lines.append('        subgraph comps [" "]')
lines.append('            direction LR')
for k, c in CONTAINERS.items():
    if k in ('LIB', 'OPS'):
        continue
    lines.append(f'            {k}["«Application Component»<br/><b>{esc(c["name"])}</b><br/>{esc(c["tech"])}"]')
lines.append('        end')
lines.append('    end')
lines.append('    subgraph technology ["Technology layer"]')
lines.append('        direction LR')
tlabel = {'node': 'Node', 'sysSw': 'System Software', 'artifact': 'Artifact'}
for nid, nn, nt in NODES:
    lines.append(f'        {nid}["«{tlabel[nt]}»<br/><b>{esc(nn)}</b>"]')
lines.append('    end')
for a, s in ACTOR_SERVICE:
    lines.append(f'    {s} -. serves .-> {a}')
for s, b in SERVICE_TO_BUSINESS:
    lines.append(f'    {s} -- realizes --> {b}')
for sid, sn, comps in APP_SERVICES:
    for k in comps:
        lines.append(f'    {k} -- realizes --> {sid}')
for k, nid in COMPONENT_TO_NODE:
    lines.append(f'    {nid} -. serves .-> {k}')
lines += [
    '    style business fill:#FFFFB5,stroke:#B5B500,color:#333',
    '    style application fill:#B5FFFF,stroke:#00B5B5,color:#333',
    '    style technology fill:#C9E7B7,stroke:#5A9E3A,color:#333',
    '    style actors fill:none,stroke:none', '    style bsvcs fill:none,stroke:none', '    style asvcs fill:none,stroke:none', '    style comps fill:none,stroke:none',
]
for aid, _ in ACTORS: lines.append(f'    style {aid} fill:#FFFF99,stroke:#B5B500,color:#333')
for sid, _ in BUSINESS_SERVICES: lines.append(f'    style {sid} fill:#FFFF99,stroke:#B5B500,color:#333')
for sid, _, _ in APP_SERVICES: lines.append(f'    style {sid} fill:#99FFFF,stroke:#00B5B5,color:#333')
for k in CONTAINERS:
    if k not in ('LIB', 'OPS'): lines.append(f'    style {k} fill:#99FFFF,stroke:#00B5B5,color:#333')
for nid, _, _ in NODES: lines.append(f'    style {nid} fill:#AFFFAF,stroke:#5A9E3A,color:#333')
w('```mermaid\n' + '\n'.join(lines) + '\n```')
w('')
w('### 3.2 Capability realization view (Strategy → Application)')
w('')
lines = ['flowchart LR']
lines.append('    subgraph strategy ["Strategy layer — Capabilities"]')
lines.append('        direction TB')
for c in CAPABILITIES:
    lines.append(f'        {c["id"]}["«Capability»<br/><b>{c["id"]} {esc(c["name"])}</b>"]')
lines.append('        ' + ' ~~~ '.join(c['id'] for c in CAPABILITIES))
lines.append('    end')
lines.append('    subgraph appsvc ["Application layer — Services"]')
lines.append('        direction TB')
for sid, sn, comps in APP_SERVICES:
    lines.append(f'        {sid}(["«Application Service»<br/><b>{esc(sn)}</b>"])')
lines.append('        ' + ' ~~~ '.join(s[0] for s in APP_SERVICES))
lines.append('    end')
lines.append('    subgraph appcomp ["Application layer — Components"]')
lines.append('        direction TB')
for k, c in CONTAINERS.items():
    if k in ('LIB', 'OPS'): continue
    lines.append(f'        {k}["«Application Component»<br/><b>{esc(c["name"])}</b>"]')
lines.append('        ' + ' ~~~ '.join(k for k in CONTAINERS if k not in ('LIB', 'OPS')))
lines.append('    end')
lines.append('    strategy ~~~ appsvc ~~~ appcomp')
for cid, svcs in CAP_TO_SERVICE.items():
    for s in svcs:
        lines.append(f'    {s} -- realizes --> {cid}')
for sid, sn, comps in APP_SERVICES:
    for k in comps:
        lines.append(f'    {k} -- realizes --> {sid}')
lines += ['    style strategy fill:#F5DEAA,stroke:#B5A15A,color:#333', '    style appsvc fill:#B5FFFF,stroke:#00B5B5,color:#333', '    style appcomp fill:#B5FFFF,stroke:#00B5B5,color:#333']
for c in CAPABILITIES: lines.append(f'    style {c["id"]} fill:#F5DEAA,stroke:#8B7A3A,color:#333')
for sid, _, _ in APP_SERVICES: lines.append(f'    style {sid} fill:#99FFFF,stroke:#00B5B5,color:#333')
for k in CONTAINERS:
    if k not in ('LIB', 'OPS'): lines.append(f'    style {k} fill:#99FFFF,stroke:#00B5B5,color:#333')
w('```mermaid\n' + '\n'.join(lines) + '\n```')
w('')
w('C9 Platform Operations is realized by technology-layer elements (Kubernetes, Helm, PostgreSQL, Olric, Prometheus) rather than by an')
w('application service, which is why it has no incoming realization from the application layer.')
w('')
w('### 3.3 Element catalogue')
w('')
w('| Layer | Type | Element | Notes |')
w('|---|---|---|---|')
for aid, an in ACTORS: w(f'| Business | Business Actor | {an} | |')
for sid, sn in BUSINESS_SERVICES: w(f'| Business | Business Service | {sn} | used by ' + ', '.join(dict(ACTORS)[a] for a, s in ACTOR_SERVICE if s == sid) + ' |')
for pid, pn, bs in BUSINESS_PROCESSES: w(f'| Business | Business Process | {pn} | realizes {dict(BUSINESS_SERVICES)[bs]} |')
for c in CAPABILITIES: w(f'| Strategy | Capability | {c["id"]} {c["name"]} | realized by ' + (', '.join(dict((s[0], s[1]) for s in APP_SERVICES)[s] for s in CAP_TO_SERVICE[c['id']]) or 'technology layer') + ' |')
for sid, sn, comps in APP_SERVICES: w(f'| Application | Application Service | {sn} | realized by ' + ', '.join(CONTAINERS[k]['name'] for k in comps) + ' |')
for k, c in CONTAINERS.items():
    if k in ('LIB', 'OPS'): continue
    w(f'| Application | Application Component | {c["name"]} | {c["tech"]} |')
for nid, nn, nt in NODES: w(f'| Technology | {tlabel[nt]} | {nn} | serves ' + ', '.join(CONTAINERS[k]['name'] for k, n2 in COMPONENT_TO_NODE if n2 == nid) + ' |')
w('')
w('Relationship types used: **serving** (actor ← business service; technology → application component), **realization**')
w('(application component → application service → business service; application service → capability), **assignment** (implicit:')
w('components deployed on nodes, modelled as serving for readability).')
w('')
w('---')
w('')
w('## Appendix — Method notes')
w('')
w('- **Capability map** follows the TOGAF / Business Architecture Guild convention: stable "what" statements, three tiers, two levels of')
w('  decomposition. Level 3 would be the individual features from `documents/overall/feature-list.md`.')
w('- **Heatmaps** are overlays on the same map. The technology overlay maps each L2 capability to the C4 containers that implement it')
w('  (`diagrams/c4-2026-09/`), which makes the capability map the bridge between business and C4 views.')
w('- **ArchiMate** views use the layered viewpoint and the capability realization viewpoint. Application components are the C4')
w('  containers; application services are the externally observable behaviour of those components. The `.archimate` file contains the')
w('  same elements, relationships and both views for editing in Archi.')
w('- All names, technologies and endpoints were verified against the code on 2026-09-11 (see `diagrams/c4-2026-09/APIHUB_C4_architecture.md`,')
w('  Appendix C).')

open('APIHUB_capability_architecture.md', 'w').write('\n'.join(out) + '\n')
print('written', len(out), 'lines')
