const pptxgen = require('pptxgenjs');
const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';                       // 13.33 x 7.5
pres.title = 'Qubership APIHUB — Visual Summary';
pres.author = 'APIHUB architecture';

/* ---------------------------------------------------------------- palette */
const BG = 'FDF9F3', INK = '20222E', SOFT = '6E6759', LINE = 'E4DACB';
const CORAL = 'E8674C', MUSTARD = 'EFAE35', TEAL = '2E9E96', INDIGO = '5B5BD6',
      BLUE = '2F6BE4', LEAF = '5AA45A', PLUM = 'B4507E', CLAY = 'C2703D';
const BLUSH = 'FBDDD4', BUTTER = 'FBEBC8', MINT = 'D6EDE6', LILAC = 'E2E0FA',
      SKY = 'DCE7FB', SAND = 'F2E8DA';
const H = 'Calibri', A = 'Cambria';

let n = 0;
const S = (bg) => { const s = pres.addSlide(); s.background = { color: bg || BG }; return s; };

function T(s, text, x, y, w, h, o = {}) {
  s.addText(text, Object.assign({ x, y, w, h, fontFace: H, fontSize: 14, color: INK,
    isTextBox: true, margin: 0, valign: 'top' }, o));
}
function box(s, x, y, w, h, fill, o = {}) {
  s.addShape(pres.ShapeType.roundRect, Object.assign({ x, y, w, h,
    fill: { color: fill }, line: { color: o.line || fill, width: o.lw || 1 },
    rectRadius: o.r === undefined ? 0.14 : o.r }, o.extra || {}));
}
function circle(s, x, y, d, fill, line) {
  s.addShape(pres.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color: fill },
    line: { color: line || fill, width: 1 } });
}
function ring(s, x, y, d, color, thick) {
  s.addShape(pres.ShapeType.donut, { x, y, w: d, h: d, fill: { color }, line: { color }, shapeName: 'ring' });
}
function bar(s, x, y, w, h, fill) {
  s.addShape(pres.ShapeType.roundRect, { x, y, w, h, fill: { color: fill }, line: { color: fill }, rectRadius: 0.5 });
}
function foot(s, dark) {
  n++;
  T(s, 'Qubership APIHUB · visual summary · September 2026', 0.7, 6.95, 7, 0.3,
    { fontSize: 9, color: dark ? 'A9A296' : SOFT });
  T(s, String(n), 12.1, 6.95, 0.5, 0.3, { fontSize: 9, color: dark ? 'A9A296' : SOFT, align: 'right' });
}
function head(s, kicker, title, sub, color) {
  if (kicker) T(s, kicker.toUpperCase(), 0.7, 0.55, 11.9, 0.3,
    { fontSize: 11, bold: true, color: color || CORAL, charSpacing: 2 });
  T(s, title, 0.7, 0.92, 11.9, 0.85, { fontSize: 34, bold: true, color: INK });
  if (sub) T(s, sub, 0.7, 1.78, 11.4, 0.45, { fontSize: 14, color: SOFT });
}

/* ---------------------------------------------------------------- icons */
function iPerson(s, x, y, d, color) {           // head + shoulders
  circle(s, x + d * 0.28, y, d * 0.44, color);
  s.addShape(pres.ShapeType.roundRect, { x, y: y + d * 0.52, w: d, h: d * 0.48,
    fill: { color }, line: { color }, rectRadius: 0.45 });
}
function iServer(s, x, y, w, color) {
  for (let i = 0; i < 3; i++) {
    s.addShape(pres.ShapeType.roundRect, { x, y: y + i * (w * 0.28), w, h: w * 0.2,
      fill: { color }, line: { color }, rectRadius: 0.3 });
    circle(s, x + w * 0.08, y + i * (w * 0.28) + w * 0.06, w * 0.08, BG);
  }
}
function iDoc(s, x, y, w, color) {
  s.addShape(pres.ShapeType.roundRect, { x, y, w, h: w * 1.25, fill: { color }, line: { color }, rectRadius: 0.1 });
  for (let i = 0; i < 3; i++) bar(s, x + w * 0.18, y + w * (0.28 + i * 0.28), w * (i === 2 ? 0.4 : 0.64), w * 0.1, BG);
}
function iSearch(s, x, y, d, color) {
  s.addShape(pres.ShapeType.donut, { x, y, w: d * 0.78, h: d * 0.78, fill: { color }, line: { color } });
  s.addShape(pres.ShapeType.roundRect, { x: x + d * 0.62, y: y + d * 0.62, w: d * 0.38, h: d * 0.14,
    fill: { color }, line: { color }, rectRadius: 0.5, rotate: 45 });
}
function iSpark(s, x, y, d, color) {
  s.addShape(pres.ShapeType.star4, { x, y, w: d, h: d, fill: { color }, line: { color } });
}
function iGear(s, x, y, d, color) {
  s.addShape(pres.ShapeType.donut, { x, y, w: d, h: d, fill: { color }, line: { color } });
  [[0.5, -0.08], [0.5, 0.86], [-0.08, 0.5], [0.86, 0.5]].forEach(([a, b]) =>
    circle(s, x + d * a - d * 0.11, y + d * b - d * 0.11, d * 0.22, color));
}
function iShield(s, x, y, d, color) {
  s.addShape(pres.ShapeType.roundRect, { x, y, w: d * 0.8, h: d * 0.62, fill: { color }, line: { color }, rectRadius: 0.2 });
  s.addShape(pres.ShapeType.triangle, { x, y: y + d * 0.5, w: d * 0.8, h: d * 0.42,
    fill: { color }, line: { color }, rotate: 180 });
}
function iCluster(s, x, y, w, h, color, dots, dotColor) {
  s.addShape(pres.ShapeType.roundRect, { x, y, w, h, fill: { color: 'FFFFFF' },
    line: { color, width: 1.5, dashType: 'dash' }, rectRadius: 0.1 });
  for (let i = 0; i < dots; i++) {
    const c = i % 3, r = Math.floor(i / 3);
    circle(s, x + 0.22 + c * 0.42, y + 0.28 + r * 0.42, 0.26, dotColor);
  }
}

/* ================================================================ 1 cover */
{
  const s = S();
  box(s, 8.35, 0.5, 4.5, 6.5, CORAL, { r: 0.22 });
  // abstract hub illustration inside the panel
  const cx = 10.6, cy = 3.75;
  const sats = [[0, -1.55], [1.35, -0.78], [1.35, 0.78], [0, 1.55], [-1.35, 0.78], [-1.35, -0.78]];
  sats.forEach(([dx, dy]) => {
    s.addShape(pres.ShapeType.line, { x: Math.min(cx, cx + dx), y: Math.min(cy, cy + dy),
      w: Math.abs(dx) || 0.001, h: Math.abs(dy) || 0.001,
      line: { color: 'F6B9AB', width: 1.5 }, flipH: dx < 0, flipV: dy < 0 });
  });
  sats.forEach(([dx, dy], i) => circle(s, cx + dx - 0.26, cy + dy - 0.26, 0.52,
    [BUTTER, MINT, SKY, LILAC, BUTTER, MINT][i]));
  circle(s, cx - 0.62, cy - 0.62, 1.24, 'FFFFFF');
  T(s, 'API', cx - 0.62, cy - 0.24, 1.24, 0.5, { fontSize: 18, bold: true, color: CORAL, align: 'center' });

  T(s, 'ARCHITECTURE SUMMARY', 0.85, 1.5, 7, 0.3, { fontSize: 12, bold: true, color: CORAL, charSpacing: 2 });
  T(s, 'Qubership\nAPIHUB', 0.85, 1.95, 7.2, 2.1, { fontSize: 54, bold: true, color: INK, lineSpacingMultiple: 0.92 });
  T(s, 'One place where every API is published, versioned, compared, documented, linted — and now read by AI agents.',
    0.85, 4.25, 6.8, 1.1, { fontSize: 16, color: SOFT });
  [['9 capabilities', CORAL], ['7 services', TEAL], ['25+ repos', INDIGO]].forEach(([t, c], i) => {
    const x = 0.85 + i * 2.25;
    box(s, x, 5.6, 2.05, 0.45, 'FFFFFF', { line: c, lw: 1.25, r: 0.22 });
    T(s, t, x, 5.68, 2.05, 0.3, { fontSize: 11, bold: true, color: c, align: 'center' });
  });
  foot(s);
}

/* ================================================================ 2 one sentence */
{
  const s = S(INK);
  circle(s, 11.4, 0.6, 1.5, '2C2F3F');
  circle(s, 0.4, 5.6, 1.1, '2C2F3F');
  iSpark(s, 12.1, 5.9, 0.55, MUSTARD);
  T(s, 'IN ONE SENTENCE', 1.1, 1.3, 11, 0.3, { fontSize: 11, bold: true, color: MUSTARD, charSpacing: 2 });
  s.addText([
    { text: 'APIHUB is the ' },
    { text: 'single registry', options: { color: MUSTARD, bold: true } },
    { text: ' for every API contract a company owns — it ' },
    { text: 'builds', options: { color: CORAL, bold: true } },
    { text: ', ' },
    { text: 'normalizes', options: { color: CORAL, bold: true } },
    { text: ' and ' },
    { text: 'compares', options: { color: CORAL, bold: true } },
    { text: ' specifications, renders them as living documentation, scores their quality, finds APIs already running in Kubernetes, and exposes the whole catalogue to ' },
    { text: 'AI assistants', options: { color: '7DD3C8', bold: true } },
    { text: '.' },
  ], { x: 1.1, y: 1.95, w: 11.1, h: 3.6, fontFace: H, fontSize: 30, color: 'FFFFFF',
       lineSpacingMultiple: 1.15, isTextBox: true, margin: 0, valign: 'top' });
  T(s, 'Open source · Netcracker / Qubership · deployed on Kubernetes', 1.1, 5.9, 9, 0.35,
    { fontSize: 13, color: 'A9A296' });
  foot(s, true);
}

/* ================================================================ 3 divider 01 */
function divider(num, title, sub, color, tint) {
  const s = S(color);
  circle(s, 10.2, 0.9, 2.4, tint);
  circle(s, 11.9, 4.1, 1.5, tint);
  iSpark(s, 9.6, 4.9, 0.7, tint);
  T(s, num, 1.1, 1.9, 3, 1.3, { fontFace: A, fontSize: 72, bold: true, color: tint });
  T(s, title, 1.1, 3.25, 8, 1.0, { fontSize: 44, bold: true, color: 'FFFFFF' });
  T(s, sub, 1.1, 4.4, 7.6, 0.8, { fontSize: 16, color: 'F3E9DC' });
  foot(s, true);
  return s;
}
divider('01', 'Why it exists', 'The three problems that justify a dedicated API registry', CLAY, 'F3C9A8');

/* ================================================================ 4 problems */
{
  const s = S();
  head(s, 'The problem', 'APIs are easy to write and hard to keep track of',
    'Every symptom below is what APIHUB was built to remove.');
  const items = [
    [BLUSH, CORAL, 'Scattered contracts', 'Specs live in repos, wikis and attachments. Nobody can say which version is the current one — or who consumes it.', 'doc'],
    [BUTTER, MUSTARD, 'Breaking changes found late', 'Without a systematic diff between versions, an incompatible field reaches consumers before anyone notices.', 'spark'],
    [MINT, TEAL, 'Every team documents differently', 'No shared quality bar, no common viewer, no way to compare an API from one team with another.', 'gear'],
  ];
  items.forEach(([tint, accent, title, body, icon], i) => {
    const x = 0.7 + i * 4.05;
    box(s, x, 2.45, 3.75, 3.9, tint, { r: 0.18 });
    circle(s, x + 0.35, 2.85, 0.95, 'FFFFFF');
    if (icon === 'doc') iDoc(s, x + 0.66, 3.02, 0.35, accent);
    if (icon === 'spark') iSpark(s, x + 0.58, 3.08, 0.5, accent);
    if (icon === 'gear') iGear(s, x + 0.58, 3.08, 0.5, accent);
    T(s, title, x + 0.35, 4.1, 3.1, 0.7, { fontSize: 19, bold: true, color: INK });
    T(s, body, x + 0.35, 4.85, 3.1, 1.4, { fontSize: 13, color: '5B5346' });
  });
  foot(s);
}

/* ================================================================ 5 personas */
{
  const s = S();
  head(s, 'Who it is for', 'Five audiences, one catalogue', null, TEAL);
  const ppl = [
    [CORAL, BLUSH, 'API Developer', 'Publishes versions, reviews what changed before release'],
    [MUSTARD, BUTTER, 'API Consumer', 'Finds an operation, reads it, tries it in the playground'],
    [TEAL, MINT, 'Administrator', 'Roles, identity providers, rulesets, housekeeping'],
    [INDIGO, LILAC, 'CI/CD pipeline', 'Publishes on every build with an API key or token'],
    [BLUE, SKY, 'AI assistant', 'Queries the catalogue over MCP from an IDE or chat'],
  ];
  ppl.forEach(([c, tint, name, line], i) => {
    const x = 0.62 + i * 2.45;
    box(s, x, 2.3, 2.25, 4.1, tint, { r: 0.18 });
    circle(s, x + 0.52, 2.62, 1.2, 'FFFFFF');
    iPerson(s, x + 0.87, 2.85, 0.52, c);
    T(s, name, x + 0.25, 4.1, 1.8, 0.75, { fontSize: 15, bold: true, color: INK });
    T(s, line, x + 0.25, 4.85, 1.8, 1.4, { fontSize: 12, color: '5B5346' });
  });
  foot(s);
}

/* ================================================================ 6 numbers */
{
  const s = S();
  head(s, 'By the numbers', 'A platform, not a service', null, INDIGO);
  const stats = [
    ['7', 'deployable\nservices', CORAL, BLUSH],
    ['12', 'shared TypeScript\nlibraries', TEAL, MINT],
    ['60', 'sub-capabilities\non the map', INDIGO, LILAC],
    ['8', 'specification types\nunderstood', MUSTARD, BUTTER],
  ];
  stats.forEach(([v, l, c, tint], i) => {
    const x = 0.7 + i * 3.1;
    box(s, x, 2.35, 2.85, 2.5, tint, { r: 0.2 });
    T(s, v, x, 2.6, 2.85, 1.5, { fontFace: A, fontSize: 66, bold: true, color: c, align: 'center' });
    T(s, l, x, 4.0, 2.85, 0.8, { fontSize: 13, color: '5B5346', align: 'center' });
  });
  box(s, 0.7, 5.15, 11.95, 1.15, SAND, { r: 0.16 });
  T(s, 'Everything runs on Kubernetes from one Helm chart: PostgreSQL per service, an embedded Olric cache that also carries events, optional S3 for cold storage, and stateless build workers you scale to taste.',
    1.05, 5.42, 11.3, 0.7, { fontSize: 13.5, color: '5B5346' });
  foot(s);
}

/* ================================================================ 7 capabilities */
{
  const s = S();
  head(s, 'What it does', 'Nine capabilities', 'Stated as what the platform does, independent of how it is built.', PLUM);
  const caps = [
    ['C1', 'API Catalog', 'Workspaces, packages, versions, revisions, search', BLUE, SKY],
    ['C2', 'Publishing & Build', 'Upload, queue, parse, normalize, index', BLUE, SKY],
    ['C3', 'Change Management', 'Diff, classify, changelog, compatibility', BLUE, SKY],
    ['C4', 'Documentation', 'Viewers, schemas, playground, export', BLUE, SKY],
    ['C5', 'Quality & Governance', 'Linting, rulesets, scoring, operation groups', BLUE, SKY],
    ['C6', 'Runtime Discovery', 'Agents find live APIs in clusters', BLUE, SKY],
    ['C7', 'AI & Ecosystem', 'MCP server, chat, DDL and MCP contracts', PLUM, 'F6DCE9'],
    ['C8', 'Identity & Access', 'SSO, keys, tokens, role-based access', SOFT, SAND],
    ['C9', 'Platform Operations', 'Deploy, store, maintain, observe', SOFT, SAND],
  ];
  caps.forEach(([id, name, desc, c, tint], i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = 0.7 + col * 4.05, y = 2.38 + row * 1.42;
    box(s, x, y, 3.75, 1.26, tint, { r: 0.16 });
    T(s, id, x + 0.22, y + 0.16, 0.6, 0.35, { fontFace: A, fontSize: 15, bold: true, color: c });
    T(s, name, x + 0.85, y + 0.14, 2.7, 0.4, { fontSize: 15, bold: true, color: INK });
    T(s, desc, x + 0.85, y + 0.58, 2.75, 0.65, { fontSize: 11.5, color: '5B5346' });
  });
  T(s, 'Blue = core capabilities · pink = differentiating · sand = supporting', 0.7, 6.6, 7, 0.28, { fontSize: 11, color: SOFT });
  foot(s);
}

/* ================================================================ 8 divider 02 */
divider('02', 'How it works', 'Seven services, one pipeline and a stack of libraries doing the hard part', TEAL, 'BDE6DF');

/* ================================================================ 9 services */
{
  const s = S();
  head(s, 'The moving parts', 'Seven services', 'Three core, two extensions, one remote agent, one new Java worker.', TEAL);
  const svc = [
    ['UI', 'React 18 · nginx', 'Two apps: the Portal catalogue and the Agents console', BLUE, SKY],
    ['Backend', 'Go 1.26', 'The heart: catalogue, auth, build queue, MCP server, chat', BLUE, SKY],
    ['Build Consumer', 'NestJS 11', 'Stateless worker that turns uploads into indexed versions', BLUE, SKY],
    ['Linter', 'Go · Spectral', 'Lints and scores every published version', TEAL, MINT],
    ['Agents Backend', 'Go 1.26', 'Registry and orchestrator for remote discovery agents', TEAL, MINT],
    ['Agent', 'Go · client-go', 'Lives in your cluster, probes services for specs', CORAL, BLUSH],
    ['Java Consumer', 'Java 21 · new', 'Compares jars, analyses upgrade impact', MUSTARD, BUTTER],
  ];
  svc.forEach(([name, tech, desc, c, tint], i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const x = 0.7 + col * 3.05, y = 2.4 + row * 2.25;
    box(s, x, y, 2.8, 2.05, tint, { r: 0.16 });
    iServer(s, x + 0.24, y + 0.26, 0.6, c);
    T(s, name, x + 1.05, y + 0.22, 1.6, 0.45, { fontSize: 14.5, bold: true, color: INK });
    T(s, tech, x + 1.05, y + 0.66, 1.6, 0.3, { fontSize: 10.5, color: c, bold: true });
    T(s, desc, x + 0.24, y + 1.12, 2.35, 0.8, { fontSize: 11.5, color: '5B5346' });
  });
  box(s, 9.85, 4.65, 2.8, 2.05, SAND, { r: 0.16 });
  T(s, 'Plus 12 TypeScript libraries', 10.1, 4.9, 2.3, 0.7, { fontSize: 14.5, bold: true, color: INK });
  T(s, 'Shared by the workers and the UI — the actual parsing, diffing and rendering engine.',
    10.1, 5.62, 2.3, 0.95, { fontSize: 11.5, color: '5B5346' });
  foot(s);
}

/* ================================================================ 10 publish journey */
{
  const s = S();
  head(s, 'The main flow', 'What happens when you publish', 'From a ZIP of specs to a searchable, diffed, linted version.', CORAL);
  const steps = [
    ['Upload', 'UI or CI sends sources with a key', CORAL],
    ['Queue', 'Backend stores a build task', CLAY],
    ['Parse', 'Worker detects the spec type', MUSTARD],
    ['Normalize', 'Refs resolved, schemas unified', LEAF],
    ['Compare', 'Diff against the previous version', TEAL],
    ['Publish', 'Operations indexed and searchable', BLUE],
    ['Lint', 'Rules run, quality score stored', INDIGO],
  ];
  bar(s, 1.15, 3.42, 11.05, 0.1, LINE);
  steps.forEach(([t, d, c], i) => {
    const x = 0.7 + i * 1.74;
    circle(s, x + 0.28, 3.0, 0.95, c);
    T(s, String(i + 1), x + 0.28, 3.2, 0.95, 0.5, { fontFace: A, fontSize: 24, bold: true, color: 'FFFFFF', align: 'center' });
    T(s, t, x - 0.1, 4.15, 1.7, 0.4, { fontSize: 14, bold: true, color: INK, align: 'center' });
    T(s, d, x - 0.1, 4.58, 1.7, 1.0, { fontSize: 11, color: '5B5346', align: 'center' });
  });
  box(s, 0.7, 5.85, 11.95, 0.95, SAND, { r: 0.16 });
  T(s, 'Steps 3 to 6 run inside a stateless worker you can scale horizontally; the diff result is classified as breaking, risky or safe before anyone sees it.',
    1.05, 6.08, 11.3, 0.55, { fontSize: 13, color: '5B5346' });
  foot(s);
}

/* ================================================================ 11 stack */
{
  const s = S();
  head(s, 'The engine', 'A layer cake of libraries', 'Everything that understands a specification lives here, shared by the workers and the UI.', INDIGO);
  const layers = [
    ['L6', 'Rendering', 'Web components and React viewers that draw the documentation', LEAF],
    ['L5', 'Orchestration', 'api-processor — the build strategies and the seven builders', CORAL],
    ['L4', 'Data model', 'Specifications turned into trees the interface can render', PLUM],
    ['L3', 'Analysis', 'api-diff — structural comparison and change classification', INDIGO],
    ['L2', 'Normalization', 'api-unifier — resolves refs, merges schemas, defines the types', BLUE],
    ['L1', 'Conversion', 'GraphQL, AsyncAPI, DDL and Postman into common shapes', TEAL],
    ['L0', 'Traversal', 'json-crawl — the zero-dependency walker underneath it all', INK],
  ];
  layers.forEach(([lvl, name, desc, c], i) => {
    const y = 2.35 + i * 0.6;
    box(s, 0.7, y, 11.95, 0.52, c, { r: 0.1 });
    T(s, lvl, 0.95, y + 0.12, 0.55, 0.32, { fontFace: A, fontSize: 13, bold: true, color: 'FFFFFF' });
    T(s, name, 1.6, y + 0.12, 2.3, 0.32, { fontSize: 13.5, bold: true, color: 'FFFFFF' });
    T(s, desc, 4.05, y + 0.14, 8.4, 0.3, { fontSize: 12, color: 'FFFFFF' });
  });
  T(s, 'Each layer uses only the layers beneath it — which is why a new specification type can be added without touching the ones above.',
    0.7, 6.55, 11.3, 0.35, { fontSize: 11.5, color: SOFT });
  foot(s);
}

/* ================================================================ 12 what it understands */
{
  const s = S();
  head(s, 'Coverage', 'What it can read', 'Full support means normalized, diffed, rendered and searchable.', LEAF);
  const full = [['OpenAPI 3.0 / 3.1', BLUE], ['Swagger 2.0', BLUE], ['GraphQL', PLUM], ['AsyncAPI 3', TEAL],
                ['JSON Schema', INDIGO], ['Markdown', SOFT]];
  const newer = [['DDL database contracts', CLAY], ['MCP server catalogues', CORAL]];
  const partial = [['Protobuf / gRPC', SOFT], ['Java API (jars)', MUSTARD]];
  T(s, 'Fully supported', 0.7, 2.35, 5, 0.35, { fontSize: 15, bold: true, color: INK });
  full.forEach(([t, c], i) => {
    const x = 0.7 + (i % 3) * 2.1, y = 2.8 + Math.floor(i / 3) * 0.7;
    box(s, x, y, 1.95, 0.55, 'FFFFFF', { line: c, lw: 1.5, r: 0.25 });
    T(s, t, x, y + 0.14, 1.95, 0.3, { fontSize: 11, bold: true, color: c, align: 'center' });
  });
  T(s, 'New in 2026', 7.1, 2.35, 5, 0.35, { fontSize: 15, bold: true, color: INK });
  newer.forEach(([t, c], i) => {
    const x = 7.1 + i * 2.8;
    box(s, x, 2.8, 2.6, 0.55, c, { r: 0.25 });
    T(s, t, x, 2.94, 2.6, 0.3, { fontSize: 11, bold: true, color: 'FFFFFF', align: 'center' });
  });
  T(s, 'Partial or in progress', 7.1, 3.75, 5, 0.35, { fontSize: 15, bold: true, color: INK });
  partial.forEach(([t, c], i) => {
    const x = 7.1 + i * 2.8;
    box(s, x, 4.2, 2.6, 0.55, SAND, { line: c, lw: 1.25, r: 0.25 });
    T(s, t, x, 4.34, 2.6, 0.3, { fontSize: 11, bold: true, color: c, align: 'center' });
  });
  box(s, 0.7, 5.3, 11.95, 1.35, MINT, { r: 0.16 });
  T(s, 'Why it matters', 1.05, 5.5, 3, 0.35, { fontSize: 14, bold: true, color: TEAL });
  T(s, 'Adding a new specification type is a known, documented path through eight layers — from the type registry in the unifier all the way to the discovery runner in the agent. DDL went through it this year.',
    1.05, 5.85, 11.2, 0.7, { fontSize: 12.5, color: '5B5346' });
  foot(s);
}

/* ================================================================ 13 discovery */
{
  const s = S();
  head(s, 'A distinctive trick', 'It finds APIs you forgot to publish', 'An agent inside your cluster probes every service for a specification and offers to promote what it finds.', CORAL);
  box(s, 0.7, 2.4, 3.4, 3.4, SKY, { r: 0.18 });
  T(s, 'APIHUB', 1.0, 2.65, 2.8, 0.4, { fontSize: 15, bold: true, color: BLUE });
  iServer(s, 1.0, 3.2, 1.0, BLUE);
  T(s, 'Agents Backend keeps a registry of every agent and orchestrates discovery runs.',
    1.0, 4.4, 2.8, 1.2, { fontSize: 12, color: '5B5346' });
  s.addShape(pres.ShapeType.rightArrow, { x: 4.3, y: 3.75, w: 1.0, h: 0.55, fill: { color: CORAL }, line: { color: CORAL } });
  T(s, 'discover', 4.25, 3.35, 1.1, 0.3, { fontSize: 10, color: CORAL, align: 'center', bold: true });
  box(s, 5.5, 2.4, 7.15, 3.4, BLUSH, { r: 0.18 });
  T(s, 'Your Kubernetes cluster', 5.85, 2.62, 4, 0.35, { fontSize: 14, bold: true, color: CORAL });
  circle(s, 5.9, 3.15, 1.0, 'FFFFFF');
  iSearch(s, 6.13, 3.38, 0.55, CORAL);
  T(s, 'Agent', 5.9, 4.25, 1.0, 0.3, { fontSize: 11, bold: true, color: INK, align: 'center' });
  iCluster(s, 7.3, 3.05, 1.6, 1.35, CORAL, 6, 'F3B4A5');
  iCluster(s, 9.15, 3.05, 1.6, 1.35, CORAL, 5, 'F3B4A5');
  iCluster(s, 11.0, 3.05, 1.4, 1.35, CORAL, 4, 'F3B4A5');
  T(s, 'Namespaces and their services — probed in parallel for OpenAPI, GraphQL, AsyncAPI, Markdown and JSON Schema endpoints.',
    5.85, 4.65, 6.5, 0.9, { fontSize: 12, color: '5B5346' });
  box(s, 0.7, 6.05, 11.95, 0.75, SAND, { r: 0.16 });
  T(s, 'What is found becomes a snapshot, and a snapshot can be promoted into the catalogue as a real version — with references intact.',
    1.05, 6.23, 11.3, 0.4, { fontSize: 12.5, color: '5B5346' });
  foot(s);
}

/* ================================================================ 14 quality */
{
  const s = S();
  head(s, 'Governance', 'Every version gets graded', 'Publishing triggers linting automatically — no separate pipeline to wire up.', LEAF);
  // flow
  const flow = [['Version published', BLUE], ['Event on the bus', INDIGO], ['Rules run', TEAL], ['Score stored', LEAF]];
  flow.forEach(([t, c], i) => {
    const x = 0.7 + i * 2.35;
    box(s, x, 2.45, 2.05, 0.8, c, { r: 0.16 });
    T(s, t, x + 0.12, 2.65, 1.8, 0.45, { fontSize: 12, bold: true, color: 'FFFFFF', align: 'center' });
    if (i < 3) s.addShape(pres.ShapeType.rightArrow, { x: x + 2.12, y: 2.72, w: 0.2, h: 0.26, fill: { color: SOFT }, line: { color: SOFT } });
  });
  box(s, 10.1, 2.45, 2.55, 3.0, MINT, { r: 0.18 });
  ring(s, 10.85, 2.85, 1.05, LEAF);
  T(s, 'A+', 10.85, 3.12, 1.05, 0.5, { fontFace: A, fontSize: 18, bold: true, color: LEAF, align: 'center' });
  T(s, 'Quality score', 10.3, 4.1, 2.15, 0.35, { fontSize: 13, bold: true, color: INK, align: 'center' });
  T(s, 'Computed per version after the rules finish, visible on the API quality page.',
    10.3, 4.5, 2.15, 0.85, { fontSize: 11, color: '5B5346', align: 'center' });
  const eng = [
    ['Spectral rules', 'The industry standard linter, bundled with the service and driven by rulesets you manage in the UI.', TEAL, MINT],
    ['AI review', 'An optional LLM pass over OpenAPI documents for the things rules cannot express — naming, clarity, consistency.', INDIGO, LILAC],
  ];
  eng.forEach(([t, d, c, tint], i) => {
    const x = 0.7 + i * 4.55;
    box(s, x, 3.55, 4.25, 1.9, tint, { r: 0.16 });
    T(s, t, x + 0.3, 3.78, 3.6, 0.4, { fontSize: 15, bold: true, color: c });
    T(s, d, x + 0.3, 4.25, 3.65, 1.05, { fontSize: 12, color: '5B5346' });
  });
  box(s, 0.7, 5.7, 11.95, 1.0, SAND, { r: 0.16 });
  T(s, 'Rulesets are data, not code: an administrator uploads and activates them in the Portal, and they apply to the next publish.',
    1.05, 5.98, 11.3, 0.45, { fontSize: 13, color: '5B5346' });
  foot(s);
}

/* ================================================================ 15 AI */
{
  const s = S(INK);
  circle(s, 11.0, 0.5, 2.2, '2C2F3F');
  T(s, 'THE DIFFERENTIATOR', 0.7, 0.6, 8, 0.3, { fontSize: 11, bold: true, color: '7DD3C8', charSpacing: 2 });
  T(s, 'The catalogue talks to AI agents', 0.7, 0.98, 10.5, 0.85, { fontSize: 34, bold: true, color: 'FFFFFF' });
  T(s, 'APIHUB speaks MCP — the protocol IDE assistants use to reach tools. Point Cursor or Claude at it and they can search your APIs directly.',
    0.7, 1.85, 9.8, 0.8, { fontSize: 15, color: 'C9C2B6' });
  const tools = [
    ['search_api_operations', 'Find operations across every package and version'],
    ['get_api_operation_specification', 'Pull the exact contract for one operation'],
    ['get_api_operation_diff', 'Ask what changed between two versions'],
    ['get_document', 'Read a whole specification or markdown page'],
  ];
  tools.forEach(([t, d], i) => {
    const y = 2.85 + i * 0.86;
    box(s, 0.7, y, 6.6, 0.72, '2C2F3F', { line: '3C4055', lw: 1, r: 0.14 });
    T(s, t, 0.95, y + 0.08, 6.1, 0.32, { fontSize: 13, bold: true, color: '7DD3C8' });
    T(s, d, 0.95, y + 0.4, 6.1, 0.28, { fontSize: 11, color: 'A9A296' });
  });
  box(s, 7.65, 2.85, 5.0, 3.3, '2C2F3F', { line: '3C4055', lw: 1, r: 0.16 });
  iSpark(s, 7.95, 3.1, 0.5, MUSTARD);
  T(s, 'And a chat of its own', 8.6, 3.15, 3.8, 0.4, { fontSize: 16, bold: true, color: 'FFFFFF' });
  T(s, 'A built-in assistant uses the same tools in a loop: ask it which endpoints changed, or have it draft an integration design document from the real specifications.',
    7.95, 3.8, 4.4, 1.3, { fontSize: 12.5, color: 'C9C2B6' });
  T(s, 'The linter exposes its own tool so an agent can ask what is wrong with a version.',
    7.95, 5.25, 4.4, 0.7, { fontSize: 12, color: '7DD3C8' });
  foot(s, true);
}

/* ================================================================ 16 divider 03 */
divider('03', 'Where it stands', 'Maturity, what landed this year, and what still needs attention', INDIGO, 'CFCDF6');

/* ================================================================ 17 maturity */
{
  const s = S();
  head(s, 'Health check', 'Most of the platform is settled', 'Assessment of 60 sub-capabilities from code evidence — release history, deprecated paths and pending markers.', INDIGO);
  s.addChart(pres.ChartType.doughnut,
    [{ name: 'Maturity', labels: ['Core / mature', 'Evolving', 'New in 2026', 'Planned / partial'], values: [41, 9, 8, 2] }],
    { x: 0.55, y: 2.25, w: 4.6, h: 4.2, chartColors: [LEAF, MUSTARD, CORAL, PLUM],
      showValue: true, dataLabelFontSize: 12, dataLabelColor: 'FFFFFF', dataLabelFontBold: true,
      holeSize: 58, showLegend: true, legendPos: 'b', legendFontSize: 11, legendColor: INK,
      showTitle: false, chartArea: { fill: { color: BG } } });
  const rows = [
    [LEAF, '41 capabilities are mature', 'Catalogue, publishing, diffing, documentation and access control have been stable across several releases and are covered by end-to-end tests.'],
    [MUSTARD, '9 are actively changing', 'Export, backward-compatibility validation, AI linting and observability are being reworked — expect interface churn.'],
    [CORAL, '8 landed this year', 'DDL and MCP contracts, quality scoring, document shareability, the AI chat and the linter MCP endpoint are all new.'],
    [PLUM, '2 are not usable yet', 'Java API analysis waits on a backend queue; the Tyk gateway bridge is design only.'],
  ];
  rows.forEach(([c, t, d], i) => {
    const y = 2.35 + i * 1.12;
    circle(s, 5.6, y + 0.12, 0.3, c);
    T(s, t, 6.1, y, 6.5, 0.35, { fontSize: 15, bold: true, color: INK });
    T(s, d, 6.1, y + 0.38, 6.55, 0.7, { fontSize: 12, color: '5B5346' });
  });
  foot(s);
}

/* ================================================================ 18 what's new */
{
  const s = S();
  head(s, 'This year', 'What changed in 2026', 'The documentation that existed in spring no longer matched the code — these are the deltas.', CORAL);
  const items = [
    ['MCP went mainstream', 'The server moved to streamable HTTP, tools were renamed and broadened beyond REST, and a document tool plus a packages resource were added.', CORAL, BLUSH],
    ['A real chat assistant', 'Chat sessions with streaming, a tool loop over the catalogue, generated file downloads and its own retention policy.', PLUM, 'F6DCE9'],
    ['Contracts beyond APIs', 'Database schemas (DDL) became a first-class comparable type; MCP server catalogues became a publishable contract.', TEAL, MINT],
    ['Java enters the picture', 'A new worker compares jars and analyses the blast radius of a dependency upgrade — the backend side is still specified only.', MUSTARD, BUTTER],
  ];
  items.forEach(([t, d, c, tint], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.7 + col * 6.15, y = 2.4 + row * 2.2;
    box(s, x, y, 5.8, 1.95, tint, { r: 0.18 });
    circle(s, x + 0.3, y + 0.28, 0.6, 'FFFFFF');
    T(s, String(i + 1), x + 0.3, y + 0.4, 0.6, 0.4, { fontFace: A, fontSize: 18, bold: true, color: c, align: 'center' });
    T(s, t, x + 1.1, y + 0.28, 4.4, 0.45, { fontSize: 17, bold: true, color: INK });
    T(s, d, x + 1.1, y + 0.8, 4.45, 1.0, { fontSize: 12.5, color: '5B5346' });
  });
  foot(s);
}

/* ================================================================ 19 watch-outs */
{
  const s = S();
  head(s, 'Honest bits', 'Three things worth attention', null, CLAY);
  const items = [
    [CLAY, 'The backend does a lot', 'Catalogue, authentication, build orchestration, search, export, MCP and chat all live in one Go process. It is well layered, but it is the single busiest component and touches almost every capability.'],
    [MUSTARD, 'Two features are half-built', 'The Java analysis worker polls endpoints the backend does not implement yet, and the Vacuum linting engine ships in the image without being wired up. Both look finished from the outside.'],
    [TEAL, 'Documentation drifts fast', 'The written architecture was several releases behind the code before this refresh. The generators behind these decks read the repositories, so regenerating is cheaper than re-reading.'],
  ];
  items.forEach(([c, t, d], i) => {
    const y = 2.3 + i * 1.52;
    box(s, 0.7, y, 11.95, 1.4, 'FFFFFF', { line: LINE, lw: 1.25, r: 0.16 });
    bar(s, 0.95, y + 0.28, 0.28, 0.28, c);
    T(s, t, 1.45, y + 0.18, 4.2, 0.5, { fontSize: 16, bold: true, color: INK });
    T(s, d, 5.8, y + 0.22, 6.6, 1.0, { fontSize: 12.5, color: '5B5346' });
  });
  foot(s);
}

/* ================================================================ 20 artefacts */
{
  const s = S();
  head(s, 'What you now have', 'Three sets of living documentation', 'All generated from the repositories, all regenerable from scripts in the same folders.', BLUE);
  const sets = [
    ['C4 model', 'tools/architecture-model/c4', ['Context, containers, components, code', '26 Mermaid diagrams', '17 draw.io pages', '36-slide deck'], BLUE, SKY],
    ['Capability model', 'tools/architecture-model/capability', ['Capability map and two heatmaps', 'Application-to-capability matrix', 'ArchiMate views + Archi model', '17-slide deck'], PLUM, 'F6DCE9'],
    ['This summary', 'tools/architecture-model/summary', ['The story in one pass', 'For any audience', 'Built from the same verified facts', '21 slides'], CORAL, BLUSH],
  ];
  sets.forEach(([t, path, lines, c, tint], i) => {
    const x = 0.7 + i * 4.05;
    box(s, x, 2.35, 3.75, 4.0, tint, { r: 0.18 });
    iDoc(s, x + 0.32, 2.62, 0.5, c);
    T(s, t, x + 1.15, 2.62, 2.4, 0.45, { fontSize: 18, bold: true, color: INK });
    T(s, path, x + 1.15, 3.08, 2.5, 0.3, { fontSize: 10.5, color: c, bold: true });
    s.addText(lines.map((l, j) => ({ text: l, options: { bullet: true, breakLine: j < lines.length - 1, paraSpaceAfter: 6 } })),
      { x: x + 0.35, y: 3.65, w: 3.1, h: 2.4, fontFace: H, fontSize: 12, color: '5B5346', isTextBox: true, margin: 0, valign: 'top' });
  });
  foot(s);
}

/* ================================================================ 21 closing */
{
  const s = S(CLAY);
  circle(s, 10.0, 0.8, 2.6, 'D4884F');
  circle(s, 11.8, 4.6, 1.6, 'D4884F');
  iSpark(s, 9.5, 5.1, 0.7, 'F3C9A8');
  T(s, 'In short', 0.9, 1.9, 8, 0.6, { fontSize: 18, color: 'F3C9A8', bold: true });
  T(s, 'A mature API registry\nthat just grew an AI surface', 0.9, 2.5, 8.4, 2.0,
    { fontSize: 38, bold: true, color: 'FFFFFF', lineSpacingMultiple: 1.05 });
  T(s, 'Nine capabilities, seven services, one well-worn publishing pipeline — plus a genuinely new way for assistants to read the catalogue. The parts that are still moving are clearly marked.',
    0.9, 4.65, 7.8, 1.3, { fontSize: 15, color: 'F7E7D5' });
  foot(s, true);
}

pres.writeFile({ fileName: 'APIHUB_visual_summary.pptx' }).then(() => console.log('slides:', n));
