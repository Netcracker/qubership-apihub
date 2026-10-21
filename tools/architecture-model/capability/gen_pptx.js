const pptxgen = require('pptxgenjs');
const fs = require('fs');
const M = JSON.parse(fs.readFileSync('model.json', 'utf8'));
const sizeOf = (p) => { const b = fs.readFileSync(p); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.title = 'Qubership APIHUB — Capability Map, Heatmaps, ArchiMate';
const NAVY = '0F1F3D', INK = '1E293B', MUTED = '64748B', LIGHT = 'F1F5F9', WHITE = 'FFFFFF', ICE = 'DBEAFE';
const FONT = 'Calibri', HFONT = 'Cambria';
const TIER = { core: ['DBEAFE', '1E40AF'], differentiating: ['EDE9FE', '5B21B6'], supporting: ['F1F5F9', '334155'] };
let n = 0;
function base(s, dark) { s.background = { color: dark ? NAVY : WHITE }; }
function title(s, t, sub, dark) {
  s.addText(t, { x: 0.5, y: 0.3, w: 12.3, h: 0.7, fontFace: HFONT, fontSize: 28, bold: true, color: dark ? WHITE : NAVY, isTextBox: true, margin: 0 });
  if (sub) s.addText(sub, { x: 0.5, y: 0.95, w: 12.3, h: 0.35, fontFace: FONT, fontSize: 12, color: dark ? ICE : MUTED, isTextBox: true, margin: 0 });
}
function footer(s, dark) {
  n++;
  s.addText('Qubership APIHUB · Capability map, heatmaps, ArchiMate · 2026-09', { x: 0.5, y: 7.05, w: 8, h: 0.3, fontFace: FONT, fontSize: 9, color: dark ? ICE : MUTED, isTextBox: true, margin: 0 });
  s.addText(String(n), { x: 12.3, y: 7.05, w: 0.5, h: 0.3, fontFace: FONT, fontSize: 9, color: dark ? ICE : MUTED, align: 'right', isTextBox: true, margin: 0 });
}
function rr(s, x, y, w, h, fill, line, radius = 0.06) {
  s.addShape(pres.ShapeType.roundRect, { x, y, w, h, fill: { color: fill }, line: { color: line, width: 0.75 }, rectRadius: radius });
}
function txt(s, t, x, y, w, h, o = {}) {
  s.addText(t, Object.assign({ x, y, w, h, fontFace: FONT, fontSize: 11, color: INK, isTextBox: true, margin: 0, valign: 'top' }, o));
}
function fitImage(s, path, x, y, maxW, maxH) {
  const { w, h } = sizeOf(path); let iw = maxW, ih = maxW * h / w; if (ih > maxH) { ih = maxH; iw = maxH * w / h; }
  s.addImage({ path, x: x + (maxW - iw) / 2, y: y + (maxH - ih) / 2, w: iw, h: ih });
}
function section(t, sub) { const s = pres.addSlide(); base(s, true); txt(s, sub, 0.8, 2.6, 11, 0.5, { fontSize: 18, color: 'A5B4FC' }); txt(s, t, 0.8, 3.1, 11.5, 1, { fontFace: HFONT, fontSize: 44, bold: true, color: WHITE }); footer(s, true); }

// grid of capability cells; mode: plain | tech | maturity
function capGrid(s, mode) {
  const caps = M.CAPABILITIES, cols = caps.length, x0 = 0.4, y0 = 1.45, usable = 12.53, gap = 0.08;
  const cw = (usable - gap * (cols - 1)) / cols, hh = 0.45, ch = mode === 'tech' ? 0.52 : 0.47, rg = 0.05;
  caps.forEach((c, i) => {
    const x = x0 + i * (cw + gap);
    const [f, st] = TIER[c.tier];
    rr(s, x, y0, cw, hh, f, st, 0.04);
    txt(s, [{ text: c.id + ' ', options: { bold: true } }, { text: c.name }], x + 0.05, y0 + 0.04, cw - 0.1, hh - 0.08, { fontSize: 7.5, color: st, valign: 'middle', align: 'center' });
    c.l2.forEach((l2, r) => {
      const [lid, name, owners, tech, mat] = l2;
      const y = y0 + hh + 0.08 + r * (ch + rg);
      let fill = 'EFF6FF', line = '2563EB', color = '1E3A5F', sub = null;
      if (mode === 'tech') { fill = owners.length ? M.CONTAINERS[owners[0]].color : '94A3B8'; line = '1E293B'; color = WHITE; sub = (owners.map(o => M.CONTAINERS[o].name).join(' + ') || 'design only'); }
      if (mode === 'maturity') { const m = M.MATURITY[mat]; fill = m.fill; line = m.color; color = m.color; sub = m.label; }
      rr(s, x, y, cw, ch, fill, line, 0.04);
      const runs = [{ text: lid + ' ', options: { bold: true } }, { text: name }];
      if (sub) runs.push({ text: '\n' + sub, options: { italic: true, fontSize: 6 } });
      txt(s, runs, x + 0.04, y + 0.03, cw - 0.08, ch - 0.06, { fontSize: 6.5, color, valign: 'middle', align: 'center' });
    });
  });
}

// ---------- title
{ const s = pres.addSlide(); base(s, true);
  txt(s, 'Qubership APIHUB', 0.8, 1.9, 11.5, 1, { fontFace: HFONT, fontSize: 46, bold: true, color: WHITE });
  txt(s, 'Business Capability Map · Capability Heatmaps · ArchiMate views', 0.8, 2.95, 11.5, 0.6, { fontSize: 20, color: ICE });
  txt(s, 'Enterprise-architecture companion to the C4 set (tools/architecture-model/c4) · generated 2026-09-11 from the APIHUB monorepo', 0.8, 3.65, 11.5, 0.5, { fontSize: 13, color: 'A5B4FC' });
  footer(s, true); }
// ---------- what & why
{ const s = pres.addSlide(); base(s); title(s, 'Three views, one model', 'Same 9 capabilities and 60 sub-capabilities feed every diagram in this deck'); footer(s);
  const cards = [
    ['Business Capability Map', 'What APIHUB does, stated independently of implementation. Level 1: nine capabilities in three tiers (core, differentiating, supporting). Level 2: 60 sub-capabilities.', '1E40AF'],
    ['Capability Heatmaps', 'The same map with one extra dimension per view: which container and technology implements each capability, and how mature it is. The data behind both is a single application-to-capability matrix.', '5B21B6'],
    ['ArchiMate 3.2 views', 'Layered view (business actors and services → application services and components → technology nodes) and capability realization view. Native ArchiMate shapes in draw.io, plus an Archi model file.', '166534'],
  ];
  cards.forEach(([h, d, c], i) => { const x = 0.5 + i * 4.2; rr(s, x, 1.6, 3.9, 4.6, LIGHT, LIGHT, 0.12);
    s.addShape(pres.ShapeType.ellipse, { x: x + 0.3, y: 1.9, w: 0.5, h: 0.5, fill: { color: c }, line: { color: c } });
    txt(s, String(i + 1), x + 0.3, 1.9, 0.5, 0.5, { fontSize: 14, bold: true, color: WHITE, align: 'center', valign: 'middle' });
    txt(s, h, x + 0.3, 2.6, 3.3, 0.5, { fontFace: HFONT, fontSize: 18, bold: true, color: NAVY });
    txt(s, d, x + 0.3, 3.2, 3.3, 2.8, { fontSize: 12.5 }); });
}
// ---------- capability map
section('Business Capability Map', '1');
{ const s = pres.addSlide(); base(s); title(s, 'Capability map — Level 1', 'Nine capabilities in three tiers'); footer(s);
  let y = 1.5;
  Object.entries(M.TIERS).forEach(([t, label]) => {
    const caps = M.CAPABILITIES.filter(c => c.tier === t); const [f, st] = TIER[t];
    rr(s, 0.5, y, 12.3, 1.7, f, st, 0.08);
    txt(s, label, 0.65, y + 0.08, 4, 0.3, { fontSize: 11, bold: true, color: st });
    caps.forEach((c, i) => { const x = 0.7 + i * 2.0; rr(s, x, y + 0.42, 1.9, 1.15, WHITE, st, 0.06);
      txt(s, [{ text: c.id + ' ' + c.name, options: { bold: true, fontSize: 10 } }, { text: '\n' + c.desc, options: { fontSize: 8, color: MUTED } }, { text: '\n' + c.l2.length + ' sub-capabilities', options: { fontSize: 8, italic: true, color: st } }], x + 0.08, y + 0.48, 1.74, 1.05, { fontSize: 9, valign: 'top' }); });
    y += 1.82;
  });
}
{ const s = pres.addSlide(); base(s); title(s, 'Capability map — Level 2', 'All 60 sub-capabilities (editable shapes)'); footer(s); capGrid(s, 'plain'); }
// ---------- heatmaps
section('Capability Heatmaps', '2');
{ const s = pres.addSlide(); base(s); title(s, 'Heatmap — technology & ownership overlay', 'Colour = container owning the capability; caption = all contributing containers'); footer(s); capGrid(s, 'tech');
  const ks = Object.keys(M.CONTAINERS); ks.forEach((k, i) => { const c = M.CONTAINERS[k]; const x = 0.4 + (i % 5) * 2.5, y = 6.42 + Math.floor(i / 5) * 0.3; rr(s, x, y, 0.25, 0.22, c.color, c.color, 0.03); txt(s, c.name + ' — ' + c.tech, x + 0.32, y, 2.15, 0.24, { fontSize: 6.5, valign: 'middle' }); });
}
{ const s = pres.addSlide(); base(s); title(s, 'Heatmap — maturity', 'Assessment from code evidence (deprecated paths, "pending" markers, release history, test coverage)'); footer(s); capGrid(s, 'maturity');
  Object.values(M.MATURITY).forEach((m, i) => { const x = 0.4 + i * 3.15; rr(s, x, 6.45, 0.25, 0.22, m.fill, m.color, 0.03); txt(s, m.label + ' — ' + m.text, x + 0.32, 6.4, 2.75, 0.5, { fontSize: 6.5 }); });
}
function techTable(ids, sub) {
  const s = pres.addSlide(); base(s); title(s, 'Heatmap — technology stack per capability', sub); footer(s);
  const rows = [['Capability', 'Owners', 'Technology / components', 'Maturity'].map(t => ({ text: t, options: { bold: true, color: WHITE, fill: { color: NAVY }, fontSize: 9 } }))];
  let i = 0;
  M.CAPABILITIES.filter(c => ids.includes(c.id)).forEach(c => {
    rows.push([{ text: c.id + ' ' + c.name, options: { bold: true, colspan: 4, fill: { color: 'E2E8F0' }, fontSize: 8.5 } }]);
    c.l2.forEach(([lid, name, owners, tech, mat]) => { const f = i++ % 2 ? WHITE : LIGHT; rows.push([{ text: lid + ' ' + name, options: { fill: { color: f }, fontSize: 8 } }, { text: owners.map(o => M.CONTAINERS[o].name).join(', ') || 'design only', options: { fill: { color: f }, fontSize: 8 } }, { text: tech, options: { fill: { color: f }, fontSize: 8 } }, { text: M.MATURITY[mat].label, options: { fill: { color: M.MATURITY[mat].fill }, color: M.MATURITY[mat].color, fontSize: 8 } }]); });
  });
  s.addTable(rows, { x: 0.4, y: 1.4, w: 12.5, colW: [3.0, 2.6, 5.6, 1.3], border: { type: 'solid', color: 'E2E8F0', pt: 0.5 }, fontFace: FONT, rowH: 0.165, autoPage: false });
}
techTable(['C1', 'C2', 'C3'], 'Catalog, publishing & build, change management');
techTable(['C4', 'C5', 'C6'], 'Documentation & consumption, quality & governance, discovery');
techTable(['C7', 'C8', 'C9'], 'AI & ecosystem, identity & access, platform operations');
{ const s = pres.addSlide(); base(s); title(s, 'Heatmap — coverage per container', 'How many sub-capabilities each container contributes to'); footer(s);
  const ks = Object.keys(M.CONTAINERS);
  const counts = ks.map(k => M.CAPABILITIES.reduce((a, c) => a + c.l2.filter(l => l[2].includes(k)).length, 0));
  s.addChart(pres.ChartType.bar, [{ name: 'Sub-capabilities', labels: ks.map(k => M.CONTAINERS[k].name), values: counts }], {
    x: 0.5, y: 1.5, w: 7.5, h: 5.2, barDir: 'bar', chartColors: ks.map(k => M.CONTAINERS[k].color), showValue: true, dataLabelPosition: 'outEnd', dataLabelFontSize: 10,
    catAxisLabelColor: INK, valAxisLabelColor: MUTED, valGridLine: { color: 'E2E8F0', size: 0.5 }, catGridLine: { style: 'none' }, showLegend: false, showTitle: false, catAxisLabelFontSize: 10, valAxisLabelFontSize: 9,
  });
  const mk = Object.keys(M.MATURITY); const mc = mk.map(m => M.CAPABILITIES.reduce((a, c) => a + c.l2.filter(l => l[4] === m).length, 0));
  s.addChart(pres.ChartType.doughnut, [{ name: 'Maturity', labels: mk.map(m => M.MATURITY[m].label), values: mc }], {
    x: 8.3, y: 1.5, w: 4.6, h: 4.0, chartColors: mk.map(m => M.MATURITY[m].fill), showPercent: false, showValue: true, dataLabelFontSize: 10, dataLabelColor: INK, holeSize: 55, showLegend: true, legendPos: 'b', legendFontSize: 9, showTitle: true, title: 'Maturity of 60 sub-capabilities', titleFontSize: 11, titleColor: NAVY,
  });
  txt(s, 'Backend and UI touch most capabilities — the "micro-monolith" nature of APIHUB shows here. The TS library stack is the second shared asset; the Linter and Agents services are cleanly scoped extensions.', 8.3, 5.7, 4.6, 1.2, { fontSize: 10.5, color: MUTED });
}
// ---------- ArchiMate
section('ArchiMate 3.2 views', '3');
{ const s = pres.addSlide(); base(s); title(s, 'Layered view — Business → Application → Technology', 'Serving and realization relationships; application components are the C4 containers'); footer(s);
  fitImage(s, 'png_slides/A1_layered.png', 0.4, 1.4, 12.5, 4.3);
  const legend = [['FFFF99', 'Business layer: actors, services'], ['99FFFF', 'Application layer: services, components'], ['AFFFAF', 'Technology layer: nodes, system software, artifacts'], ['F5DEAA', 'Strategy layer: capabilities (next slide)']];
  legend.forEach(([c, t], i) => { const x = 0.5 + i * 3.15; rr(s, x, 6.0, 0.3, 0.25, c, '666666', 0.03); txt(s, t, x + 0.4, 5.98, 2.7, 0.5, { fontSize: 9 }); });
  txt(s, 'Draw.io file uses the native ArchiMate 3 shape library; APIHUB_capability_model.archimate opens in Archi with the same elements, 221 relationships and 5 views.', 0.5, 6.5, 12.3, 0.4, { fontSize: 9, color: MUTED });
}
{ const s = pres.addSlide(); base(s); title(s, 'Capability realization view — Strategy → Application', 'Which application services and components realize each capability'); footer(s);
  fitImage(s, 'png_slides/A2_realization.png', 0.4, 1.4, 8.4, 5.5);
  rr(s, 9.0, 1.4, 3.9, 5.5, LIGHT, LIGHT, 0.1);
  const items = M.CAPABILITIES.map(c => ({ text: c.id + ' ' + c.name + ' ← ' + ((M.CAP_TO_SERVICE[c.id].map(sid => M.APP_SERVICES.find(a => a[0] === sid)[1]).join(', ')) || 'technology layer'), options: { bullet: true, breakLine: true, paraSpaceAfter: 4 } }));
  txt(s, 'Realization', 9.2, 1.55, 3.5, 0.35, { fontFace: HFONT, fontSize: 14, bold: true, color: NAVY });
  s.addText(items, { x: 9.2, y: 1.95, w: 3.5, h: 4.8, fontFace: FONT, fontSize: 9, color: INK, valign: 'top', isTextBox: true, margin: 0 });
}
{ const s = pres.addSlide(); base(s); title(s, 'ArchiMate element catalogue', 'Elements used in both views'); footer(s);
  const hdr = ['Layer', 'Type', 'Element', 'Relationships'].map(t => ({ text: t, options: { bold: true, color: WHITE, fill: { color: NAVY }, fontSize: 8 } }));
  const rows = [hdr]; let i = 0; const cell = (t, f) => ({ text: t, options: { fill: { color: f }, fontSize: 7 } });
  const push = (layer, type, name, r, fill) => { const f = i++ % 2 ? WHITE : LIGHT; rows.push([cell(layer, fill || f), cell(type, f), cell(name, f), cell(r, f)]); };
  M.ACTORS.forEach(([a, nm]) => push('Business', 'Business Actor', nm, 'served by ' + M.ACTOR_SERVICE.filter(x => x[0] === a).map(x => M.BUSINESS_SERVICES.find(b => b[0] === x[1])[1]).join(', '), 'FFFFB5'));
  M.BUSINESS_SERVICES.forEach(([b, nm]) => push('Business', 'Business Service', nm, 'realized by application services', 'FFFFB5'));
  M.APP_SERVICES.forEach(([sid, nm, comps]) => push('Application', 'Application Service', nm, 'realized by ' + comps.map(k => M.CONTAINERS[k].name).join(', '), 'B5FFFF'));
  Object.entries(M.CONTAINERS).filter(([k]) => !['LIB', 'OPS'].includes(k)).forEach(([k, c]) => push('Application', 'Application Component', c.name, c.tech, 'B5FFFF'));
  M.NODES.forEach(([nid, nm, t]) => push('Technology', { node: 'Node', sysSw: 'System Software', artifact: 'Artifact' }[t], nm, 'serves ' + M.COMPONENT_TO_NODE.filter(x => x[1] === nid).map(x => M.CONTAINERS[x[0]].name).join(', '), 'C9E7B7'));
  s.addTable(rows, { x: 0.4, y: 1.4, w: 12.5, colW: [1.2, 1.9, 3.4, 6.0], border: { type: 'solid', color: 'E2E8F0', pt: 0.5 }, fontFace: FONT, rowH: 0.14, autoPage: false });
}
// ---------- closing
{ const s = pres.addSlide(); base(s, true); txt(s, 'Companion artefacts', 0.8, 1.6, 11.5, 0.8, { fontFace: HFONT, fontSize: 36, bold: true, color: WHITE });
  s.addText(['APIHUB_capability_architecture.md — capability map, both heatmaps, application-to-capability matrix, ArchiMate views (Mermaid)',
    'APIHUB_capability_architecture.drawio — 7 editable pages, ArchiMate pages use the native ArchiMate 3 shape library',
    'APIHUB_capability_model.archimate — Archi model: 111 elements, 221 relationships, 5 views (layered, realization, capability map, two heatmaps)',
    'APIHUB_capability_architecture.pptx — this deck; model.py / model.json is the single source of truth for regeneration',
    'Folder: tools/architecture-model/capability/; C4 set in tools/architecture-model/c4/'].map((t, i, a) => ({ text: t, options: { bullet: true, breakLine: i < a.length - 1, paraSpaceAfter: 8 } })),
    { x: 0.8, y: 2.6, w: 11.5, h: 3.5, fontFace: FONT, fontSize: 15, color: ICE, isTextBox: true, margin: 0, valign: 'top' });
  footer(s, true); }

pres.writeFile({ fileName: 'APIHUB_capability_architecture.pptx' }).then(() => console.log('slides', n));
