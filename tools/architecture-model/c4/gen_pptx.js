const pptxgen = require('pptxgenjs');
const fs = require('fs');
const sizeOf = (p) => { const b = fs.readFileSync(p); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5
pres.author = 'APIHUB architecture';
pres.title = 'Qubership APIHUB — C4 Architecture';

const NAVY = '0F1F3D', BLUE = '2563EB', GREEN = '16A34A', ORANGE = 'F97316', AMBER = 'D97706', SLATE = '475569', INK = '1E293B', MUTED = '64748B', LIGHT = 'F1F5F9', WHITE = 'FFFFFF', ICE = 'DBEAFE';
const FONT = 'Calibri', HFONT = 'Cambria';

function base(slide, dark = false) {
  slide.background = { color: dark ? NAVY : WHITE };
}
function title(slide, text, sub, dark = false) {
  slide.addText(text, { x: 0.5, y: 0.3, w: 12.3, h: 0.7, fontFace: HFONT, fontSize: 30, bold: true, color: dark ? WHITE : NAVY, isTextBox: true, margin: 0 });
  if (sub) slide.addText(sub, { x: 0.5, y: 0.95, w: 12.3, h: 0.35, fontFace: FONT, fontSize: 13, color: dark ? ICE : MUTED, isTextBox: true, margin: 0 });
}
function footer(slide, n, dark = false) {
  slide.addText(`Qubership APIHUB · C4 architecture · 2026-09`, { x: 0.5, y: 7.05, w: 8, h: 0.3, fontFace: FONT, fontSize: 9, color: dark ? ICE : MUTED, isTextBox: true, margin: 0 });
  slide.addText(String(n), { x: 12.3, y: 7.05, w: 0.5, h: 0.3, fontFace: FONT, fontSize: 9, color: dark ? ICE : MUTED, align: 'right', isTextBox: true, margin: 0 });
}
function fitImage(slide, path, x, y, maxW, maxH) {
  const { w, h } = sizeOf(path);
  let iw = maxW, ih = maxW * h / w;
  if (ih > maxH) { ih = maxH; iw = maxH * w / h; }
  slide.addImage({ path, x: x + (maxW - iw) / 2, y: y + (maxH - ih) / 2, w: iw, h: ih });
}
function chip(slide, x, y, w, text, color) {
  slide.addShape(pres.ShapeType.roundRect, { x, y, w, h: 0.32, fill: { color }, line: { color }, rectRadius: 0.08 });
  slide.addText(text, { x, y, w, h: 0.32, fontFace: FONT, fontSize: 10, color: WHITE, align: 'center', valign: 'middle', isTextBox: true, margin: 0 });
}
function bullets(slide, items, x, y, w, h, size = 13, color = INK) {
  slide.addText(items.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < items.length - 1, paraSpaceAfter: 6 } })),
    { x, y, w, h, fontFace: FONT, fontSize: size, color, valign: 'top', isTextBox: true, margin: 0 });
}
let n = 0;
function diagramSlide(t, sub, png, notesItems, notesTitle = 'Reading the diagram', imgW = 8.9) {
  const s = pres.addSlide(); n++; base(s); title(s, t, sub); footer(s, n);
  fitImage(s, `png_slides/${png}.png`, 0.4, 1.45, imgW, 5.45);
  if (notesItems) {
    const nx = 0.4 + imgW + 0.3, nw = 12.9 - imgW - 0.3;
    s.addShape(pres.ShapeType.roundRect, { x: nx, y: 1.45, w: nw, h: 5.45, fill: { color: LIGHT }, line: { color: LIGHT }, rectRadius: 0.1 });
    s.addText(notesTitle, { x: nx + 0.2, y: 1.6, w: nw - 0.4, h: 0.35, fontFace: HFONT, fontSize: 14, bold: true, color: NAVY, isTextBox: true, margin: 0 });
    bullets(s, notesItems, nx + 0.2, 2.0, nw - 0.4, 4.8, 10.5);
  }
  return s;
}
function fullDiagramSlide(t, sub, png) {
  const s = pres.addSlide(); n++; base(s); title(s, t, sub); footer(s, n);
  fitImage(s, `png_slides/${png}.png`, 0.4, 1.4, 12.5, 5.55);
  return s;
}

// ---------- 1. Title ----------
{
  const s = pres.addSlide(); n++; base(s, true);
  s.addText('Qubership APIHUB', { x: 0.8, y: 2.0, w: 11.5, h: 1.0, fontFace: HFONT, fontSize: 48, bold: true, color: WHITE, isTextBox: true, margin: 0 });
  s.addText('Architecture in C4 notation — Context · Containers · Components · Code · Deployment · Dynamics', { x: 0.8, y: 3.05, w: 11.5, h: 0.6, fontFace: FONT, fontSize: 20, color: ICE, isTextBox: true, margin: 0 });
  s.addText('Generated 2026-09-11 · verified against the monorepo code (Go 1.26, React 18, NestJS 11, Java 21)', { x: 0.8, y: 3.75, w: 11.5, h: 0.4, fontFace: FONT, fontSize: 13, color: 'A5B4FC', isTextBox: true, margin: 0 });
  const chips = [['Backend', BLUE], ['UI', BLUE], ['Build Task Consumer', BLUE], ['Linter', GREEN], ['Agents Backend', GREEN], ['Agent', ORANGE], ['Java Task Consumer', AMBER]];
  let x = 0.8; chips.forEach(([t, c]) => { const w = 0.35 + t.length * 0.085; chip(s, x, 4.6, w, t, c); x += w + 0.15; });
  footer(s, n, true);
}
// ---------- 2. Agenda / how to read ----------
{
  const s = pres.addSlide(); n++; base(s); title(s, 'How this deck is organised', 'One slide set, four C4 zoom levels plus deployment and runtime views'); footer(s, n);
  const cards = [
    ['L1 — System Context', 'APIHUB as a black box: people, CI/CD, AI clients, external systems', BLUE],
    ['L2 — Containers', 'Seven deployable services, data stores, Olric, remote agents', BLUE],
    ['L3 — Components', 'Inside each container: Backend, UI, Build Task Consumer, Linter, Agents Backend, Agent, Java Task Consumer', GREEN],
    ['L4 — Code', 'Request pipeline, security strategies, SpecType registries, PackageVersionBuilder, DiscoveryRunner plug-ins, worker classes', ORANGE],
    ['Deployment', 'Helm chart on Kubernetes, docker-compose variants, sizing and probes', SLATE],
    ['Dynamic views', 'Publish flow, agent discovery, MCP / AI chat, authentication paths', SLATE],
  ];
  cards.forEach(([h, d, c], i) => {
    const col = i % 3, row = Math.floor(i / 3), x = 0.5 + col * 4.2, y = 1.6 + row * 2.6;
    s.addShape(pres.ShapeType.roundRect, { x, y, w: 3.9, h: 2.3, fill: { color: LIGHT }, line: { color: LIGHT }, rectRadius: 0.12 });
    s.addShape(pres.ShapeType.ellipse, { x: x + 0.25, y: y + 0.25, w: 0.5, h: 0.5, fill: { color: c }, line: { color: c } });
    s.addText(String(i + 1), { x: x + 0.25, y: y + 0.25, w: 0.5, h: 0.5, fontFace: FONT, fontSize: 14, bold: true, color: WHITE, align: 'center', valign: 'middle', isTextBox: true, margin: 0 });
    s.addText(h, { x: x + 0.9, y: y + 0.25, w: 2.8, h: 0.5, fontFace: HFONT, fontSize: 16, bold: true, color: NAVY, valign: 'middle', isTextBox: true, margin: 0 });
    s.addText(d, { x: x + 0.25, y: y + 0.95, w: 3.4, h: 1.2, fontFace: FONT, fontSize: 12, color: INK, valign: 'top', isTextBox: true, margin: 0 });
  });
}
// ---------- 3. What is APIHUB (stats) ----------
{
  const s = pres.addSlide(); n++; base(s); title(s, 'What APIHUB is', 'API registry & API management platform — store · build · normalize · diff · document · lint · score · discover · expose to AI'); footer(s, n);
  const stats = [['7', 'deployable containers', BLUE], ['12', 'TypeScript libraries in the processing stack', GREEN], ['8', 'SpecType values (OpenAPI 3.0/3.1, JSON Schema 04/06/07, AsyncAPI 3, GraphAPI, DDLAPI 1.0)', ORANGE], ['25+', 'repositories in the quasi-monorepo', SLATE]];
  stats.forEach(([v, l, c], i) => {
    const x = 0.5 + i * 3.15;
    s.addText(v, { x, y: 1.6, w: 2.9, h: 1.1, fontFace: HFONT, fontSize: 60, bold: true, color: c, isTextBox: true, margin: 0 });
    s.addText(l, { x, y: 2.7, w: 2.9, h: 0.9, fontFace: FONT, fontSize: 12, color: MUTED, isTextBox: true, margin: 0 });
  });
  const cols = [
    ['Catalog', ['Workspaces → groups → packages → versions → revisions', 'Operations, tags, operation groups, deprecated items', 'Documents with shareability, DDL and MCP contracts', 'Full-text search v3/v4, activity audit trail']],
    ['Processing', ['Backend queue polled by stateless workers', 'api-processor: parse → normalize → diff → changelog → export', 'Breaking / risky / non-breaking classification, BWC validation', 'Linting (Spectral + AI) and version quality scoring']],
    ['Integration', ['SAML 2.0, OIDC, LDAP, API keys, PATs, refresh tokens', 'MCP server (Streamable HTTP) + built-in AI chat', 'Agents discover live APIs in remote Kubernetes clusters', 'Java API analysis worker (new, backend queue pending)']],
  ];
  cols.forEach(([h, items], i) => {
    const x = 0.5 + i * 4.2;
    s.addShape(pres.ShapeType.roundRect, { x, y: 3.8, w: 3.9, h: 3.0, fill: { color: LIGHT }, line: { color: LIGHT }, rectRadius: 0.12 });
    s.addText(h, { x: x + 0.25, y: 3.95, w: 3.4, h: 0.4, fontFace: HFONT, fontSize: 16, bold: true, color: NAVY, isTextBox: true, margin: 0 });
    bullets(s, items, x + 0.25, 4.4, 3.4, 2.3, 11.5);
  });
}
// ---------- 4. Legend ----------
{
  const s = pres.addSlide(); n++; base(s); title(s, 'Notation and legend', 'C4 model: every element is labelled Name — [Type: technology] — responsibility'); footer(s, n);
  const items = [['Person / role', '7C3AED'], ['Software system', '1E3A8A'], ['Core container', BLUE], ['Extension container', GREEN], ['Remote / agent side', ORANGE], ['New — integration pending', AMBER], ['Data store / infrastructure', SLATE], ['External system', '6B7280']];
  items.forEach(([t, c], i) => {
    const col = i % 2, row = Math.floor(i / 2), x = 0.6 + col * 3.3, y = 1.7 + row * 0.75;
    s.addShape(pres.ShapeType.roundRect, { x, y, w: 0.9, h: 0.5, fill: { color: c }, line: { color: c }, rectRadius: 0.1 });
    s.addText(t, { x: x + 1.05, y, w: 2.2, h: 0.5, fontFace: FONT, fontSize: 13, color: INK, valign: 'middle', isTextBox: true, margin: 0 });
  });
  s.addShape(pres.ShapeType.roundRect, { x: 7.4, y: 1.6, w: 5.4, h: 3.3, fill: { color: LIGHT }, line: { color: LIGHT }, rectRadius: 0.12 });
  s.addText('Edges', { x: 7.65, y: 1.75, w: 5, h: 0.4, fontFace: HFONT, fontSize: 16, bold: true, color: NAVY, isTextBox: true, margin: 0 });
  bullets(s, ['Thick arrow — primary business flow (publish, discovery, MCP)', 'Thin arrow — regular call or dependency', 'Dashed arrow — optional (S3, LLM) or planned (Java queue)', 'Dashed container — new service whose backend integration is still a contract'], 7.65, 2.25, 5.0, 2.5, 12.5);
  s.addText('Sources: Service.go route table, go.mod, config.template.yaml, nginx.conf.template, helm values.yaml, api-processor builder.ts / consts.ts, api-unifier spec-type.ts, api-diff api.ts, agent document_discovery.go, java-task-consumer docs. Full list in the companion Markdown (Appendix C).', { x: 0.6, y: 5.3, w: 12.1, h: 1.2, fontFace: FONT, fontSize: 11, color: MUTED, isTextBox: true, margin: 0 });
}
// ---------- L1 ----------
{
  const s = pres.addSlide(); n++; base(s, true);
  s.addText('Level 1', { x: 0.8, y: 2.6, w: 11, h: 0.6, fontFace: FONT, fontSize: 18, color: 'A5B4FC', isTextBox: true, margin: 0 });
  s.addText('System Context', { x: 0.8, y: 3.1, w: 11, h: 1, fontFace: HFONT, fontSize: 44, bold: true, color: WHITE, isTextBox: true, margin: 0 });
  footer(s, n, true);
}
diagramSlide('System Context', 'Who uses APIHUB and what it depends on', 'L1_context', [
  'Five actor types: API publishers, API consumers, system administrators, CI/CD pipelines (api-key / PAT) and AI assistants speaking MCP.',
  'PostgreSQL is mandatory (one database per service); S3 / MinIO is optional cold storage for build sources and results.',
  'Identity comes from SAML 2.0 / OIDC providers plus LDAP lookup; local accounts exist for non-production.',
  'An OpenAI-compatible LLM powers optional AI linting and the built-in chat.',
  'Remote Kubernetes clusters are reached through deployed agents; Maven / OCI registries are read by the Java analysis worker.',
  'Images and npm packages are delivered from GitHub (ghcr.io, GitHub npm registry); Prometheus scrapes every Go service.']);
// ---------- L2 ----------
{
  const s = pres.addSlide(); n++; base(s, true);
  s.addText('Level 2', { x: 0.8, y: 2.6, w: 11, h: 0.6, fontFace: FONT, fontSize: 18, color: 'A5B4FC', isTextBox: true, margin: 0 });
  s.addText('Containers', { x: 0.8, y: 3.1, w: 11, h: 1, fontFace: HFONT, fontSize: 44, bold: true, color: WHITE, isTextBox: true, margin: 0 });
  footer(s, n, true);
}
fullDiagramSlide('Container diagram', 'Kubernetes namespace with core services, extension services, embedded Olric and remote agents', 'L2_containers');
{
  const s = pres.addSlide(); n++; base(s); title(s, 'Container catalogue', 'Technology, port and responsibility per container'); footer(s, n);
  const rows = [
    ['Container', 'Module', 'Technology', 'Port', 'State', 'Responsibilities'],
    ['APIHUB Backend', 'backend/portal-backend', 'Go 1.26.6 · gorilla/mux · go-pg · go-guardian · mcp-go 0.56 · openai-go v3', '8080', 'apihub DB, S3 (opt.)', 'REST API v1–v4 (39 controllers), auth/RBAC, packages/versions, build queue, search, export, DDL/MCP contracts, MCP server, AI chat, cleanup, migrations'],
    ['APIHUB UI', 'frontend/ui', 'React 18.3 · MUI 5.11 · Vite 8 · pnpm + Nx · nginx 1.31', '8080', '—', 'Portal SPA, Agents SPA, reverse proxy to Backend / Linter / Agents Backend / apihub-nc'],
    ['Build Task Consumer', 'frontend/build-task-consumer', 'Node 24 · NestJS 11 · api-processor 5.6', '3000', 'stateless', 'Polls build tasks, runs PackageVersionBuilder, posts result ZIP; scale to 3–6 replicas'],
    ['API Linter Service', 'backend/api-linter-service', 'Go 1.26.6 · Spectral CLI · OpenAI client · Olric', '8080', 'apihub_linter DB', 'Lint tasks, rulesets, bulk validation, version scoring, MCP endpoint'],
    ['Agents Backend', 'backend/agents-backend', 'Go 1.26.6', '8080', 'agents DB', 'Agent registry & heartbeat, discovery orchestration, snapshots → Portal, namespace security reports'],
    ['APIHUB Agent', 'backend/agent', 'Go 1.26.6 · client-go', '8080', '—', 'Per-cluster discovery via DiscoveryRunners, service proxy'],
    ['Java Task Consumer (new)', 'backend/java-task-consumer', 'Java 21 · japicmp · jdeps · Maven resolver', '3000', 'stateless', 'Java API report / diff / upgrade impact; backend java-builders queue specified, not yet implemented'],
  ];
  const tbl = rows.map((r, i) => r.map((c) => ({ text: c, options: { bold: i === 0, color: i === 0 ? WHITE : INK, fill: { color: i === 0 ? NAVY : (i % 2 ? WHITE : LIGHT) }, fontSize: 9.5, fontFace: FONT, valign: 'middle' } })));
  s.addTable(tbl, { x: 0.4, y: 1.45, w: 12.5, colW: [1.6, 2.2, 2.6, 0.5, 1.1, 4.5], border: { type: 'solid', color: 'E2E8F0', pt: 0.5 }, autoPage: false });
}
// ---------- L3 ----------
{
  const s = pres.addSlide(); n++; base(s, true);
  s.addText('Level 3', { x: 0.8, y: 2.6, w: 11, h: 0.6, fontFace: FONT, fontSize: 18, color: 'A5B4FC', isTextBox: true, margin: 0 });
  s.addText('Components', { x: 0.8, y: 3.1, w: 11, h: 1, fontFace: HFONT, fontSize: 44, bold: true, color: WHITE, isTextBox: true, margin: 0 });
  footer(s, n, true);
}
fullDiagramSlide('APIHUB Backend — components', 'backend/portal-backend · Go 1.26 · layered micro-monolith: edge → security → domain services → repositories', 'L3_backend');
{
  const s = pres.addSlide(); n++; base(s); title(s, 'APIHUB Backend — component groups', 'What each group owns and which external parties it talks to'); footer(s, n);
  const groups = [
    ['Security', 'go-guardian union of Cookie / Bearer / Refresh JWT, api-key, PAT, ephemeral-file token strategies; IDPManager with SAMLProvider and OIDCProvider; RoleService for system, package and custom roles', 'DC2626'],
    ['Catalog domain', 'PackageService, VersionService / PublishedService, OperationService / OperationGroupService, ComparisonService, DDL & MCP contract services, SearchController v3/v4', BLUE],
    ['Build & export', 'BuildService (DB task queue, GetFreeBuild, ownership), BuildResultService (result ZIP → operations/docs/changes), ExportService / ExcelService, TransformationService, PublishNotificationService (Olric DTopic)', BLUE],
    ['AI & integration', 'MCPService + MCPController (mcp-go Streamable HTTP, /api/v1/mcp/, 4 tools + legacy aliases, api-packages resource, IDS prompt), AiChatTurnService (openai-go, SSE, tool loop ≤ 10), PlaygroundProxyController', '7C3AED'],
    ['Operations & maintenance', 'CleanupService with robfig/cron jobs (revisions, comparisons, soft-deleted, unreferenced, builds, ephemeral files, VACUUM, AI chat), migration framework with operations-migration FSM, ActivityTracking / BusinessMetrics, MinioStorageService', SLATE],
    ['Data access', '~26 go-pg repositories over the apihub database, entity structs, LockService for distributed job locks', SLATE],
  ];
  groups.forEach(([h, d, c], i) => {
    const col = i % 3, row = Math.floor(i / 3), x = 0.5 + col * 4.2, y = 1.55 + row * 2.75;
    s.addShape(pres.ShapeType.roundRect, { x, y, w: 3.9, h: 2.5, fill: { color: LIGHT }, line: { color: LIGHT }, rectRadius: 0.12 });
    s.addShape(pres.ShapeType.ellipse, { x: x + 0.25, y: y + 0.25, w: 0.35, h: 0.35, fill: { color: c }, line: { color: c } });
    s.addText(h, { x: x + 0.75, y: y + 0.2, w: 3.0, h: 0.45, fontFace: HFONT, fontSize: 15, bold: true, color: NAVY, valign: 'middle', isTextBox: true, margin: 0 });
    s.addText(d, { x: x + 0.25, y: y + 0.8, w: 3.4, h: 1.6, fontFace: FONT, fontSize: 10.5, color: INK, valign: 'top', isTextBox: true, margin: 0 });
  });
}
diagramSlide('APIHUB UI — components', 'nginx reverse proxy + Portal SPA + Agents SPA + rendering web components', 'L3_ui', [
  'nginx routes /api, /saml, /login/sso, /playground to the Backend, /api-linter and /agents-backend with rewrite, optional /apihub-nc extension; MCP and chat SSE locations disable buffering.',
  'Portal SPA: catalog navigation, version pages (overview, operations, changes, deprecated, documents, api-quality), compare, dashboard editor, settings, AI chat, contracts tab.',
  'Agents SPA: discovery, snapshots & promotion, namespace security checks.',
  'Shared package holds entities (api-types, contract-types), hooks, MUI theme, widgets and Storybook.',
  'Rendering is delegated to web components (apispec-view, rest-playground, class-view) and React viewers (api-doc-viewer); client-side builds use api-processor / api-diff / api-unifier.']);
diagramSlide('Build Task Consumer — components', 'NestJS 11 stateless worker; the heavy lifting is the api-processor library', 'L3_build_task_consumer', [
  'RegistryService polls POST /api/v2/builders/{builderId}/tasks with an api-key; 204 means no work, 200 returns a task ZIP (config.json + sources).',
  'BuilderService validates the config with ajv, sends running heartbeats every statusInterval, and runs PackageVersionBuilder for the requested buildType.',
  'Resolvers inside api-processor call back to the Backend for previous versions, operations, documents and export templates.',
  'Result ZIP is posted to POST /api/v3/packages/{id}/publish/{publishId}/status as complete or error.',
  'buildType values: build, changelog, prefix-groups-changelog, exportVersion, exportRestDocument, export{Rest,Graphql,Asyncapi}OperationsGroup (+3 deprecated).']);
diagramSlide('API Linter Service — components', 'Event-driven linting with Spectral and an AI engine, plus version scoring', 'L3_linter', [
  'PublishEventListener subscribes to the Olric DTopic "version-published" emitted by the Backend after a successful build.',
  'VersionTaskProcessor fetches version documents from the Backend and fans out DocLintTasks; DocTaskProcessor runs a worker pool.',
  'LinterSelector picks SpectralExecutor or AIOasExecutor by ApiType and package glob patterns; Vacuum binaries are bundled but not active.',
  'ScoringService computes the version quality score after lint completion; RulesetService manages rulesets and activation.',
  'REST API under /api/v1 and /api/v2 (validation, scoring, rulesets, bulkValidation, linters) and an MCP endpoint with list_linter_issues_for_package_version.']);
diagramSlide('Agents Backend — components', 'Registry and orchestrator for remote agents; publishes snapshots to the Portal', 'L3_agents_backend', [
  'Agents register and heartbeat through POST /api/v2/agents; AgentService tracks status.',
  'DiscoveryService relays workspace-scoped discovery to the agent and collects services and documents.',
  'SnapshotService packages discovered specs and publishes dashboard versions to the Backend via ApihubClient.',
  'NamespaceSecurityService runs auth-check processes and produces Excel reports (excelize).',
  'Proxy controller forwards UI requests through the agent to in-cluster services.']);
diagramSlide('APIHUB Agent — components', 'Deployed in the target cluster; pluggable DiscoveryRunners probe each service in parallel', 'L3_agent', [
  'RegistrationService registers the agent (cloud, URL, namespace) with Agents Backend and heartbeats every ~30 s.',
  'CloudService uses client-go to list namespaces, services and routes with TTL caches.',
  'DocumentDiscoveryService runs all DiscoveryRunners concurrently and merges documents, failed calls and errors.',
  'Runners: REST (swagger/openapi URLs), GraphQL (introspection), AsyncAPI, Markdown, JSON Schema, unknown/generic fallback.',
  'Controllers expose v1–v3 discovery endpoints (workspace-aware), spec download and a ServiceProxy; security validates JWT with the Backend public key, api-key and PAT.']);
diagramSlide('Java Task Consumer — components (new)', 'Plain-JVM worker mirroring the build-task-consumer pattern; backend java-builders queue is a contract only', 'L3_java_task_consumer', [
  'TaskPoller polls POST /api/v2/java-builders/{builderId}/tasks (204 or task ZIP with config.json).',
  'BuildOrchestrator sends running heartbeats, dispatches to BuildExecutor and packages report.json into the result ZIP.',
  'jdiff-engine pipelines: ApiReportPipeline (java-api-report), ApiDiffPipeline (java-api-diff), UpgradeImpactPipeline (java-upgrade-impact).',
  'JarSourceResolver resolves GAV coordinates through Maven or extracts /app/*.jar from OCI images without a container runtime.',
  'Result posted to POST /api/v3/packages/{id}/java-publish/{publishId}/status; the Backend side is documented in docs/backend-api.md and not yet in Service.go.']);
// ---------- L4 ----------
{
  const s = pres.addSlide(); n++; base(s, true);
  s.addText('Level 4', { x: 0.8, y: 2.6, w: 11, h: 0.6, fontFace: FONT, fontSize: 18, color: 'A5B4FC', isTextBox: true, margin: 0 });
  s.addText('Code', { x: 0.8, y: 3.1, w: 11, h: 1, fontFace: HFONT, fontSize: 44, bold: true, color: WHITE, isTextBox: true, margin: 0 });
  footer(s, n, true);
}
diagramSlide('Backend — request pipeline, security strategies, cron jobs', 'backend/portal-backend package layering', 'L4_backend_code', [
  'Every request: mux.Router → Prometheus / write-deadline middleware → security.Middleware (go-guardian union) → controller → service → repository → entity.',
  'Strategies: CookieToken, BearerToken (BaseJWTStrategy), RefreshToken, ApihubApiKey, ApihubPAT, CustomJWT, EphemeralFileTokens; JWTValidator uses the RSA public key.',
  'IDPManager instantiates SAMLProvider (crewjam/saml) and OIDCProvider (coreos/go-oidc) from externalIdentityProviders[].',
  'cleanup.Runner schedules cron jobs with distributed locks: revisions, comparisons, soft-deleted, unreferenced, VACUUM, builds, ephemeral files, AI-chat cleanup.']);
diagramSlide('TypeScript processing stack — registries keyed by SpecType', 'api-unifier defines SpecType; api-diff and api-processor register engines per type', 'L4_ts_registries', [
  'SpecType union: openapi-3.0, openapi-3.1, json-schema-04/06/07, asyncapi-3, graphapi, ddlapi-1.0; resolveSpec() auto-detects.',
  'RULES maps SpecType → normalization CrawlRules; COMPARE_ENGINES_MAP maps SpecType → compare engine (compareOpenApi, compareAsyncApi, compareGraphApi, compareDdlApi, compareJsonSchema).',
  'json-crawl CrawlRules is the traversal abstraction shared by unifier, diff, data-model and visitor.',
  'graphapi converts GraphQL SDL ⇄ GraphAPI JSON; @netcracker/qubership-apihub-ddlapi provides the DDLAPI 1.0 model.',
  'Adding a SpecType touches unifier, diff, processor, backend view/CommonOperation.go, UI api-types.ts, consumer schema, agent runner and linter config.']);
fullDiagramSlide('Library dependency graph', 'npm @netcracker/qubership-apihub-* packages and their consumers', 'L4_ts_library_graph');
diagramSlide('api-processor — PackageVersionBuilder and ApiBuilders', 'src/builder.ts registers seven builders; strategies are selected by buildType', 'L4_api_processor_builders', [
  'restApiBuilder (rest), graphqlApiBuilder (graphql), asyncApiBuilder (asyncapi), ddlBuilder (contract ddl), mcpBuilder (contract mcp, schemas 2024-11-05 … 2025-11-25), textApiBuilder, unknownApiBuilder.',
  'ApiBuilder contract: parser, buildDocument, buildOperations, compareOperations, dumpDocument.',
  'Strategies: Build, Changelog, PrefixGroupsChangelog, ExportVersion, ExportRestDocument, ExportRest/GraphQl/AsyncApiOperationsGroup, plus deprecated DocumentGroup and MergedDocumentGroup.',
  'BuildStrategy per document: parse → buildDocument → buildOperations → normalize → apiDiff vs previous version → classify → BWC validation → result ZIP.']);
fullDiagramSlide('api-processor — build strategies', 'src/strategies/* implement BuilderStrategy.execute(context)', 'L4_api_processor_strategies');
{
  const s = pres.addSlide(); n++; base(s); title(s, 'Worker and extension services — key classes', 'Build Task Consumer · Linter · Agents Backend · Agent · Java Task Consumer'); footer(s, n);
  fitImage(s, 'png_slides/L4_build_task_consumer.png', 0.4, 1.45, 6.1, 2.6);
  fitImage(s, 'png_slides/L4_linter.png', 6.8, 1.45, 6.1, 2.6);
  fitImage(s, 'png_slides/L4_agents_backend.png', 0.4, 4.2, 4.0, 2.75);
  fitImage(s, 'png_slides/L4_agent_runners.png', 4.6, 4.2, 8.3, 2.75);
}
fullDiagramSlide('Java Task Consumer — worker classes and jdiff-engine', 'WorkerMain → TaskPoller → BuildOrchestrator → BuildExecutor → pipelines (japicmp, jdeps, Maven / OCI resolution)', 'L4_java_task_consumer');
fullDiagramSlide('APIHUB UI — monorepo packages and rendering libraries', 'packages/portal · packages/agents · packages/shared + web components (Shadow DOM) and React viewers', 'L4_ui');
// ---------- Deployment ----------
{
  const s = pres.addSlide(); n++; base(s, true);
  s.addText('Deployment & runtime', { x: 0.8, y: 2.6, w: 11, h: 0.6, fontFace: FONT, fontSize: 18, color: 'A5B4FC', isTextBox: true, margin: 0 });
  s.addText('Deployment and dynamic views', { x: 0.8, y: 3.1, w: 11, h: 1, fontFace: HFONT, fontSize: 44, bold: true, color: WHITE, isTextBox: true, margin: 0 });
  footer(s, n, true);
}
diagramSlide('Kubernetes deployment', 'Helm chart deploy/helm-templates/qubership-apihub', 'D1_kubernetes', [
  'One Deployment + Service per container; nginx UI is the single Ingress target (http and https with TLS secret).',
  'Backend and Linter have ServiceAccounts / RoleBindings for Olric cluster discovery (olric-cloud-plugin); ServiceMonitor and two Grafana dashboards ship with the chart.',
  'Sizing: Backend 3 CPU / 3 Gi in production with GOMEMLIMIT ≈ 80 % of the limit; Build Task Consumer 3–6 replicas; Linter 1000 Mi; Agents Backend 256 Mi.',
  'PostgreSQL 14+ external (or local-k8s-quickstart/postgres-db), optional S3, optional Keycloak and Apache Superset in the quickstart.',
  'Docker Compose apihub-generic runs all five services + postgres; variant with-keycloak; java-task-consumer has its own chart and compose file.'], 'Deployment notes');
diagramSlide('Publish flow', 'From upload to lint results — Backend, Build Task Consumer, Olric, Linter', 'S1_publish', [
  '1–3  UI posts sources; Backend stores a build task and sources (DB or S3).',
  '4–6  Consumer polls, receives task ZIP, sends running heartbeats, runs PackageVersionBuilder (parse, normalize, diff against previous version, classify, BWC, pack).',
  '7–8  Backend stores documents / operations / changes / contracts and publishes "version-published" on Olric.',
  '9–12 Linter fetches documents, runs Spectral (+ optional AI), computes the version score, stores results in apihub_linter.',
  '13–14 UI polls publish status and reads validation summary and scoring through /api-linter.'], 'Steps', 8.3);
diagramSlide('Agent discovery and snapshot promotion', 'Remote agent, Agents Backend, Kubernetes API and workload services', 'S2_discovery', [
  'Registration: agent posts cloud / URL / namespace and heartbeats every ~30 s.',
  'Discovery: user picks agent → namespace → workspace; Agents Backend forwards to the agent, which lists services via the K8s API and runs all runners in parallel per service.',
  'Result: services, documents and failed calls come back to the Agents SPA.',
  'Promotion: a snapshot fetches the specs from the agent and publishes dashboard versions with references to the Backend.'], 'Steps', 8.3);
diagramSlide('MCP clients and built-in AI chat', 'Backend MCP server (Streamable HTTP) and AiChatTurnService tool loop', 'S3_mcp_chat', [
  'External MCP clients authenticate with api-key or PAT; sessions idle out after 15 min.',
  'Tools: search_api_operations, get_api_operation_specification, get_api_operation_diff, get_document (+ legacy *_rest_* aliases); resource mcp://api-packages-list; IDS authoring prompt.',
  'AI chat (ai.chat.enabled) streams SSE; each turn loops up to 10 tool calls through MCPService plus ask_clarification; ephemeral files carry generated documents.',
  'Linter exposes list_linter_issues_for_package_version on its own MCP endpoint.'], 'Notes', 8.3);
diagramSlide('Authentication paths', 'Browser SSO / local login, CI and MCP clients with keys and tokens', 'S4_auth', [
  'Browser: POST /api/v3/auth/local (non-production) or GET /api/v1/login/sso/{idpId} → SAML ACS / OIDC callback → JWT access + refresh tokens (cookie or bearer).',
  'CI / scripts: api-key header (package or system keys) or personal access tokens.',
  'MCP clients reuse api-key / PAT; every path ends in the go-guardian union strategy → SecurityContext → RBAC (system, package, custom roles).',
  'Linter, Agents Backend and Agent validate the same JWTs with the Backend public key (/api/v2/auth/publicKey).'], 'Notes', 7.5);
// ---------- Type matrix ----------
{
  const s = pres.addSlide(); n++; base(s); title(s, 'API and contract type support matrix', 'Which layer handles which type'); footer(s, n);
  const rows = [
    ['Type', 'Backend ApiType / contract', 'api-processor builder', 'SpecType (unifier / diff)', 'Agent runner', 'Linter', 'UI rendering'],
    ['OpenAPI 3.0 / 3.1', 'rest', 'restApiBuilder', 'openapi-3.0, openapi-3.1', 'REST', 'Spectral + AI', 'apispec-view, playground, class-view'],
    ['Swagger 2.0', 'rest (converted)', 'restApiBuilder (swagger2openapi)', '→ OAS 3', 'REST', 'Spectral + AI', 'same as OAS'],
    ['GraphQL', 'graphql', 'graphqlApiBuilder', 'graphapi', 'GraphQL', '—', 'GraphQLOperationViewer, GraphiQL'],
    ['AsyncAPI 3 (2.x converted)', 'asyncapi', 'asyncApiBuilder', 'asyncapi-3', 'AsyncAPI', 'Spectral', 'apispec-view'],
    ['JSON Schema 04/06/07', 'document', 'via REST / unknown', 'json-schema-0x', 'JSON Schema', '—', 'JsonSchemaViewer'],
    ['Markdown / text', 'document', 'textApiBuilder', '—', 'Markdown', '—', 'MarkdownViewer (+ Mermaid)'],
    ['Protobuf / gRPC', 'protobuf (stub)', '—', '—', '—', '—', 'raw'],
    ['DDLAPI 1.0', 'contract ddl', 'ddlBuilder', 'ddlapi-1.0', '—', '—', 'Contracts tab (entities, changes, export)'],
    ['MCP server catalog', 'contract mcp', 'mcpBuilder (schemas 2024-11 … 2025-11)', '—', '—', '—', 'Contracts tab (tools, prompts, resources)'],
    ['Java API (jar)', 'pending java-builders', 'JTC pipelines', '—', '—', '—', 'pending'],
  ];
  const tbl = rows.map((r, i) => r.map((c) => ({ text: c, options: { bold: i === 0, color: i === 0 ? WHITE : INK, fill: { color: i === 0 ? NAVY : (i % 2 ? WHITE : LIGHT) }, fontSize: 10, fontFace: FONT, valign: 'middle' } })));
  s.addTable(tbl, { x: 0.4, y: 1.45, w: 12.5, colW: [1.8, 1.8, 2.2, 1.7, 1.2, 1.1, 2.7], border: { type: 'solid', color: 'E2E8F0', pt: 0.5 }, autoPage: false });
}
// ---------- What changed ----------
{
  const s = pres.addSlide(); n++; base(s); title(s, 'What changed since the April 2026 diagrams', 'Corrections made after re-reading the current code'); footer(s, n);
  const items = [
    ['MCP transport', 'SSE → Streamable HTTP (mcp-go 0.56), 15-min session TTL; tools renamed (search_api_operations …), new get_document, api-packages resource, IDS prompt', '7C3AED'],
    ['AI chat', 'Chat sessions with /messages/stream, tool loop over MCP tools + ask_clarification, ephemeral files, retention cleanup', '7C3AED'],
    ['Contract types', 'DDLAPI (ddlapi-1.0 SpecType, ddl contract) and MCP catalog contracts (mcp, schemas up to 2025-11-25) with dedicated controllers', BLUE],
    ['Java analysis', 'New backend/java-task-consumer (jdiff-engine, japicmp, jdeps, OCI jar extraction); backend java-builders queue specified, not implemented', AMBER],
    ['Build types', '+ prefix-groups-changelog, exportVersion, exportRestDocument, export*OperationsGroup; documentGroup / reducedSourceSpecifications / mergedSpecification deprecated', BLUE],
    ['Toolchain', 'Go 1.26.6 everywhere, Node 24 consumer, nginx 1.31; robfig/cron cleanup jobs incl. VACUUM and AI-chat cleanup; Linter MCP endpoint; /apihub-nc proxy; agent v1–v3 APIs', GREEN],
  ];
  items.forEach(([h, d, c], i) => {
    const col = i % 2, row = Math.floor(i / 2), x = 0.5 + col * 6.3, y = 1.55 + row * 1.8;
    s.addShape(pres.ShapeType.roundRect, { x, y, w: 6.0, h: 1.6, fill: { color: LIGHT }, line: { color: LIGHT }, rectRadius: 0.12 });
    s.addShape(pres.ShapeType.ellipse, { x: x + 0.25, y: y + 0.25, w: 0.35, h: 0.35, fill: { color: c }, line: { color: c } });
    s.addText(h, { x: x + 0.75, y: y + 0.2, w: 5.0, h: 0.45, fontFace: HFONT, fontSize: 15, bold: true, color: NAVY, valign: 'middle', isTextBox: true, margin: 0 });
    s.addText(d, { x: x + 0.25, y: y + 0.72, w: 5.5, h: 0.85, fontFace: FONT, fontSize: 10.5, color: INK, valign: 'top', isTextBox: true, margin: 0 });
  });
}
// ---------- Closing ----------
{
  const s = pres.addSlide(); n++; base(s, true);
  s.addText('Companion artefacts', { x: 0.8, y: 1.6, w: 11.5, h: 0.8, fontFace: HFONT, fontSize: 36, bold: true, color: WHITE, isTextBox: true, margin: 0 });
  bullets(s, ['APIHUB_C4_architecture.md — full C4 model with 26 Mermaid diagrams, tables, appendices (renders on GitHub / Cursor)',
    'APIHUB_C4_architecture.drawio — 17 editable draw.io pages (context, containers, components, code, deployment, dynamic flows)',
    'APIHUB_C4_architecture.pptx — this deck',
    'All three are generated from tools/architecture-model/c4 in the APIHUB monorepo; the April 2026 set is superseded'], 0.8, 2.6, 11.5, 3.2, 16, ICE);
  footer(s, n, true);
}

pres.writeFile({ fileName: 'APIHUB_C4_architecture.pptx' }).then(() => console.log('slides:', n));
