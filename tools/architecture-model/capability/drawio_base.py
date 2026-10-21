#!/usr/bin/env python3
"""Generate APIHUB C4 draw.io file (multi-page) with a simple grid layout engine."""
from xml.sax.saxutils import escape
import uuid

# ---------- palette ----------
C = {
    'person':   ('#7c3aed', '#5b21b6', '#ffffff'),
    'system':   ('#1e3a8a', '#0f172a', '#ffffff'),
    'core':     ('#2563eb', '#1e40af', '#ffffff'),
    'ext_svc':  ('#16a34a', '#15803d', '#ffffff'),
    'planned':  ('#d97706', '#92400e', '#ffffff'),
    'agent':    ('#f97316', '#c2410c', '#ffffff'),
    'runner':   ('#fdba74', '#f97316', '#1f2937'),
    'store':    ('#475569', '#334155', '#ffffff'),
    'external': ('#6b7280', '#374151', '#ffffff'),
    'comp':     ('#3b82f6', '#1e40af', '#ffffff'),
    'comp_g':   ('#22c55e', '#15803d', '#ffffff'),
    'comp_o':   ('#fb923c', '#c2410c', '#ffffff'),
    'comp_a':   ('#f59e0b', '#92400e', '#ffffff'),
    'sec':      ('#dc2626', '#991b1b', '#ffffff'),
    'ai':       ('#7c3aed', '#5b21b6', '#ffffff'),
    'lib':      ('#0d9488', '#0f766e', '#ffffff'),
    'gray':     ('#64748b', '#334155', '#ffffff'),
    'l0':       ('#1e293b', '#0f172a', '#ffffff'),
    'l1':       ('#0891b2', '#0e7490', '#ffffff'),
    'l3':       ('#7c3aed', '#5b21b6', '#ffffff'),
    'l5':       ('#dc2626', '#991b1b', '#ffffff'),
    'k8s_svc':  ('#fed7aa', '#f97316', '#1f2937'),
}
GROUP_C = {
    'blue':   ('#eff6ff', '#2563eb', '#1e3a5f'),
    'lblue':  ('#dbeafe', '#93c5fd', '#1e3a5f'),
    'green':  ('#f0fdf4', '#16a34a', '#14532d'),
    'lgreen': ('#dcfce7', '#86efac', '#14532d'),
    'orange': ('#fff7ed', '#f97316', '#7c2d12'),
    'lorange':('#ffedd5', '#fdba74', '#7c2d12'),
    'amber':  ('#fffbeb', '#d97706', '#78350f'),
    'red':    ('#fef2f2', '#fca5a5', '#7f1d1d'),
    'purple': ('#f5f3ff', '#c4b5fd', '#4c1d95'),
    'slate':  ('#f1f5f9', '#94a3b8', '#1e293b'),
    'teal':   ('#f0fdfa', '#5eead4', '#134e4a'),
}

NW, NH, GAP = 210, 110, 30  # node width/height and gap
class Page:
    def __init__(self, name):
        self.name = name
        self.cells = []
        self.n = 0
        self.ids = {}

    def _id(self, key=None):
        self.n += 1
        i = f'c{self.n}'
        if key:
            self.ids[key] = i
        return i

    def text(self, x, y, w, h, html, size=11, bold=False, align='left', color='#334155'):
        i = self._id()
        style = (f'text;html=1;whiteSpace=wrap;align={align};verticalAlign=top;fontSize={size};'
                 f'fontStyle={1 if bold else 0};fontColor={color};strokeColor=none;fillColor=none;')
        self.cells.append(f'<mxCell id="{i}" value="{escape(html, {chr(34): "&quot;"})}" style="{style}" vertex="1" parent="1">'
                          f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>')
        return i

    def group(self, x, y, w, h, title, color='blue', dashed=True):
        i = self._id()
        fill, stroke, font = GROUP_C[color]
        style = (f'rounded=1;whiteSpace=wrap;html=1;fillColor={fill};strokeColor={stroke};strokeWidth=2;'
                 f'dashed={1 if dashed else 0};dashPattern=6 4;verticalAlign=top;align=left;spacingLeft=10;'
                 f'fontStyle=1;fontSize=12;fontColor={font};arcSize=4;')
        self.cells.append(f'<mxCell id="{i}" value="{escape(title)}" style="{style}" vertex="1" parent="1">'
                          f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>')
        return i

    def node(self, key, x, y, name, typ=None, desc=None, kind='comp', w=NW, h=NH, shape='box', dashed=False):
        i = self._id(key)
        fill, stroke, font = C[kind]
        if shape == 'person':
            style = (f'html=1;whiteSpace=wrap;metaEdit=1;resizable=0;shape=mxgraph.c4.person;'
                     f'fillColor={fill};strokeColor={stroke};fontColor={font};fontSize=11;')
            h = max(h, 120)
        elif shape == 'cylinder':
            style = (f'shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=15;'
                     f'fillColor={fill};strokeColor={stroke};fontColor={font};fontSize=11;')
        elif shape == 'system':
            style = (f'rounded=1;whiteSpace=wrap;html=1;fillColor={fill};strokeColor={stroke};strokeWidth=3;'
                     f'fontColor={font};fontSize=12;arcSize=8;')
        else:
            style = (f'rounded=1;whiteSpace=wrap;html=1;fillColor={fill};strokeColor={stroke};strokeWidth=1.5;'
                     f'fontColor={font};fontSize=11;arcSize=6;')
        if dashed:
            style += 'dashed=1;dashPattern=6 4;'
        value = lbl(name, typ, desc, big=(shape == 'system'))
        self.cells.append(f'<mxCell id="{i}" value="{escape(value, {chr(34): "&quot;"})}" style="{style}" vertex="1" parent="1">'
                          f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>')
        return i

    def edge(self, src, dst, label='', kind='normal', exit=None, entry=None):
        i = self._id()
        s, d = self.ids[src], self.ids[dst]
        base = ('edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;'
                'fontSize=9;labelBackgroundColor=#ffffff;endArrow=blockThin;endFill=1;')
        if kind == 'primary':
            base += 'strokeWidth=2.5;strokeColor=#1f2937;'
        elif kind == 'dashed':
            base += 'strokeWidth=1.2;strokeColor=#6b7280;dashed=1;'
        elif kind == 'both':
            base += 'strokeWidth=2;strokeColor=#1f2937;startArrow=blockThin;startFill=1;'
        else:
            base += 'strokeWidth=1.2;strokeColor=#374151;'
        if exit:
            base += f'exitX={exit[0]};exitY={exit[1]};exitDx=0;exitDy=0;'
        if entry:
            base += f'entryX={entry[0]};entryY={entry[1]};entryDx=0;entryDy=0;'
        self.cells.append(f'<mxCell id="{i}" value="{escape(label, {chr(34): "&quot;"})}" style="{base}" edge="1" parent="1" source="{s}" target="{d}">'
                          f'<mxGeometry relative="1" as="geometry"/></mxCell>')
        return i

    def grid(self, x, y, cols, items, kind='comp', w=NW, h=NH):
        """items: list of (key, name, typ, desc[, kind]) laid out in a grid; returns (width, height)."""
        for idx, it in enumerate(items):
            r, c = divmod(idx, cols)
            k = it[4] if len(it) > 4 else kind
            self.node(it[0], x + c * (w + GAP), y + r * (h + GAP), it[1], it[2], it[3], kind=k, w=w, h=h)
        rows = (len(items) + cols - 1) // cols
        return cols * (w + GAP) - GAP, rows * (h + GAP) - GAP

    def boxed(self, x, y, title, cols, items, color='blue', kind='comp', w=NW, h=NH, pad=20, top=34):
        gw, gh = cols * (w + GAP) - GAP, ((len(items) + cols - 1) // cols) * (h + GAP) - GAP
        self.group(x, y, gw + 2 * pad, gh + top + pad, title, color)
        self.grid(x + pad, y + top, cols, items, kind, w, h)
        return gw + 2 * pad, gh + top + pad

    def xml(self):
        did = uuid.uuid4().hex[:8]
        return (f'<diagram id="{did}" name="{escape(self.name)}"><mxGraphModel dx="1400" dy="900" grid="1" gridSize="10" '
                f'guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1654" '
                f'pageHeight="1169" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>'
                + ''.join(self.cells) + '</root></mxGraphModel></diagram>')


pages = []
