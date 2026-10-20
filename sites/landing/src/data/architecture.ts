/**
 * Architecture documentation data.
 *
 * The capability model is imported verbatim from `capability-model.json`, which is a copy of
 * `diagrams/arch-deck-2026-09/model.json` in the APIHUB workspace. That file is itself exported
 * from `diagrams/capability-2026-09/model.py`, so capability edits flow from one source into the
 * slide deck and into this site. Re-copy the JSON to refresh; do not hand-edit it here.
 *
 * The C4 narrative below is authored for the web from the same deck.
 */
import model from './capability-model.json';

// ─── Types ───────────────────────────────────────────────────────────────────
export type ContainerKey = 'BE' | 'UI' | 'BTC' | 'LNT' | 'ABE' | 'AGT' | 'JTC' | 'LIB' | 'OPS';
export type MaturityKey = 'core' | 'evolving' | 'new' | 'planned';
export type TierKey = 'core' | 'differentiating' | 'supporting';

/** `[id, name, owning containers, implementation note, maturity]` */
export type SubCapability = [string, string, ContainerKey[], string, MaturityKey];

export interface Capability {
  id: string;
  name: string;
  tier: TierKey;
  desc: string;
  l2: SubCapability[];
}

export const capabilities = model.CAPABILITIES as unknown as Capability[];
export const maturity = model.MATURITY as Record<MaturityKey, { label: string; color: string; fill: string; text: string }>;
export const tiers = model.TIERS as Record<TierKey, string>;

// ─── Containers ──────────────────────────────────────────────────────────────
/**
 * The nine things the capability map can point at: seven deployable containers, the shared
 * TypeScript library stack, and the platform layer. Colours are the deck palette lifted for a
 * dark background.
 */
export const containers: Record<ContainerKey, {
  name: string;
  short: string;
  tech: string;
  color: string;
  repo: string;
}> = {
  BE:  { name: 'APIHUB Backend',      short: 'Backend',        tech: 'Go 1.26 · gorilla/mux · go-pg',  color: '#60a5fa', repo: 'qubership-apihub-backend' },
  UI:  { name: 'APIHUB UI',           short: 'UI',             tech: 'React 18 · MUI 5 · nginx 1.28',  color: '#38bdf8', repo: 'qubership-apihub-ui' },
  BTC: { name: 'Build Task Consumer', short: 'Build Consumer', tech: 'Node 24 · NestJS 10',            color: '#818cf8', repo: 'qubership-apihub-build-task-consumer' },
  LNT: { name: 'API Linter Service',  short: 'Linter',         tech: 'Go 1.26 · Spectral · OpenAI',    color: '#34d399', repo: 'qubership-api-linter-service' },
  ABE: { name: 'Agents Backend',      short: 'Agents Backend', tech: 'Go 1.26',                        color: '#10b981', repo: 'qubership-apihub-agents-backend' },
  AGT: { name: 'APIHUB Agent',        short: 'Agent',          tech: 'Go 1.26 · client-go',            color: '#fb923c', repo: 'qubership-apihub-agent' },
  JTC: { name: 'Java Task Consumer',  short: 'Java Consumer',  tech: 'Java 21 · japicmp · jdeps',      color: '#fbbf24', repo: 'qubership-apihub-java-task-consumer' },
  LIB: { name: 'TypeScript libraries', short: 'TS libraries',  tech: '12 npm packages',                color: '#2dd4bf', repo: 'qubership-apihub-json-crawl' },
  OPS: { name: 'Platform / Helm',     short: 'Platform',       tech: 'Helm · Kubernetes',              color: '#94a3b8', repo: 'qubership-apihub' },
};

/** Maturity colours for a dark surface, keyed the same way as the model. */
export const maturityTheme: Record<MaturityKey, { color: string; bg: string; border: string }> = {
  core:     { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.35)' },
  evolving: { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.35)' },
  new:      { color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.35)' },
  planned:  { color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.35)' },
};

export const tierTheme: Record<TierKey, { color: string; label: string; note: string }> = {
  core:            { color: '#60a5fa', label: 'Core',            note: 'The reason the product exists' },
  differentiating: { color: '#a78bfa', label: 'Differentiating', note: 'Rare in an API registry' },
  supporting:      { color: '#94a3b8', label: 'Supporting',      note: 'Needed to operate' },
};

// ─── Derived counts ──────────────────────────────────────────────────────────
export const subCapabilityCount = capabilities.reduce((acc, c) => acc + c.l2.length, 0);

/** How many sub-capabilities each container contributes to, ordered by weight. */
export const containerWeights = (Object.keys(containers) as ContainerKey[])
  .map((key) => ({
    key,
    count: capabilities.reduce((acc, c) => acc + c.l2.filter((l) => l[2].includes(key)).length, 0),
  }))
  .sort((a, b) => b.count - a.count);

export const maturityCounts = (Object.keys(maturity) as MaturityKey[]).map((key) => ({
  key,
  count: capabilities.reduce((acc, c) => acc + c.l2.filter((l) => l[4] === key).length, 0),
}));

/** Capability × container grid used by the cross-check matrix. */
export const matrixColumns: ContainerKey[] = ['BE', 'UI', 'BTC', 'LIB', 'LNT', 'ABE', 'AGT', 'JTC', 'OPS'];

// ─── C4: the method ──────────────────────────────────────────────────────────
export const c4Levels = [
  {
    id: 'L1',
    name: 'Context',
    question: 'Who uses the system and what does it depend on?',
    answer: 'One box for all of APIHUB',
    color: '#34d399',
  },
  {
    id: 'L2',
    name: 'Containers',
    question: 'Which deployable things exist and how do they talk?',
    answer: 'Seven services, three stores',
    color: '#2dd4bf',
  },
  {
    id: 'L3',
    name: 'Components',
    question: 'What lives inside one container?',
    answer: 'Controllers, services, runners',
    color: '#fbbf24',
  },
  {
    id: 'L4',
    name: 'Code',
    question: 'Which classes and registries actually matter?',
    answer: 'Pipelines, maps, plug-ins',
    color: '#fb923c',
  },
];

// ─── C4 level 1: system context ──────────────────────────────────────────────
export const contextActors = [
  { name: 'API Developer', does: 'Publishes and reviews' },
  { name: 'API Consumer', does: 'Reads and tries' },
  { name: 'Administrator', does: 'Roles, identity, rules' },
  { name: 'CI/CD pipeline', does: 'Publishes with a key' },
  { name: 'AI assistant', does: 'Queries over MCP' },
];

export const contextDependencies = [
  { name: 'PostgreSQL 14+', note: 'One database per service', required: true },
  { name: 'S3 / MinIO', note: 'Optional cold storage', required: false },
  { name: 'Identity provider', note: 'SAML · OIDC · LDAP', required: false },
  { name: 'LLM API', note: 'AI linting and chat, optional', required: false },
  { name: 'Kubernetes clusters', note: 'Where agents discover APIs', required: false },
  { name: 'GitHub · ghcr.io · npm', note: 'Images and packages', required: true },
];

// ─── C4 level 2: container catalogue ─────────────────────────────────────────
export const containerCatalogue: {
  key: ContainerKey;
  port: string;
  state: string;
  owns: string;
}[] = [
  {
    key: 'BE',
    port: ':8080',
    state: 'apihub database, optional S3',
    owns: '39 REST controllers, MCP server, AI chat, cron cleanup, database migrations',
  },
  {
    key: 'UI',
    port: ':8080',
    state: 'Stateless',
    owns: 'Portal and Agents single-page apps plus the reverse proxy in front of everything',
  },
  {
    key: 'BTC',
    port: ':3000',
    state: 'Stateless — scale to 3–6',
    owns: 'Runs PackageVersionBuilder: parse, normalize, diff, changelog, export',
  },
  {
    key: 'LNT',
    port: ':8080',
    state: 'apihub_linter database',
    owns: 'Spectral and AI engines, rulesets, bulk validation, version scoring, MCP endpoint',
  },
  {
    key: 'ABE',
    port: ':8080',
    state: 'agents database',
    owns: 'Agent registry and heartbeats, discovery orchestration, snapshot promotion',
  },
  {
    key: 'AGT',
    port: ':8080',
    state: 'Stateless',
    owns: 'Six discovery runners in parallel per service, plus a proxy into the cluster',
  },
  {
    key: 'JTC',
    port: ':3000',
    state: 'Stateless',
    owns: 'japicmp and jdeps pipelines; the backend java-builders queue is specified only',
  },
];

// ─── C4 level 3: components ──────────────────────────────────────────────────
export const backendGroups = [
  {
    name: 'HTTP edge',
    color: '#60a5fa',
    items: [
      { name: 'Router + middleware', note: 'gorilla/mux, Prometheus' },
      { name: 'Health / system info', note: '/live, /ready' },
    ],
  },
  {
    name: 'Security',
    color: '#fb923c',
    items: [
      { name: 'Auth strategies', note: 'go-guardian union' },
      { name: 'IDP manager', note: 'SAML · OIDC · LDAP' },
      { name: 'Roles & permissions', note: 'system · package · custom' },
    ],
  },
  {
    name: 'Catalogue',
    color: '#38bdf8',
    items: [
      { name: 'Packages', note: 'Workspaces, groups' },
      { name: 'Versions', note: 'Revisions, references' },
      { name: 'Operations', note: 'Tags, groups' },
      { name: 'Comparisons', note: 'Changes, summaries' },
      { name: 'Contracts', note: 'DDL and MCP' },
      { name: 'Search', note: 'v3 / v4 full text' },
    ],
  },
  {
    name: 'Build & export',
    color: '#818cf8',
    items: [
      { name: 'Build service', note: 'Queue, ownership' },
      { name: 'Build results', note: 'Unpack, store' },
      { name: 'Export', note: 'xlsx, ZIP, async' },
      { name: 'Transformation', note: 'Merged specs' },
      { name: 'Notifications', note: 'Olric topic' },
    ],
  },
  {
    name: 'AI & integration',
    color: '#a78bfa',
    items: [
      { name: 'MCP server', note: 'Streamable HTTP' },
      { name: 'AI chat', note: 'SSE, tool loop' },
      { name: 'Playground proxy', note: 'Allowed hosts' },
    ],
  },
  {
    name: 'Operations & data',
    color: '#94a3b8',
    items: [
      { name: 'Cleanup jobs', note: '8 cron schedules' },
      { name: 'Migrations', note: 'Schema + operations' },
      { name: 'Repositories', note: '~26, go-pg' },
      { name: 'Object storage', note: 'minio-go' },
    ],
  },
];

export const uiApps = [
  {
    name: 'Portal SPA',
    path: 'packages/portal',
    color: '#60a5fa',
    items: [
      'Catalogue navigation',
      'Version pages: operations, changes, deprecated, documents',
      'Compare versions and operations',
      'Dashboard editor and publish dialog',
      'Settings, roles, rulesets, tokens',
      'AI chat and contracts tab',
    ],
  },
  {
    name: 'Agents SPA',
    path: 'packages/agents',
    color: '#fb923c',
    items: [
      'Agents and namespaces',
      'Service discovery results',
      'Snapshots and promotion',
      'Namespace security checks',
    ],
  },
  {
    name: 'Shared package',
    path: 'packages/shared',
    color: '#a78bfa',
    items: [
      'Entities: api-types, contract-types',
      'Hooks and react-query clients',
      'MUI theme and widgets',
      'Storybook showcase',
    ],
  },
];

export const webComponents = [
  { name: 'apispec-view', color: '#a78bfa' },
  { name: 'operation-view', color: '#a78bfa' },
  { name: 'diff-operation-view', color: '#a78bfa' },
  { name: 'rest-playground', color: '#2dd4bf' },
  { name: 'class-view', color: '#34d399' },
  { name: 'api-doc-viewer', color: '#818cf8' },
];

export const workerLanes: {
  key: ContainerKey;
  steps: { name: string; note: string }[];
  status: string;
  live: boolean;
}[] = [
  {
    key: 'BTC',
    steps: [
      { name: 'Task poller', note: 'An RxJS interval asks /api/v2/builders/{id}/tasks' },
      { name: 'Schema validation', note: 'ajv over the build configuration' },
      { name: 'PackageVersionBuilder', note: 'api-processor: 7 builders, 10 strategies' },
      { name: 'Resolvers', note: 'Fetch previous versions from the backend' },
      { name: 'Result sender', note: 'ZIP to /api/v3/…/publish/{id}/status' },
    ],
    status: 'Live and scaled in production',
    live: true,
  },
  {
    key: 'JTC',
    steps: [
      { name: 'Task poller', note: 'Asks /api/v2/java-builders/{id}/tasks' },
      { name: 'Build executor', note: 'Maps a build type to a pipeline' },
      { name: 'jdiff-engine', note: 'ApiReport · ApiDiff · UpgradeImpact' },
      { name: 'Jar resolver', note: 'Maven coordinates or OCI image layers' },
      { name: 'Result packager', note: 'report.json inside a ZIP' },
    ],
    status: 'Backend endpoints not implemented yet',
    live: false,
  },
];

export const linterChain = [
  { name: 'Publish event', note: 'Olric topic version-published', color: '#818cf8' },
  { name: 'Version task', note: 'Fetch documents from the backend', color: '#60a5fa' },
  { name: 'Document tasks', note: 'Fan out into a worker pool', color: '#2dd4bf' },
  { name: 'Linter selector', note: 'Engine per API type and package', color: '#34d399' },
  { name: 'Result + score', note: 'Stored in apihub_linter', color: '#fbbf24' },
];

export const linterEngines = [
  {
    name: 'Spectral engine',
    color: '#34d399',
    active: true,
    items: [
      'Bundled CLI binary in the image',
      'Rulesets managed in the Portal',
      'OpenAPI and AsyncAPI documents',
      'The default path for every publish',
    ],
  },
  {
    name: 'AI engine',
    color: '#a78bfa',
    active: true,
    items: [
      'OpenAI-compatible client',
      'Rate limited, opt-in per package',
      'Catches what rules cannot express',
      'Disabled by default',
    ],
  },
  {
    name: 'Vacuum engine',
    color: '#94a3b8',
    active: false,
    items: [
      'Binary and rules ship in the image',
      'Not wired into the selector',
      'Looks available from outside',
      'Worth a decision: use or remove',
    ],
  },
];

export const agentsBackendParts = [
  { name: 'Agent registry', note: 'Registration and heartbeats every ~30 s' },
  { name: 'Discovery orchestration', note: 'Workspace-scoped runs against one agent' },
  { name: 'Snapshot service', note: 'Packages found specs and publishes versions' },
  { name: 'Namespace security', note: 'auth-check processes and Excel reports' },
  { name: 'Proxy', note: 'Forwards UI calls through the agent' },
];

export const agentParts = [
  { name: 'Registration', note: 'Announces itself, then heartbeats' },
  { name: 'Cloud service', note: 'client-go lists namespaces, services, routes' },
  { name: 'Document discovery', note: 'Runs every runner in parallel per service' },
];

export const discoveryRunners = ['REST', 'GraphQL', 'AsyncAPI', 'Markdown', 'JSON Schema', 'Generic'];

// ─── C4 level 4: code ────────────────────────────────────────────────────────
export const requestPipeline = [
  { name: 'mux.Router', note: 'Service.go', tone: 'edge' },
  { name: 'Middleware', note: 'Metrics, deadlines', tone: 'edge' },
  { name: 'Security', note: 'go-guardian union', tone: 'edge' },
  { name: 'Controller', note: '39 of them', tone: 'core' },
  { name: 'Service', note: 'Business logic', tone: 'core' },
  { name: 'Repository', note: 'go-pg', tone: 'data' },
  { name: 'Entity', note: 'Database rows', tone: 'data' },
];

export const authStrategies = [
  'Cookie JWT',
  'Bearer JWT',
  'Refresh token',
  'API key',
  'Personal token',
  'Custom JWT',
  'Ephemeral file token',
];

export const cronJobs = [
  { name: 'Revisions', schedule: '0 21 * * 0' },
  { name: 'Comparisons', schedule: '0 5 * * 0' },
  { name: 'Soft-deleted data', schedule: '0 22 * * 5' },
  { name: 'Unreferenced data', schedule: '0 15 * * 6' },
  { name: 'Maintenance VACUUM', schedule: '0 2 * * 1' },
  { name: 'Builds', schedule: '0 1 * * 0' },
  { name: 'Ephemeral files', schedule: '*/5 * * * *' },
  { name: 'AI chat retention', schedule: '15 3 * * *' },
];

export const specTypes = [
  'openapi-3.0',
  'openapi-3.1',
  'json-schema-04',
  'json-schema-06',
  'json-schema-07',
  'asyncapi-3',
  'graphapi',
  'ddlapi-1.0',
];

export const specTypeRegistries = [
  {
    name: 'RULES',
    lib: 'api-unifier',
    color: '#60a5fa',
    desc: 'Normalization rules per type — resolve references, merge schemas, hash',
  },
  {
    name: 'COMPARE_ENGINES_MAP',
    lib: 'api-diff',
    color: '#a78bfa',
    desc: 'A comparison engine per type, producing classified changes',
  },
];

export const newTypeChecklist = [
  'spec-type.ts',
  'RULES map',
  'Compare engine',
  'api-processor builder',
  'Backend ApiType',
  'UI api-types.ts',
  'Consumer schema',
  'Agent runner',
];

export const apiBuilders = [
  { name: 'rest', color: '#60a5fa' },
  { name: 'graphql', color: '#a78bfa' },
  { name: 'asyncapi', color: '#2dd4bf' },
  { name: 'ddl', color: '#f472b6' },
  { name: 'mcp', color: '#fb923c' },
  { name: 'text', color: '#94a3b8' },
  { name: 'unknown', color: '#64748b' },
];

export const buildStrategies = [
  { name: 'build', group: 'build' },
  { name: 'changelog', group: 'build' },
  { name: 'prefix-groups-changelog', group: 'build' },
  { name: 'exportVersion', group: 'export' },
  { name: 'exportRestDocument', group: 'export' },
  { name: 'exportRestOperationsGroup', group: 'export' },
  { name: 'exportGraphqlOperationsGroup', group: 'export' },
  { name: 'exportAsyncapiOperationsGroup', group: 'export' },
  { name: 'documentGroup', group: 'deprecated' },
  { name: 'mergedSpecification', group: 'deprecated' },
];

// ─── Deployment ──────────────────────────────────────────────────────────────
export const deployments: { key: ContainerKey; scale: string; separate?: boolean }[] = [
  { key: 'UI', scale: '1 replica' },
  { key: 'BE', scale: '1 · 3 CPU / 3 Gi' },
  { key: 'BTC', scale: '3–6 replicas' },
  { key: 'LNT', scale: '1 · 1 Gi' },
  { key: 'ABE', scale: '1 · 256 Mi' },
  { key: 'JTC', scale: 'Separate chart', separate: true },
];

export const deploymentStores = [
  { name: 'PostgreSQL 14+', note: 'apihub, apihub_linter, agents' },
  { name: 'Olric', note: 'Embedded in the backend and linter pods' },
  { name: 'S3 / MinIO', note: 'Optional' },
];

export const chartExtras = [
  'Prometheus ServiceMonitor',
  'Two Grafana dashboards',
  'Configuration and secrets per service',
  'Quickstart: PostgreSQL, Keycloak, Superset',
  'Compose variants for local runs',
];

// ─── Dynamic views ───────────────────────────────────────────────────────────
export interface Flow {
  id: string;
  title: string;
  lead: string;
  image: string;
  lanes: { name: string; color: string }[];
  steps: { lane: number; name: string; note: string }[];
  footnote: string;
}

export const flows: Flow[] = [
  {
    id: 'publish',
    title: 'Publishing a version',
    lead: 'Four participants. The worker does the heavy lifting and never holds state.',
    image: 'images/architecture/flow-publish.svg',
    lanes: [
      { name: 'UI / CI', color: '#38bdf8' },
      { name: 'Backend', color: '#60a5fa' },
      { name: 'Build Consumer', color: '#818cf8' },
      { name: 'Linter', color: '#34d399' },
    ],
    steps: [
      { lane: 0, name: 'Upload sources', note: 'Multipart or ZIP' },
      { lane: 1, name: 'Create build task', note: 'Stored in PostgreSQL' },
      { lane: 2, name: 'Poll and receive', note: 'Task ZIP with configuration' },
      { lane: 2, name: 'Parse · normalize · diff', note: 'api-processor pipeline' },
      { lane: 1, name: 'Store results', note: 'Documents, operations, changes' },
      { lane: 1, name: 'Publish event', note: 'Olric topic' },
      { lane: 3, name: 'Lint and score', note: 'Spectral, optionally AI' },
    ],
    footnote:
      'Steps 3 and 4 repeat for every document in the package. Step 7 happens asynchronously, so publishing never waits for linting.',
  },
  {
    id: 'discovery',
    title: 'Finding APIs already running',
    lead: 'The only flow that starts outside APIHUB — in someone else’s cluster.',
    image: 'images/architecture/flow-discovery.svg',
    lanes: [
      { name: 'User / Agents SPA', color: '#38bdf8' },
      { name: 'Agents Backend', color: '#10b981' },
      { name: 'Agent', color: '#fb923c' },
      { name: 'Cluster services', color: '#94a3b8' },
    ],
    steps: [
      { lane: 2, name: 'Register', note: 'On startup, then heartbeat' },
      { lane: 0, name: 'Run discovery', note: 'Pick a namespace and workspace' },
      { lane: 1, name: 'Forward request', note: 'To the chosen agent' },
      { lane: 3, name: 'List services', note: 'Via the Kubernetes API' },
      { lane: 3, name: 'Probe endpoints', note: 'Six runners in parallel' },
      { lane: 1, name: 'Return findings', note: 'Documents and failed calls' },
      { lane: 1, name: 'Promote snapshot', note: 'Publish versions to the Portal' },
    ],
    footnote:
      'Nothing is published automatically: discovery produces a snapshot, and a person decides whether it becomes a catalogue version.',
  },
];

export const aiPaths = [
  {
    name: 'Path A · external MCP client',
    color: '#818cf8',
    steps: [
      { name: 'Client initialises', note: 'Cursor, Claude or a bot authenticates with an API key or personal token' },
      { name: 'Session opens', note: 'Streamable HTTP transport, idle timeout 15 minutes' },
      { name: 'Tool call', note: 'search, specification, diff or document' },
      { name: 'Backend answers', note: 'Access control applied per user before anything is returned' },
    ],
  },
  {
    name: 'Path B · the built-in chat',
    color: '#a78bfa',
    steps: [
      { name: 'Question arrives', note: 'Streamed over server-sent events from the Portal' },
      { name: 'Model plans', note: 'The same catalogue tools plus a clarification tool' },
      { name: 'Loop runs', note: 'Up to ten tool calls per turn, each one access-checked' },
      { name: 'Answer streams back', note: 'Generated files offered as temporary downloads' },
    ],
  },
];

export const mcpTools = [
  'search_api_operations',
  'get_api_operation_specification',
  'get_api_operation_diff',
  'get_document',
];

// ─── ArchiMate ───────────────────────────────────────────────────────────────
export const archimateLayers = [
  {
    name: 'Business layer',
    color: '#fbbf24',
    items: [
      'API Publishing',
      'API Catalog Browsing',
      'API Change Review',
      'API Quality Assessment',
      'Runtime API Discovery',
      'AI-assisted API Access',
      'Platform Administration',
    ],
  },
  {
    name: 'Application layer · services',
    color: '#2dd4bf',
    items: [
      'Package & Version Management',
      'Build & Publish',
      'Comparison & Changelog',
      'Documentation & Playground',
      'Linting & Scoring',
      'Agent Discovery',
      'MCP Tool Service',
      'AI Chat',
      'Identity & Access',
      'Java API Analysis',
    ],
  },
  {
    name: 'Application layer · components',
    color: '#60a5fa',
    items: [
      'APIHUB Backend',
      'APIHUB UI',
      'Build Task Consumer',
      'API Linter Service',
      'Agents Backend',
      'APIHUB Agent',
      'Java Task Consumer',
    ],
  },
  {
    name: 'Technology layer',
    color: '#34d399',
    items: [
      'Kubernetes cluster',
      'Remote cluster',
      'PostgreSQL',
      'S3 / MinIO',
      'Olric',
      'nginx',
      'Identity provider',
      'LLM API',
      'Helm / GitHub Actions',
    ],
  },
];
