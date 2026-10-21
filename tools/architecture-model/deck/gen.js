const { P, mk, pptxgen } = require('./lib');
const M = JSON.parse(require('fs').readFileSync('model.json', 'utf8'));

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.title = 'Qubership APIHUB — Architecture (C4) and Capability Map';
pres.author = 'APIHUB architecture';
const st = { n: 0 };
const U = mk(pres, st);
const { BG, INK, SOFT, LINE, CORAL, MUSTARD, TEAL, INDIGO, BLUE, NAVYC, LEAF, PLUM, CLAY,
        BLUSH, BUTTER, MINT, LILAC, SKY, SAND, PAPER, H, A } = P;
const W = 'FFFFFF';

/* container colours reused across every diagram */
const C = {
  UI:  { c: '0EA5E9', t: SKY,    name: 'APIHUB UI',          tech: 'React 18 · MUI 5 · nginx 1.28', port: ':8080' },
  BE:  { c: BLUE,     t: SKY,    name: 'APIHUB Backend',     tech: 'Go 1.26 · gorilla/mux · go-pg', port: ':8080' },
  BTC: { c: NAVYC,    t: SKY,    name: 'Build Task Consumer', tech: 'Node 24 · NestJS 10',         port: ':3000' },
  LNT: { c: TEAL,     t: MINT,   name: 'API Linter Service', tech: 'Go 1.26 · Spectral · OpenAI',  port: ':8080' },
  ABE: { c: LEAF,     t: MINT,   name: 'Agents Backend',     tech: 'Go 1.26',                      port: ':8080' },
  AGT: { c: CORAL,    t: BLUSH,  name: 'APIHUB Agent',       tech: 'Go 1.26 · client-go',          port: ':8080' },
  JTC: { c: MUSTARD,  t: BUTTER, name: 'Java Task Consumer', tech: 'Java 21 · japicmp · jdeps',    port: ':3000' },
  LIB: { c: PLUM,     t: 'F6DCE9', name: 'TypeScript libraries', tech: '12 npm packages',          port: '—' },
  OPS: { c: SOFT,     t: SAND,   name: 'Platform / Helm',    tech: 'Helm · Kubernetes',            port: '—' },
};

/* ============================================================ 1 cover */
{
  const s = U.slide();
  U.box(s, 7.9, 0.5, 4.95, 6.5, NAVYC, { r: 0.22 });
  const fr = [[LEAF, 'L1', 'context'], [TEAL, 'L2', 'containers'], [MUSTARD, 'L3', 'components'], [CORAL, 'L4', 'code']];
  fr.forEach(([col, lab, what], i) => {
    const dx = i * 0.46, dy = i * 0.62;
    U.box(s, 8.35 + dx, 1.05 + dy, 4.05 - dx * 2, 5.1 - dy * 2, col, { r: 0.16 });
    U.T(s, lab + '  ' + what, 8.48 + dx, 1.16 + dy, 2.4, 0.28,
      { fontSize: 9.5, bold: true, color: 'FFFFFF' });
  });
  U.T(s, 'C4', 8.35 + 1.38, 3.45, 1.29, 0.6, { fontFace: A, fontSize: 22, bold: true, color: 'FFFFFF', align: 'center' });
  U.T(s, 'each level hides the detail of the next', 8.35, 6.35, 4.05, 0.4,
    { fontSize: 9, color: 'C9D6F2', align: 'center' });

  U.T(s, 'ARCHITECTURE DECK', 0.75, 1.45, 7, 0.3, { fontSize: 12, bold: true, color: CORAL, charSpacing: 2 });
  U.T(s, 'APIHUB\nunder the hood', 0.75, 1.9, 7.0, 2.2, { fontSize: 50, bold: true, color: INK, lineSpacingMultiple: 0.94 });
  U.T(s, 'The C4 model from context down to code, the deployment picture, the three runtime flows — and the functional-technical map that ties capabilities to the services that implement them.',
    0.75, 4.3, 6.7, 1.4, { fontSize: 15, color: SOFT });
  [['C4 · 4 levels', BLUE], ['7 containers', TEAL], ['60 capabilities', PLUM]].forEach(([t, c], i) => {
    const x = 0.75 + i * 2.3;
    U.box(s, x, 5.9, 2.1, 0.46, W, { line: c, lw: 1.25, r: 0.23 });
    U.T(s, t, x, 5.98, 2.1, 0.3, { fontSize: 10.5, bold: true, color: c, align: 'center' });
  });
  U.foot(s);
}

/* ============================================================ 2 how to read C4 */
{
  const s = U.slide();
  U.head(s, 'The method', 'Four levels of zoom', 'Each level answers one question and hides the detail of the next.', BLUE);
  const lv = [
    ['L1', 'Context', 'Who uses the system and what it depends on', 'One box for all of APIHUB', LEAF, MINT],
    ['L2', 'Containers', 'Which deployable things exist and how they talk', 'Seven services, three stores', TEAL, MINT],
    ['L3', 'Components', 'What lives inside one container', 'Controllers, services, runners', MUSTARD, BUTTER],
    ['L4', 'Code', 'The classes and registries that matter', 'Pipelines, maps, plug-ins', CORAL, BLUSH],
  ];
  lv.forEach(([id, name, q, ex, c, tint], i) => {
    const x = 0.55 + i * 3.13;
    U.box(s, x, 2.3, 2.9, 3.5, tint, { r: 0.16 });
    U.circle(s, x + 0.25, 2.55, 0.7, c);
    U.T(s, id, x + 0.25, 2.68, 0.7, 0.4, { fontFace: A, fontSize: 16, bold: true, color: W, align: 'center' });
    U.T(s, name, x + 0.25, 3.45, 2.4, 0.4, { fontSize: 18, bold: true, color: INK });
    U.T(s, q, x + 0.25, 3.95, 2.4, 1.0, { fontSize: 12, color: '5B5346' });
    U.T(s, ex, x + 0.25, 5.05, 2.4, 0.6, { fontSize: 11, bold: true, color: c });
    if (i < 3) s.addShape(pres.ShapeType.triangle, { x: x + 2.98, y: 3.9, w: 0.14, h: 0.2,
      fill: { color: SOFT }, line: { color: SOFT }, rotate: 90 });
  });
  U.box(s, 0.55, 6.0, 12.25, 0.85, SAND, { r: 0.14 });
  U.T(s, 'Beyond the four levels this deck adds a deployment view (what runs where) and three dynamic views (what happens over time when you publish, discover or ask an AI agent).',
    0.85, 6.22, 11.7, 0.45, { fontSize: 12.5, color: '5B5346' });
  U.foot(s);
}

/* ============================================================ 3 L1 context */
{
  const s = U.slide();
  U.head(s, 'Level 1', 'System context', 'APIHUB as one box: five kinds of user on the left, everything it depends on to the right.', LEAF);
  const actors = [
    ['API Developer', 'publishes and reviews'],
    ['API Consumer', 'reads and tries'],
    ['Administrator', 'roles, identity, rules'],
    ['CI/CD pipeline', 'publishes with a key'],
    ['AI assistant', 'queries over MCP'],
  ];
  actors.forEach(([t, d], i) => {
    const y = 2.35 + i * 0.86;
    U.box(s, 0.55, y, 2.75, 0.72, LILAC, { r: 0.12 });
    U.circle(s, 0.72, y + 0.19, 0.34, INDIGO);
    U.T(s, t, 1.18, y + 0.1, 2.0, 0.28, { fontSize: 11, bold: true, color: INK });
    U.T(s, d, 1.18, y + 0.38, 2.0, 0.26, { fontSize: 9, color: '5B5346' });
  });
  U.hArrow(s, 3.45, 4.4, 4.05, INDIGO);
  U.T(s, 'HTTPS · REST · MCP', 3.3, 4.14, 1.3, 0.3, { fontSize: 8, color: SOFT, align: 'center' });

  U.box(s, 4.5, 2.85, 4.0, 2.6, NAVYC, { r: 0.18 });
  U.T(s, 'Qubership APIHUB', 4.75, 3.15, 3.5, 0.45, { fontSize: 20, bold: true, color: W, align: 'center' });
  U.T(s, 'API registry and management platform', 4.75, 3.62, 3.5, 0.3, { fontSize: 11, color: '9FB4E8', align: 'center' });
  ['store · build · compare', 'document · lint · score', 'discover · expose to AI'].forEach((t, i) =>
    U.T(s, t, 4.75, 4.0 + i * 0.32, 3.5, 0.3, { fontSize: 11, color: 'D7E2F8', align: 'center' }));

  U.hArrow(s, 8.6, 9.55, 4.05, TEAL);
  U.T(s, 'depends on', 8.5, 4.14, 1.2, 0.3, { fontSize: 8, color: SOFT, align: 'center' });

  const ext = [
    ['PostgreSQL 14+', 'one database per service', TEAL],
    ['S3 / MinIO', 'optional cold storage', TEAL],
    ['Identity provider', 'SAML · OIDC · LDAP', SOFT],
    ['LLM API', 'AI lint and chat, optional', SOFT],
    ['Kubernetes clusters', 'where agents discover APIs', CORAL],
    ['GitHub · ghcr.io · npm', 'images and packages', SOFT],
  ];
  ext.forEach(([t, d, c], i) => {
    const y = 2.35 + i * 0.73;
    U.box(s, 9.7, y, 3.12, 0.62, W, { line: LINE, lw: 1.25, r: 0.1 });
    U.bar(s, 9.85, y + 0.19, 0.16, 0.24, c);
    U.T(s, t, 10.12, y + 0.06, 2.6, 0.26, { fontSize: 10.5, bold: true, color: INK });
    U.T(s, d, 10.12, y + 0.32, 2.6, 0.24, { fontSize: 8.5, color: '5B5346' });
  });
  U.foot(s);
}

/* ============================================================ 4 L2 containers */
{
  const s = U.slide();
  U.head(s, 'Level 2', 'Containers', 'Everything that gets deployed, arranged by tier. Arrows show the main direction of traffic.', TEAL);
  U.panel(s, 0.55, 2.2, 9.05, 4.6, 'F7FAFF', BLUE, 'APIHUB NAMESPACE — one Helm chart', BLUE, true);

  U.node(s, 0.85, 2.62, 8.45, 0.66, C.UI.c, 'APIHUB UI  ·  nginx + Portal SPA + Agents SPA', 'Single ingress; proxies /api to the backend, /api-linter and /agents-backend onward',
    { fs: 12, fss: 9, subColor: 'E3F3FD' });
  U.vArrow(s, 5.05, 3.32, 3.62, SOFT);
  U.node(s, 0.85, 3.66, 8.45, 0.8, C.BE.c, 'APIHUB Backend  ·  the micro-monolith',
    'REST v1–v4 · auth and RBAC · catalogue · build queue · search · export · MCP server · AI chat · cleanup',
    { fs: 12, fss: 9, subColor: 'DCE7FB' });

  const tier3 = [
    [C.BTC, 'polls build tasks'], [C.JTC, 'java builds — queue pending'],
    [C.LNT, 'lints and scores'], [C.ABE, 'orchestrates agents'],
  ];
  tier3.forEach(([k, sub], i) => {
    const x = 0.85 + i * 2.15;
    U.vArrow(s, x + 0.95, 4.52, 4.78, SOFT);
    U.node(s, x, 4.82, 2.0, 0.78, k.c, k.name, sub, { fs: 10.5, fss: 8, subColor: 'FFFFFF', dash: k === C.JTC });
  });
  const stores = [['PostgreSQL', '3 databases', SOFT], ['Olric', 'cache + events', SOFT], ['S3 / MinIO', 'optional', SOFT]];
  stores.forEach(([t, d, c], i) => {
    const x = 0.85 + i * 2.87;
    U.box(s, x, 5.85, 2.7, 0.62, SAND, { r: 0.1, line: LINE, lw: 1.25 });
    U.T(s, t, x + 0.15, 5.93, 2.4, 0.26, { fontSize: 10.5, bold: true, color: INK });
    U.T(s, d, x + 0.15, 6.18, 2.4, 0.24, { fontSize: 8.5, color: '5B5346' });
  });

  U.panel(s, 9.85, 2.2, 2.97, 2.55, 'FFF8F5', CORAL, 'REMOTE CLUSTER', CORAL, true);
  U.node(s, 10.1, 2.62, 2.47, 0.72, C.AGT.c, 'APIHUB Agent', 'probes services for specs', { fs: 10.5, fss: 8, subColor: 'FDEAE4' });
  U.vArrow(s, 11.33, 3.4, 3.66, CORAL);
  U.box(s, 10.1, 3.72, 2.47, 0.82, W, { line: CORAL, lw: 1.25, r: 0.1, dash: true });
  U.T(s, 'Workload services', 10.25, 3.82, 2.2, 0.26, { fontSize: 9.5, bold: true, color: CORAL });
  [0, 1, 2, 3, 4].forEach(i => U.circle(s, 10.28 + i * 0.42, 4.12, 0.26, 'F6C3B5'));
  U.T(s, '↑ register · ↓ discover', 9.85, 4.8, 2.97, 0.28, { fontSize: 8.5, color: SOFT, align: 'center' });

  const outside = [['Identity provider', SOFT], ['LLM API (optional)', SOFT], ['Maven / OCI registries', SOFT]];
  outside.forEach(([t, c], i) => {
    U.box(s, 9.85, 5.2 + i * 0.56, 2.97, 0.46, W, { line: LINE, lw: 1.25, r: 0.1 });
    U.T(s, t, 9.85, 5.2 + i * 0.56, 2.97, 0.46, { fontSize: 9.5, color: INK, align: 'center', valign: 'middle' });
  });
  U.foot(s);
}

/* ============================================================ 5 container catalogue */
{
  const s = U.slide();
  U.head(s, 'Level 2 · catalogue', 'Seven containers in detail', 'Repository, technology, port and the state each one owns.', TEAL);
  const rows = ['BE', 'UI', 'BTC', 'LNT', 'ABE', 'AGT', 'JTC'].map(k => [k, C[k]]);
  const info = {
    BE:  ['qubership-apihub-backend', 'apihub database, optional S3', '39 REST controllers, MCP server, AI chat, cron cleanup, DB migrations'],
    UI:  ['qubership-apihub-ui', 'stateless', 'Portal and Agents single-page apps plus the reverse proxy in front of everything'],
    BTC: ['qubership-apihub-build-task-consumer', 'stateless — scale to 3–6', 'Runs PackageVersionBuilder: parse, normalize, diff, changelog, export'],
    LNT: ['qubership-api-linter-service', 'apihub_linter database', 'Spectral and AI engines, rulesets, bulk validation, version scoring, MCP endpoint'],
    ABE: ['qubership-apihub-agents-backend', 'agents database', 'Agent registry and heartbeats, discovery orchestration, snapshot promotion'],
    AGT: ['qubership-apihub-agent', 'stateless', 'Six discovery runners in parallel per service, plus a proxy into the cluster'],
    JTC: ['qubership-apihub-java-task-consumer', 'stateless', 'japicmp and jdeps pipelines; the backend java-builders queue is specified only'],
  };
  rows.forEach(([k, c], i) => {
    const y = 2.26 + i * 0.61;
    U.box(s, 0.55, y, 12.27, 0.55, i % 2 ? W : 'FBF6EE', { line: LINE, lw: 1, r: 0.08 });
    U.bar(s, 0.7, y + 0.13, 0.16, 0.32, c.c);
    U.T(s, c.name, 1.0, y + 0.06, 2.0, 0.28, { fontSize: 11, bold: true, color: INK });
    U.T(s, c.port, 1.0, y + 0.32, 2.0, 0.22, { fontSize: 8.5, color: c.c, bold: true });
    U.T(s, c.tech, 3.05, y + 0.17, 2.4, 0.26, { fontSize: 9.5, color: '5B5346' });
    U.T(s, info[k][0], 5.5, y + 0.17, 2.55, 0.26, { fontSize: 9, color: SOFT });
    U.T(s, info[k][1], 8.1, y + 0.17, 1.75, 0.26, { fontSize: 9, color: '5B5346' });
    U.T(s, info[k][2], 9.95, y + 0.07, 2.75, 0.42, { fontSize: 8, color: '5B5346' });
  });
  const hdr = [['Container', 1.0], ['Technology', 3.05], ['Repository', 5.5], ['State', 8.1], ['Owns', 9.95]];
  hdr.forEach(([t, x]) => U.T(s, t.toUpperCase(), x, 2.02, 2.4, 0.22, { fontSize: 8, bold: true, color: SOFT, charSpacing: 1 }));
  U.box(s, 0.55, 6.95, 12.27, 0.0, W, { r: 0 });
  U.T(s, 'Plus 12 shared TypeScript libraries — not deployed on their own, but they are where parsing, diffing and rendering actually happen.',
    0.55, 6.66, 12.2, 0.3, { fontSize: 10.5, color: SOFT });
  U.foot(s);
}

/* ============================================================ 6 L3 backend */
{
  const s = U.slide();
  U.head(s, 'Level 3', 'Inside the backend', 'One Go process, six clearly separated concerns — this is the busiest container in the system.', BLUE);
  const groups = [
    ['HTTP edge', BLUE, SKY, [['Router + middleware', 'gorilla/mux, Prometheus'], ['Health / system info', '/live /ready']]],
    ['Security', CORAL, BLUSH, [['Auth strategies', 'go-guardian union'], ['IDP manager', 'SAML · OIDC · LDAP'], ['Roles & permissions', 'system · package · custom']]],
    ['Catalogue', BLUE, SKY, [['Packages', 'workspaces, groups'], ['Versions', 'revisions, references'], ['Operations', 'tags, groups'], ['Comparisons', 'changes, summaries'], ['Contracts', 'DDL and MCP'], ['Search', 'v3 / v4 full text']]],
    ['Build & export', NAVYC, SKY, [['Build service', 'queue, ownership'], ['Build results', 'unpack, store'], ['Export', 'xlsx, ZIP, async'], ['Transformation', 'merged specs'], ['Notifications', 'Olric topic']]],
    ['AI & integration', PLUM, 'F6DCE9', [['MCP server', 'streamable HTTP'], ['AI chat', 'SSE, tool loop'], ['Playground proxy', 'allowed hosts']]],
    ['Operations & data', SOFT, SAND, [['Cleanup jobs', '8 cron schedules'], ['Migrations', 'schema + operations'], ['Repositories', '~26, go-pg'], ['Object storage', 'minio-go']]],
  ];
  groups.forEach(([name, c, tint, items], gi) => {
    const col = gi % 3, row = Math.floor(gi / 3);
    const x = 0.55 + col * 4.13, y = 2.25 + row * 2.32;
    U.panel(s, x, y, 3.88, 2.14, tint, c, name.toUpperCase(), c);
    items.forEach(([t, d], i) => {
      const cx = x + 0.14 + (i % 2) * 1.82, cy = y + 0.42 + Math.floor(i / 2) * 0.54;
      U.box(s, cx, cy, 1.76, 0.48, W, { line: 'FFFFFF', r: 0.08 });
      U.T(s, t, cx + 0.09, cy + 0.04, 1.6, 0.24, { fontSize: 9, bold: true, color: INK });
      U.T(s, d, cx + 0.09, cy + 0.26, 1.6, 0.2, { fontSize: 7.5, color: '5B5346' });
    });
  });
  U.foot(s);
}

/* ============================================================ 7 L3 UI */
{
  const s = U.slide();
  U.head(s, 'Level 3', 'Inside the web interface', 'One nginx container serves two applications and routes everything else onward.', '0EA5E9');
  U.node(s, 0.55, 2.25, 12.27, 0.66, C.UI.c, 'nginx  ·  single entry point',
    '/portal and /agents static · /api → backend · /api-linter → linter · /agents-backend → agents backend · no buffering for MCP and chat streams',
    { fs: 12, fss: 9, subColor: 'E3F3FD' });
  const apps = [
    ['Portal SPA', 'packages/portal', SKY, BLUE, ['Catalogue navigation', 'Version pages: operations, changes, deprecated, documents', 'Compare versions and operations', 'Dashboard editor and publish dialog', 'Settings, roles, rulesets, tokens', 'AI chat and contracts tab']],
    ['Agents SPA', 'packages/agents', BLUSH, CORAL, ['Agents and namespaces', 'Service discovery results', 'Snapshots and promotion', 'Namespace security checks']],
  ];
  apps.forEach(([t, p, tint, c, items], i) => {
    const x = 0.55 + i * 4.4;
    U.panel(s, x, 3.15, 4.15, 2.5, tint, c, t.toUpperCase() + '  ·  ' + p, c);
    items.forEach((it, j) => {
      U.T(s, '·  ' + it, x + 0.16, 3.55 + j * 0.32, 3.85, 0.3, { fontSize: 9.5, color: '5B5346' });
    });
  });
  U.panel(s, 9.35, 3.15, 3.47, 2.5, 'F6DCE9', PLUM, 'SHARED PACKAGE', PLUM);
  ['Entities: api-types, contract-types', 'Hooks and react-query clients', 'MUI theme and widgets', 'Storybook showcase'].forEach((t, j) =>
    U.T(s, '·  ' + t, 9.5, 3.55 + j * 0.32, 3.2, 0.3, { fontSize: 9.5, color: '5B5346' }));
  U.T(s, 'Rendering is delegated to shared web components', 0.55, 5.85, 6, 0.3, { fontSize: 11, bold: true, color: INK });
  const wc = [['apispec-view', PLUM], ['operation-view', PLUM], ['diff-operation-view', PLUM], ['rest-playground', TEAL], ['class-view', LEAF], ['api-doc-viewer', INDIGO]];
  wc.forEach(([t, c], i) => U.pill(s, 0.55 + i * 2.05, 6.22, 1.9, 0.42, c, t, W, 9));
  U.foot(s);
}

/* ============================================================ 8 L3 workers */
{
  const s = U.slide();
  U.head(s, 'Level 3', 'The two workers', 'Both follow the same pull pattern: ask the backend for a task, do the work, post the result back.', NAVYC);
  const lanes = [
    [C.BTC, 'qubership-apihub-build-task-consumer', SKY, [
      ['Task poller', 'RxJS interval asks /api/v2/builders/{id}/tasks'],
      ['Schema validation', 'ajv over the build config'],
      ['PackageVersionBuilder', 'api-processor: 7 builders, 10 strategies'],
      ['Resolvers', 'fetch previous versions from the backend'],
      ['Result sender', 'ZIP to /api/v3/…/publish/{id}/status'],
    ], 'Live and scaled in production'],
    [C.JTC, 'qubership-apihub-java-task-consumer', BUTTER, [
      ['Task poller', 'asks /api/v2/java-builders/{id}/tasks'],
      ['Build executor', 'maps build type to a pipeline'],
      ['jdiff-engine', 'ApiReport · ApiDiff · UpgradeImpact'],
      ['Jar resolver', 'Maven coordinates or OCI image layers'],
      ['Result packager', 'report.json in a ZIP'],
    ], 'Backend endpoints not implemented yet'],
  ];
  lanes.forEach(([k, repo, tint, items, note], i) => {
    const x = 0.55 + i * 6.4;
    U.panel(s, x, 2.25, 5.87, 4.05, tint, k.c, k.name.toUpperCase(), k.c, i === 1);
    U.T(s, repo, x + 0.16, 2.52, 5.5, 0.26, { fontSize: 8.5, color: SOFT });
    items.forEach(([t, d], j) => {
      const y = 2.85 + j * 0.62;
      U.box(s, x + 0.16, y, 5.55, 0.54, W, { line: 'FFFFFF', r: 0.08 });
      U.circle(s, x + 0.3, y + 0.14, 0.26, k.c);
      U.T(s, String(j + 1), x + 0.3, y + 0.17, 0.26, 0.22, { fontSize: 9, bold: true, color: W, align: 'center' });
      U.T(s, t, x + 0.68, y + 0.06, 1.9, 0.26, { fontSize: 10, bold: true, color: INK });
      U.T(s, d, x + 2.6, y + 0.08, 3.0, 0.4, { fontSize: 8.5, color: '5B5346' });
    });
    U.pill(s, x + 0.16, 5.95, 5.55, 0.3, k.c, note, W, 9);
  });
  U.T(s, 'The backend never pushes work: a worker that dies simply stops polling, and the task returns to the queue.',
    0.55, 6.55, 12.2, 0.3, { fontSize: 11, color: SOFT });
  U.foot(s);
}

/* ============================================================ 9 L3 linter */
{
  const s = U.slide();
  U.head(s, 'Level 3', 'Inside the linter', 'Event-driven: a publish on the bus starts the whole chain without any pipeline wiring.', TEAL);
  const chain = [
    ['Publish event', 'Olric topic version-published', INDIGO],
    ['Version task', 'fetch documents from the backend', BLUE],
    ['Document tasks', 'fan-out into a worker pool', TEAL],
    ['Linter selector', 'engine per API type and package', LEAF],
    ['Result + score', 'stored in apihub_linter', MUSTARD],
  ];
  chain.forEach(([t, d, c], i) => {
    const x = 0.55 + i * 2.55;
    U.box(s, x, 2.3, 2.25, 0.95, c, { r: 0.12 });
    U.T(s, t, x + 0.12, 2.42, 2.0, 0.3, { fontSize: 11, bold: true, color: W });
    U.T(s, d, x + 0.12, 2.72, 2.0, 0.45, { fontSize: 8.5, color: 'FFFFFF' });
    if (i < 4) s.addShape(pres.ShapeType.triangle, { x: x + 2.32, y: 2.68, w: 0.14, h: 0.2, fill: { color: SOFT }, line: { color: SOFT }, rotate: 90 });
  });
  const eng = [
    ['Spectral engine', TEAL, MINT, ['Bundled CLI binary in the image', 'Rulesets managed in the Portal', 'OpenAPI and AsyncAPI documents', 'The default path for every publish']],
    ['AI engine', INDIGO, LILAC, ['OpenAI-compatible client', 'Rate limited, opt-in per package', 'Catches what rules cannot express', 'Disabled by default']],
    ['Vacuum engine', SOFT, SAND, ['Binary and rules ship in the image', 'Not wired into the selector', 'Looks available from outside', 'Worth a decision: use or remove']],
  ];
  eng.forEach(([t, c, tint, items], i) => {
    const x = 0.55 + i * 4.13;
    U.panel(s, x, 3.55, 3.88, 2.45, tint, c, t.toUpperCase(), c, i === 2);
    items.forEach((it, j) => U.T(s, '·  ' + it, x + 0.16, 3.95 + j * 0.42, 3.6, 0.4, { fontSize: 9.5, color: '5B5346' }));
  });
  U.box(s, 0.55, 6.2, 12.27, 0.6, MINT, { r: 0.12 });
  U.T(s, 'The service also exposes its own MCP endpoint — an agent can ask “what is wrong with this version?” and get the issue list back.',
    0.85, 6.36, 11.7, 0.3, { fontSize: 11.5, color: '1F5F58' });
  U.foot(s);
}

/* ============================================================ 10 L3 discovery pair */
{
  const s = U.slide();
  U.head(s, 'Level 3', 'The discovery pair', 'Agents Backend stays in the APIHUB cluster; the Agent is deployed into the cluster being inspected.', CORAL);
  U.panel(s, 0.55, 2.25, 5.9, 4.1, MINT, LEAF, 'AGENTS BACKEND  ·  in the APIHUB namespace', LEAF);
  [['Agent registry', 'registration and heartbeats every ~30 s'],
   ['Discovery orchestration', 'workspace-scoped runs against one agent'],
   ['Snapshot service', 'packages found specs and publishes versions'],
   ['Namespace security', 'auth-check processes and Excel reports'],
   ['Proxy', 'forwards UI calls through the agent']].forEach(([t, d], i) => {
    const y = 2.68 + i * 0.72;
    U.box(s, 0.75, y, 5.5, 0.62, W, { line: 'FFFFFF', r: 0.08 });
    U.T(s, t, 0.9, y + 0.08, 2.1, 0.26, { fontSize: 10, bold: true, color: INK });
    U.T(s, d, 3.05, y + 0.08, 3.05, 0.44, { fontSize: 8.5, color: '5B5346' });
  });
  U.panel(s, 6.7, 2.25, 6.12, 4.1, BLUSH, CORAL, 'APIHUB AGENT  ·  in the target cluster', CORAL, true);
  [['Registration', 'announces itself, then heartbeats'],
   ['Cloud service', 'client-go lists namespaces, services, routes'],
   ['Document discovery', 'runs every runner in parallel per service']].forEach(([t, d], i) => {
    const y = 2.68 + i * 0.62;
    U.box(s, 6.9, y, 5.72, 0.54, W, { line: 'FFFFFF', r: 0.08 });
    U.T(s, t, 7.05, y + 0.05, 2.0, 0.26, { fontSize: 10, bold: true, color: INK });
    U.T(s, d, 9.1, y + 0.06, 3.4, 0.42, { fontSize: 8.5, color: '5B5346' });
  });
  U.T(s, 'SIX DISCOVERY RUNNERS — a plug-in point', 6.9, 4.62, 5.7, 0.26, { fontSize: 9, bold: true, color: CORAL, charSpacing: 1 });
  const runners = ['REST', 'GraphQL', 'AsyncAPI', 'Markdown', 'JSON Schema', 'Generic'];
  runners.forEach((t, i) => {
    const x = 6.9 + (i % 3) * 1.93, y = 4.95 + Math.floor(i / 3) * 0.56;
    U.pill(s, x, y, 1.8, 0.46, CORAL, t, W, 10);
  });
  U.T(s, 'Adding a seventh means one file implementing the runner interface plus one line registering it.',
    6.9, 6.12, 5.72, 0.3, { fontSize: 9, color: '8A5A4A' });
  U.foot(s);
}

/* ============================================================ 11 L4 backend code */
{
  const s = U.slide();
  U.head(s, 'Level 4', 'The backend request pipeline', 'Every request walks the same seven stages; two side systems hang off it.', CORAL);
  const stages = [['mux.Router', 'Service.go'], ['Middleware', 'metrics, deadlines'], ['Security', 'go-guardian union'],
                  ['Controller', '39 of them'], ['Service', 'business logic'], ['Repository', 'go-pg'], ['Entity', 'database rows']];
  stages.forEach(([t, d], i) => {
    const x = 0.55 + i * 1.78;
    U.box(s, x, 2.3, 1.6, 0.85, i < 3 ? BLUE : (i < 5 ? NAVYC : SOFT), { r: 0.1 });
    U.T(s, t, x + 0.08, 2.42, 1.44, 0.3, { fontSize: 10, bold: true, color: W, align: 'center' });
    U.T(s, d, x + 0.08, 2.72, 1.44, 0.3, { fontSize: 8, color: 'FFFFFF', align: 'center' });
    if (i < 6) s.addShape(pres.ShapeType.triangle, { x: x + 1.64, y: 2.63, w: 0.12, h: 0.18, fill: { color: SOFT }, line: { color: SOFT }, rotate: 90 });
  });
  U.panel(s, 0.55, 3.45, 6.1, 3.0, BLUSH, CORAL, 'AUTHENTICATION STRATEGIES  ·  tried in order', CORAL);
  const strat = ['Cookie JWT', 'Bearer JWT', 'Refresh token', 'API key', 'Personal token', 'Custom JWT', 'Ephemeral file token'];
  strat.forEach((t, i) => {
    const x = 0.75 + (i % 2) * 2.88, y = 3.85 + Math.floor(i / 2) * 0.55;
    U.box(s, x, y, 2.75, 0.46, W, { line: 'FFFFFF', r: 0.1 });
    U.T(s, t, x + 0.12, y, 2.5, 0.46, { fontSize: 9.5, color: INK, valign: 'middle' });
  });
  U.T(s, 'All of them end in one security context that the role service reads.', 0.75, 6.0, 5.7, 0.3, { fontSize: 9, color: '8A5A4A' });
  U.panel(s, 6.85, 3.45, 5.97, 3.0, SAND, SOFT, 'SCHEDULED JOBS  ·  robfig/cron', SOFT);
  const jobs = [['Revisions', '0 21 * * 0'], ['Comparisons', '0 5 * * 0'], ['Soft-deleted data', '0 22 * * 5'], ['Unreferenced data', '0 15 * * 6'],
                ['Maintenance VACUUM', '0 2 * * 1'], ['Builds', '0 1 * * 0'], ['Ephemeral files', '*/5 * * * *'], ['AI chat retention', '15 3 * * *']];
  jobs.forEach(([t, cr], i) => {
    const y = 3.85 + i * 0.31;
    U.T(s, t, 7.05, y, 3.0, 0.28, { fontSize: 9.5, color: INK });
    U.T(s, cr, 10.2, y, 2.4, 0.28, { fontSize: 9, color: SOFT, fontFace: 'Courier New' });
  });
  U.foot(s);
}

/* ============================================================ 12 L4 registries */
{
  const s = U.slide();
  U.head(s, 'Level 4', 'One type, two registries', 'Everything the processing stack does branches on a single union type — this is the extension point.', INDIGO);
  U.box(s, 4.55, 2.3, 4.25, 2.35, INK, { r: 0.16 });
  U.T(s, 'SpecType', 4.7, 2.45, 3.95, 0.4, { fontFace: A, fontSize: 20, bold: true, color: W, align: 'center' });
  U.T(s, 'api-unifier/src/spec-type.ts', 4.7, 2.85, 3.95, 0.26, { fontSize: 8.5, color: '9B93A8', align: 'center' });
  const types = ['openapi-3.0', 'openapi-3.1', 'json-schema-04', 'json-schema-06', 'json-schema-07', 'asyncapi-3', 'graphapi', 'ddlapi-1.0'];
  types.forEach((t, i) => {
    const x = 4.68 + (i % 2) * 2.0, y = 3.2 + Math.floor(i / 2) * 0.34;
    U.pill(s, x, y, 1.9, 0.28, '32354A', t, 'D7D2E8', 8.5);
  });
  const reg = [
    ['RULES', 'api-unifier', 'Normalization rules per type — resolve refs, merge schemas, hash', BLUE, 0.55],
    ['COMPARE_ENGINES_MAP', 'api-diff', 'A comparison engine per type, producing classified changes', PLUM, 9.27],
  ];
  reg.forEach(([t, lib, d, c, x]) => {
    U.box(s, x, 2.3, 3.55, 2.35, c, { r: 0.16 });
    U.T(s, t, x + 0.18, 2.45, 3.2, 0.35, { fontSize: 13, bold: true, color: W });
    U.T(s, lib, x + 0.18, 2.8, 3.2, 0.26, { fontSize: 9, color: 'FFFFFF' });
    U.T(s, d, x + 0.18, 3.15, 3.2, 1.0, { fontSize: 10, color: 'FFFFFF' });
  });
  // SpecType keys both maps: arrows point outward from the type
  U.bar(s, 4.18, 3.425, 0.32, 0.05, BLUE);
  s.addShape(pres.ShapeType.triangle, { x: 4.1, y: 3.35, w: 0.15, h: 0.2, fill: { color: BLUE }, line: { color: BLUE }, rotate: 270 });
  U.bar(s, 8.86, 3.425, 0.32, 0.05, PLUM);
  s.addShape(pres.ShapeType.triangle, { x: 9.12, y: 3.35, w: 0.15, h: 0.2, fill: { color: PLUM }, line: { color: PLUM }, rotate: 90 });
  U.T(s, 'keys', 3.9, 3.05, 0.85, 0.26, { fontSize: 8.5, color: SOFT, align: 'center' });
  U.T(s, 'keys', 8.6, 3.05, 0.85, 0.26, { fontSize: 8.5, color: SOFT, align: 'center' });
  U.panel(s, 0.55, 4.95, 12.27, 1.45, SAND, SOFT, 'ADDING A TYPE TOUCHES EIGHT PLACES', SOFT);
  const steps = ['spec-type.ts', 'RULES map', 'compare engine', 'api-processor builder', 'backend ApiType', 'UI api-types.ts', 'consumer schema', 'agent runner'];
  steps.forEach((t, i) => {
    const x = 0.72 + i * 1.51;
    U.box(s, x, 5.42, 1.4, 0.6, W, { line: LINE, lw: 1, r: 0.1 });
    U.T(s, String(i + 1), x + 0.1, 5.48, 1.2, 0.22, { fontSize: 8, bold: true, color: INDIGO });
    U.T(s, t, x + 0.1, 5.67, 1.2, 0.3, { fontSize: 8.5, color: INK });
    if (i < 7) U.T(s, '›', x + 1.42, 5.55, 0.12, 0.3, { fontSize: 12, color: SOFT });
  });
  U.T(s, 'A third registry — the seven builders inside api-processor — keys on the API type rather than the spec type; it is on the next slide. DDLAPI went through this whole path in 2026.', 0.55, 6.55, 12.2, 0.3, { fontSize: 10.5, color: SOFT });
  U.foot(s);
}

/* ============================================================ 13 L4 processor */
{
  const s = U.slide();
  U.head(s, 'Level 4', 'The build orchestrator', 'PackageVersionBuilder picks one strategy for the requested build type and one builder per document.', NAVYC);
  U.node(s, 3.6, 2.25, 6.1, 0.72, NAVYC, 'PackageVersionBuilder', 'api-processor/src/builder.ts — registers seven builders, selects one strategy',
    { fs: 13, fss: 9, subColor: 'D7E2F8', align: 'center' });
  U.T(s, 'SEVEN API BUILDERS  ·  one per document kind', 0.55, 3.2, 6, 0.28, { fontSize: 9.5, bold: true, color: BLUE, charSpacing: 1 });
  const builders = [['rest', BLUE], ['graphql', PLUM], ['asyncapi', TEAL], ['ddl', CLAY], ['mcp', CORAL], ['text', SOFT], ['unknown', SOFT]];
  builders.forEach(([t, c], i) => {
    const x = 0.55 + (i % 4) * 1.55, y = 3.55 + Math.floor(i / 4) * 0.62;
    U.box(s, x, y, 1.42, 0.52, c, { r: 0.1 });
    U.T(s, t, x, y, 1.42, 0.52, { fontSize: 10, bold: true, color: W, align: 'center', valign: 'middle' });
  });
  U.T(s, 'parse › build document › build operations › compare › dump', 0.55, 4.85, 6.2, 0.28, { fontSize: 9, color: SOFT });
  U.T(s, 'TEN STRATEGIES  ·  one per build type', 6.85, 3.2, 6, 0.28, { fontSize: 9.5, bold: true, color: PLUM, charSpacing: 1 });
  const strategies = [['build', PLUM], ['changelog', PLUM], ['prefix-groups-changelog', PLUM],
    ['exportVersion', TEAL], ['exportRestDocument', TEAL], ['exportRestOperationsGroup', TEAL],
    ['exportGraphqlOperationsGroup', TEAL], ['exportAsyncapiOperationsGroup', TEAL],
    ['documentGroup (deprecated)', SOFT], ['mergedSpecification (deprecated)', SOFT]];
  strategies.forEach(([t, c], i) => {
    const x = 6.85 + (i % 2) * 3.0, y = 3.55 + Math.floor(i / 2) * 0.44;
    U.box(s, x, y, 2.88, 0.37, c === SOFT ? SAND : (c === PLUM ? 'F6DCE9' : MINT), { r: 0.08, line: LINE });
    U.T(s, t, x + 0.12, y, 2.65, 0.37, { fontSize: 8.5, color: c === SOFT ? SOFT : INK, valign: 'middle' });
  });
  U.box(s, 0.55, 5.55, 6.2, 0.95, SKY, { r: 0.12 });
  U.T(s, 'What a build actually produces', 0.75, 5.7, 5.6, 0.28, { fontSize: 11, bold: true, color: NAVYC });
  U.T(s, 'Documents, operations, classified changes, backward-compatibility findings and a result index — packed into one ZIP the backend unpacks.',
    0.75, 5.98, 5.8, 0.45, { fontSize: 9.5, color: '2C4470' });
  U.foot(s);
}

/* ============================================================ 14 deployment */
{
  const s = U.slide();
  U.head(s, 'Deployment', 'What runs where', 'One umbrella Helm chart, one ingress, three databases — and a separate chart for the Java worker.', SOFT);
  U.panel(s, 0.55, 2.25, 8.9, 4.35, 'F7FAFF', BLUE, 'KUBERNETES  ·  helm-templates/qubership-apihub', BLUE, true);
  U.node(s, 0.8, 2.62, 8.4, 0.5, SOFT, 'Ingress  ·  http and https with a TLS secret', null, { fs: 10, align: 'center' });
  const deps = [
    ['UI', C.UI.c, '1 replica'], ['Backend', C.BE.c, '1 · 3 CPU / 3 Gi'], ['Build Consumer', C.BTC.c, '3–6 replicas'],
    ['Linter', C.LNT.c, '1 · 1 Gi'], ['Agents Backend', C.ABE.c, '1 · 256 Mi'], ['Java Consumer', C.JTC.c, 'separate chart'],
  ];
  deps.forEach(([t, c, r], i) => {
    const x = 0.8 + (i % 3) * 2.87, y = 3.3 + Math.floor(i / 3) * 0.95;
    U.box(s, x, y, 2.7, 0.8, c, { r: 0.1, dash: i === 5 });
    U.T(s, t, x + 0.14, y + 0.1, 2.4, 0.3, { fontSize: 11, bold: true, color: W });
    U.T(s, r, x + 0.14, y + 0.42, 2.4, 0.26, { fontSize: 8.5, color: 'FFFFFF' });
  });
  ['PostgreSQL 14+  ·  apihub, apihub_linter, agents', 'Olric  ·  embedded in backend and linter pods', 'S3 / MinIO  ·  optional'].forEach((t, i) => {
    U.box(s, 0.8, 5.3 + i * 0.42, 8.4, 0.36, SAND, { r: 0.08, line: LINE });
    U.T(s, t, 0.95, 5.3 + i * 0.42, 8.1, 0.36, { fontSize: 9.5, color: INK, valign: 'middle' });
  });
  U.panel(s, 9.7, 2.25, 3.12, 2.0, 'FFF8F5', CORAL, 'REMOTE CLUSTERS', CORAL, true);
  U.node(s, 9.9, 2.65, 2.72, 0.6, C.AGT.c, 'APIHUB Agent', 'one per cluster', { fs: 10, fss: 8, subColor: 'FDEAE4' });
  U.T(s, 'Service account with permission to list namespaces and services.', 9.9, 3.35, 2.72, 0.7, { fontSize: 8.5, color: '8A5A4A' });
  U.panel(s, 9.7, 4.45, 3.12, 2.15, SAND, SOFT, 'ALSO IN THE CHART', SOFT);
  ['Prometheus ServiceMonitor', 'Two Grafana dashboards', 'Config and secrets per service', 'Quickstart: Postgres, Keycloak, Superset', 'Compose variants for local runs'].forEach((t, i) =>
    U.T(s, '·  ' + t, 9.88, 4.85 + i * 0.32, 2.8, 0.3, { fontSize: 8.5, color: '5B5346' }));
  U.foot(s);
}

/* ============================================================ 15 flow: publish */
{
  const s = U.slide();
  U.head(s, 'Dynamic view', 'Publishing a version, step by step', 'Four participants; the worker does the heavy lifting and never holds state.', CORAL);
  const lanes = [['UI / CI', C.UI.c], ['Backend', C.BE.c], ['Build Consumer', C.BTC.c], ['Linter', C.LNT.c]];
  const laneY = i => 2.5 + i * 1.08;
  lanes.forEach(([t, c], i) => {
    U.box(s, 0.55, laneY(i) - 0.24, 12.27, 0.92, i % 2 ? 'FBF6EE' : W, { line: LINE, lw: 1, r: 0.08 });
    U.bar(s, 0.7, laneY(i) - 0.1, 0.14, 0.64, c);
    U.T(s, t, 0.95, laneY(i) - 0.1, 1.5, 0.64, { fontSize: 10, bold: true, color: INK, valign: 'middle' });
  });
  const steps = [
    [0, 'Upload sources', 'multipart or ZIP'],
    [1, 'Create build task', 'stored in PostgreSQL'],
    [2, 'Poll and receive', 'task ZIP with config'],
    [2, 'Parse · normalize · diff', 'api-processor pipeline'],
    [1, 'Store results', 'documents, operations, changes'],
    [1, 'Publish event', 'Olric topic'],
    [3, 'Lint and score', 'Spectral, optional AI'],
  ];
  const x0 = 2.6, colW = 1.48;
  steps.forEach(([lane, t, d], i) => {
    const x = x0 + i * colW;
    U.box(s, x, laneY(lane) - 0.14, 1.36, 0.72, lanes[lane][1], { r: 0.1 });
    U.circle(s, x + 0.08, laneY(lane) - 0.08, 0.26, 'FFFFFF');
    U.T(s, String(i + 1), x + 0.08, laneY(lane) - 0.05, 0.26, 0.22, { fontSize: 9, bold: true, color: lanes[lane][1], align: 'center' });
    U.T(s, t, x + 0.08, laneY(lane) + 0.18, 1.2, 0.22, { fontSize: 8.5, bold: true, color: W });
    U.T(s, d, x + 0.08, laneY(lane) + 0.38, 1.2, 0.2, { fontSize: 7, color: 'FFFFFF' });
    if (i > 0) {
      const prev = steps[i - 1][0], px = x0 + (i - 1) * colW + 1.36;
      U.link(s, px, laneY(prev) + 0.22, x, laneY(lane) + 0.22, SOFT);
    }
  });
  U.box(s, 0.55, 6.35, 12.27, 0.5, SAND, { r: 0.1 });
  U.T(s, 'Steps 3 and 4 repeat for every document in the package; step 7 happens asynchronously, so publishing never waits for linting.',
    0.85, 6.35, 11.7, 0.5, { fontSize: 10.5, color: '5B5346', valign: 'middle' });
  U.foot(s);
}

/* ============================================================ 16 flow: discovery */
{
  const s = U.slide();
  U.head(s, 'Dynamic view', 'Finding APIs already running', 'The only flow that starts outside APIHUB — in someone else’s cluster.', CORAL);
  const lanes = [['User / Agents SPA', C.UI.c], ['Agents Backend', C.ABE.c], ['Agent', C.AGT.c], ['Cluster services', SOFT]];
  const laneY = i => 2.5 + i * 1.08;
  lanes.forEach(([t, c], i) => {
    U.box(s, 0.55, laneY(i) - 0.24, 12.27, 0.92, i % 2 ? 'FBF6EE' : W, { line: LINE, lw: 1, r: 0.08 });
    U.bar(s, 0.7, laneY(i) - 0.1, 0.14, 0.64, c);
    U.T(s, t, 0.95, laneY(i) - 0.1, 1.6, 0.64, { fontSize: 10, bold: true, color: INK, valign: 'middle' });
  });
  const steps = [
    [2, 'Register', 'on startup, then heartbeat'],
    [0, 'Run discovery', 'pick namespace and workspace'],
    [1, 'Forward request', 'to the chosen agent'],
    [3, 'List services', 'via the Kubernetes API'],
    [3, 'Probe endpoints', 'six runners in parallel'],
    [1, 'Return findings', 'documents and failed calls'],
    [1, 'Promote snapshot', 'publish versions to the Portal'],
  ];
  const x0 = 2.7, colW = 1.46;
  steps.forEach(([lane, t, d], i) => {
    const x = x0 + i * colW;
    U.box(s, x, laneY(lane) - 0.14, 1.34, 0.72, lanes[lane][1], { r: 0.1 });
    U.circle(s, x + 0.08, laneY(lane) - 0.08, 0.26, 'FFFFFF');
    U.T(s, String(i + 1), x + 0.08, laneY(lane) - 0.05, 0.26, 0.22, { fontSize: 9, bold: true, color: lanes[lane][1], align: 'center' });
    U.T(s, t, x + 0.08, laneY(lane) + 0.18, 1.18, 0.22, { fontSize: 8.5, bold: true, color: W });
    U.T(s, d, x + 0.08, laneY(lane) + 0.38, 1.18, 0.2, { fontSize: 7, color: 'FFFFFF' });
    if (i > 0) {
      const prev = steps[i - 1][0], px = x0 + (i - 1) * colW + 1.34;
      U.link(s, px, laneY(prev) + 0.22, x, laneY(lane) + 0.22, SOFT);
    }
  });
  U.box(s, 0.55, 6.35, 12.27, 0.5, SAND, { r: 0.1 });
  U.T(s, 'Nothing is published automatically: discovery produces a snapshot, and a person decides whether it becomes a catalogue version.',
    0.85, 6.35, 11.7, 0.5, { fontSize: 10.5, color: '5B5346', valign: 'middle' });
  U.foot(s);
}

/* ============================================================ 17 flow: MCP */
{
  const s = U.slide();
  U.head(s, 'Dynamic view', 'How an AI agent reads the catalogue', 'Two paths into the same tools: an external client over MCP, or the built-in chat.', PLUM);
  U.panel(s, 0.55, 2.25, 6.1, 4.15, LILAC, INDIGO, 'PATH A  ·  EXTERNAL MCP CLIENT', INDIGO);
  [['Client initialises', 'Cursor, Claude or a bot authenticates with an API key or personal token'],
   ['Session opens', 'streamable HTTP transport, idle timeout 15 minutes'],
   ['Tool call', 'search, specification, diff or document'],
   ['Backend answers', 'access control applied per user before anything is returned']].forEach(([t, d], i) => {
    const y = 2.68 + i * 0.9;
    U.box(s, 0.75, y, 5.7, 0.78, W, { line: 'FFFFFF', r: 0.1 });
    U.circle(s, 0.9, y + 0.15, 0.34, INDIGO);
    U.T(s, String(i + 1), 0.9, y + 0.22, 0.34, 0.24, { fontSize: 10, bold: true, color: W, align: 'center' });
    U.T(s, t, 1.38, y + 0.08, 2.2, 0.28, { fontSize: 10.5, bold: true, color: INK });
    U.T(s, d, 1.38, y + 0.34, 4.9, 0.4, { fontSize: 8.5, color: '5B5346' });
  });
  U.panel(s, 6.85, 2.25, 5.97, 4.15, 'F6DCE9', PLUM, 'PATH B  ·  THE BUILT-IN CHAT', PLUM);
  [['Question arrives', 'streamed over server-sent events from the Portal'],
   ['Model plans', 'the same catalogue tools plus a clarification tool'],
   ['Loop runs', 'up to ten tool calls per turn, each one access-checked'],
   ['Answer streams back', 'with generated files offered as temporary downloads']].forEach(([t, d], i) => {
    const y = 2.68 + i * 0.9;
    U.box(s, 7.05, y, 5.6, 0.78, W, { line: 'FFFFFF', r: 0.1 });
    U.circle(s, 7.2, y + 0.15, 0.34, PLUM);
    U.T(s, String(i + 1), 7.2, y + 0.22, 0.34, 0.24, { fontSize: 10, bold: true, color: W, align: 'center' });
    U.T(s, t, 7.68, y + 0.08, 2.3, 0.28, { fontSize: 10.5, bold: true, color: INK });
    U.T(s, d, 7.68, y + 0.34, 4.8, 0.4, { fontSize: 8.5, color: '5B5346' });
  });
  const tools = ['search_api_operations', 'get_api_operation_specification', 'get_api_operation_diff', 'get_document'];
  tools.forEach((t, i) => U.pill(s, 0.55 + i * 3.1, 6.5, 2.95, 0.36, INK, t, '9DE8DC', 8.5));
  U.foot(s);
}

/* ============================================================ 18 divider */
U.section('02', 'The functional-technical map', 'What the platform does, and which service and technology does it', PLUM, 'F2C9DE');

/* ============================================================ 19 capability L1 */
{
  const s = U.slide();
  U.head(s, 'Capability map', 'Nine capabilities, three tiers', 'A capability is a stable statement of what the platform does — it survives refactoring.', PLUM);
  const tiers = [['core', 'CORE — the reason the product exists', SKY, NAVYC], ['differentiating', 'DIFFERENTIATING — rare in an API registry', 'F6DCE9', PLUM], ['supporting', 'SUPPORTING — needed to operate', SAND, SOFT]];
  let y = 2.25;
  tiers.forEach(([key, label, tint, c]) => {
    const caps = M.CAPABILITIES.filter(x => x.tier === key);
    const h = 1.3;
    U.panel(s, 0.55, y, 12.27, h, tint, c, label, c);
    caps.forEach((cap, i) => {
      const x = 0.75 + i * 1.98;
      U.box(s, x, y + 0.36, 1.85, 0.84, W, { line: 'FFFFFF', r: 0.1 });
      U.T(s, cap.id, x + 0.12, y + 0.42, 0.5, 0.22, { fontFace: A, fontSize: 12, bold: true, color: c });
      U.T(s, cap.name, x + 0.12, y + 0.62, 1.6, 0.36, { fontSize: 9, bold: true, color: INK });
      U.T(s, cap.l2.length + ' sub-capabilities', x + 0.12, y + 0.98, 1.6, 0.2, { fontSize: 7.5, color: SOFT });
    });
    y += h + 0.16;
  });
  U.T(s, 'Sixty sub-capabilities sit under these nine — the next slides colour them by owning service and by maturity.',
    0.55, 6.6, 12.2, 0.3, { fontSize: 11, color: SOFT });
  U.foot(s);
}

/* ============================================================ 20-22 capability grids */
function capGrid(s, mode) {
  const caps = M.CAPABILITIES, cols = caps.length, gap = 0.07;
  const cw = (12.27 - gap * (cols - 1)) / cols;
  const headY = 2.16, cellY = 2.6, ch = 0.45, rg = 0.04;
  caps.forEach((c, i) => {
    const x = 0.55 + i * (cw + gap);
    const tc = c.tier === 'core' ? NAVYC : (c.tier === 'differentiating' ? PLUM : SOFT);
    U.box(s, x, headY, cw, 0.38, tc, { r: 0.08 });
    U.T(s, c.id + ' ' + c.name, x + 0.04, headY + 0.02, cw - 0.08, 0.34, { fontSize: 7, bold: true, color: W, align: 'center', valign: 'middle' });
    c.l2.forEach((l2, r) => {
      const [lid, name, owners, tech, mat] = l2;
      const y = cellY + r * (ch + rg);
      let fill = W, line = LINE, col = INK, sub = null;
      if (mode === 'tech') { const k = owners[0]; fill = k ? C[k].c : SOFT; line = fill; col = W; sub = owners.map(o => o).join(' + ') || 'design'; }
      if (mode === 'mat') { const m = M.MATURITY[mat]; fill = m.fill; line = m.color; col = m.color; sub = m.label; }
      U.box(s, x, y, cw, ch, fill, { line, lw: 1, r: 0.07 });
      const runs = [{ text: lid + ' ', options: { bold: true } }, { text: name }];
      if (sub) runs.push({ text: '\n' + sub, options: { italic: true, fontSize: 5.5 } });
      U.T(s, runs, x + 0.04, y + 0.02, cw - 0.08, ch - 0.04, { fontSize: 6, color: col, align: 'center', valign: 'middle' });
    });
  });
}
{
  const s = U.slide();
  U.head(s, 'Capability map · level 2', 'All sixty sub-capabilities', 'The full functional picture on one page, grouped under the nine level-1 capabilities.', PLUM);
  capGrid(s, 'plain');
  U.legend(s, 0.55, 6.58, [[NAVYC, 'Core capability'], [PLUM, 'Differentiating capability'], [SOFT, 'Supporting capability'], [SAND, 'Overlays follow on the next two slides']], 9);
  U.foot(s);
}
{
  const s = U.slide();
  U.head(s, 'Technology overlay', 'Which service implements what', 'The same map, coloured by the container that owns each sub-capability. This is the functional-technical view.', BLUE);
  capGrid(s, 'tech');
  const ks = ['BE', 'UI', 'BTC', 'LNT', 'ABE', 'AGT', 'JTC', 'LIB', 'OPS'];
  ks.forEach((k, i) => {
    const x = 0.55 + i * 1.37;
    U.box(s, x, 6.62, 0.2, 0.18, C[k].c, { r: 0.04 });
    U.T(s, k + ' — ' + C[k].name, x + 0.26, 6.58, 1.12, 0.26, { fontSize: 7, color: SOFT, valign: 'middle' });
  });
  U.foot(s);
}
{
  const s = U.slide();
  U.head(s, 'Maturity overlay', 'How settled each area is', 'Assessment from code evidence: release history, deprecated paths, “pending” and “not active” markers.', LEAF);
  capGrid(s, 'mat');
  const mk2 = Object.entries(M.MATURITY);
  mk2.forEach(([k, m], i) => {
    const x = 0.55 + i * 3.1;
    U.box(s, x, 6.62, 0.2, 0.18, m.fill, { r: 0.04, line: m.color });
    U.T(s, m.label, x + 0.26, 6.58, 2.7, 0.26, { fontSize: 8, color: SOFT, valign: 'middle' });
  });
  U.foot(s);
}

/* ============================================================ 23 bubble matrix */
{
  const s = U.slide();
  U.head(s, 'Cross-check', 'Capability × container', 'Bubble size = how many sub-capabilities of that capability the container contributes to.', INDIGO);
  const ks = ['BE', 'UI', 'BTC', 'LIB', 'LNT', 'ABE', 'AGT', 'JTC', 'OPS'];
  const x0 = 3.25, colW = 1.05, y0 = 2.52, rowH = 0.4;
  ks.forEach((k, j) => {
    U.T(s, C[k].name, x0 + j * colW - 0.05, 2.12, colW, 0.46, { fontSize: 7.5, bold: true, color: C[k].c, align: 'center' });
  });
  M.CAPABILITIES.forEach((cap, i) => {
    const y = y0 + i * rowH;
    U.box(s, 0.55, y - 0.02, 2.55, rowH - 0.06, i % 2 ? 'FBF6EE' : W, { line: LINE, lw: 0.75, r: 0.06 });
    U.T(s, cap.id + '  ' + cap.name, 0.68, y - 0.02, 2.3, rowH - 0.06, { fontSize: 8.5, color: INK, valign: 'middle' });
    ks.forEach((k, j) => {
      const cnt = cap.l2.filter(l => l[2].includes(k)).length;
      if (!cnt) return;
      const d = Math.min(0.16 + cnt * 0.055, 0.38);
      const cx = x0 + j * colW + colW / 2 - d / 2;
      U.circle(s, cx, y + (rowH - 0.06) / 2 - d / 2 - 0.01, d, C[k].c);
      if (cnt >= 4) U.T(s, String(cnt), cx, y + (rowH - 0.06) / 2 - d / 2 + 0.02, d, d - 0.04, { fontSize: 7, bold: true, color: W, align: 'center' });
    });
  });
  U.box(s, 0.55, 6.28, 12.27, 0.5, SKY, { r: 0.1 });
  U.T(s, 'The backend appears in 34 of the 60 sub-capabilities and the UI in 24 — the micro-monolith shape is visible here, and it is the main argument for any future split.',
    0.85, 6.28, 11.7, 0.5, { fontSize: 10.5, color: '2C4470', valign: 'middle' });
  U.foot(s);
}

/* ============================================================ 24 coverage */
{
  const s = U.slide();
  U.head(s, 'Reading the map', 'Where the weight sits', 'Two summaries of the same sixty sub-capabilities.', TEAL);
  const ks = ['BE', 'UI', 'LIB', 'BTC', 'LNT', 'ABE', 'AGT', 'OPS', 'JTC'];
  const counts = ks.map(k => M.CAPABILITIES.reduce((a, c) => a + c.l2.filter(l => l[2].includes(k)).length, 0));
  s.addChart(pres.ChartType.bar, [{ name: 'Sub-capabilities', labels: ks.map(k => C[k].name), values: counts }], {
    x: 0.55, y: 2.2, w: 6.6, h: 4.3, barDir: 'bar', chartColors: ks.map(k => C[k].c),
    showValue: true, dataLabelPosition: 'outEnd', dataLabelFontSize: 10, dataLabelColor: INK,
    catAxisLabelColor: INK, valAxisLabelColor: SOFT, catAxisLabelFontSize: 10, valAxisLabelFontSize: 9,
    valGridLine: { color: 'EDE4D6', size: 0.5 }, catGridLine: { style: 'none' }, showLegend: false, showTitle: false,
    chartArea: { fill: { color: BG } }, plotArea: { fill: { color: BG } },
  });
  const mk2 = Object.entries(M.MATURITY);
  const mcounts = mk2.map(([k]) => M.CAPABILITIES.reduce((a, c) => a + c.l2.filter(l => l[4] === k).length, 0));
  s.addChart(pres.ChartType.doughnut, [{ name: 'Maturity', labels: mk2.map(([, m]) => m.label), values: mcounts }], {
    x: 7.4, y: 2.2, w: 5.4, h: 3.3, chartColors: mk2.map(([, m]) => m.color),
    showValue: true, dataLabelFontSize: 11, dataLabelColor: 'FFFFFF', dataLabelFontBold: true,
    holeSize: 56, showLegend: true, legendPos: 'b', legendFontSize: 9.5, legendColor: INK,
    showTitle: false, chartArea: { fill: { color: BG } },
  });
  U.box(s, 7.4, 5.65, 5.42, 1.05, MINT, { r: 0.12 });
  U.T(s, 'Sixty sub-capabilities: 41 mature, 9 changing, 8 new this year, 2 not usable end to end.',
    7.6, 5.82, 5.05, 0.75, { fontSize: 11, color: '1F5F58' });
  U.foot(s);
}

/* ============================================================ 25 archimate */
{
  const s = U.slide();
  U.head(s, 'For the enterprise-architecture crowd', 'The same model in ArchiMate layers', 'Business services on top, application components in the middle, technology underneath.', LEAF);
  const bands = [
    ['BUSINESS LAYER', 'FFF6C4', 'B59A1F', ['API Publishing', 'API Catalog Browsing', 'API Change Review', 'API Quality Assessment', 'Runtime API Discovery', 'AI-assisted API Access', 'Platform Administration']],
    ['APPLICATION LAYER  ·  services', 'CCF4F4', '1F8A8A', ['Package & Version Management', 'Build & Publish', 'Comparison & Changelog', 'Documentation & Playground', 'Linting & Scoring', 'Agent Discovery', 'MCP Tool Service', 'AI Chat', 'Identity & Access', 'Java API Analysis']],
    ['APPLICATION LAYER  ·  components', 'CCF4F4', '1F8A8A', ['APIHUB Backend', 'APIHUB UI', 'Build Task Consumer', 'API Linter Service', 'Agents Backend', 'APIHUB Agent', 'Java Task Consumer']],
    ['TECHNOLOGY LAYER', 'D6F0C8', '4C8A32', ['Kubernetes cluster', 'Remote cluster', 'PostgreSQL', 'S3 / MinIO', 'Olric', 'nginx', 'Identity provider', 'LLM API', 'Helm / GitHub Actions']],
  ];
  let y = 2.2;
  bands.forEach(([label, tint, c, items]) => {
    const rows = Math.ceil(items.length / 6);
    const h = 0.3 + rows * 0.32;
    U.panel(s, 0.55, y, 12.27, h, tint, c, label, c);
    items.forEach((t, i) => {
      const x = 0.7 + (i % 6) * 2.0, cy = y + 0.29 + Math.floor(i / 6) * 0.32;
      U.box(s, x, cy, 1.88, 0.27, W, { line: c, lw: 1, r: 0.06 });
      U.T(s, t, x + 0.05, cy, 1.78, 0.27, { fontSize: 7.5, color: INK, align: 'center', valign: 'middle' });
    });
    y += h + 0.12;
  });
  U.T(s, 'Realization runs upward: components realize services, services realize business services and capabilities. The editable model ships as a draw.io file and an Archi model.',
    0.55, 6.5, 12.2, 0.3, { fontSize: 10.5, color: SOFT });
  U.foot(s);
}

/* ============================================================ 26 closing */
{
  const s = U.slide(NAVYC);
  U.circle(s, 10.2, 0.7, 2.6, '2A4F9E');
  U.circle(s, 11.9, 4.4, 1.6, '2A4F9E');
  s.addShape(pres.ShapeType.star4, { x: 9.6, y: 5.2, w: 0.7, h: 0.7, fill: { color: '7FA3E8' }, line: { color: '7FA3E8' } });
  U.T(s, 'Two models, one source', 0.85, 1.7, 8, 0.6, { fontSize: 18, color: '9FB4E8', bold: true });
  U.T(s, 'C4 answers “how is it built”.\nThe capability map answers “what does it do”.', 0.85, 2.3, 8.4, 1.8,
    { fontSize: 32, bold: true, color: W, lineSpacingMultiple: 1.06 });
  U.T(s, 'They meet in the technology overlay: every sub-capability names the container that implements it, and every container appears in the C4 diagrams. Change one, regenerate both.',
    0.85, 4.3, 7.9, 1.0, { fontSize: 14, color: 'D7E2F8' });
  const files = ['diagrams/c4-2026-09  —  full C4 model, draw.io, deck', 'diagrams/capability-2026-09  —  map, heatmaps, ArchiMate, Archi model', 'diagrams/summary-2026-09  —  the narrative overview'];
  files.forEach((t, i) => U.T(s, '·  ' + t, 0.85, 5.45 + i * 0.34, 9, 0.3, { fontSize: 11.5, color: '9FB4E8' }));
  U.foot(s, true);
}

pres.writeFile({ fileName: 'APIHUB_architecture_deck.pptx' }).then(() => console.log('slides:', st.n));
