import { withBase } from '../lib/paths';

// ─── Site URLs ───────────────────────────────────────────────────────────────
export const GITHUB_URL = 'https://github.com/Netcracker/qubership-apihub';
export const DOCS_URL = 'https://github.com/Netcracker/qubership-apihub/blob/main/docs/user-guide.md';
export const INSTALL_URL = 'https://github.com/Netcracker/qubership-apihub/blob/main/docs/installation-guide.md';
export const ADMIN_URL = 'https://github.com/Netcracker/qubership-apihub/blob/main/docs/admin-guide.md';
export const RELEASES_URL = 'https://github.com/Netcracker/qubership-apihub/releases';
export const WIKI_URL = 'https://github.com/Netcracker/qubership-apihub/wiki';

/** Raw files from the GitHub wiki repo (same paths as in the wiki clone, e.g. images/…). */
export const WIKI_RAW_BASE = 'https://raw.githubusercontent.com/wiki/Netcracker/qubership-apihub';
export const WIKI_IMG_APPLICATIONS_ARCH = `${WIKI_RAW_BASE}/images/APIHUB_applications.png`;
export const WIKI_IMG_VS_API_MANAGEMENT = `${WIKI_RAW_BASE}/images/APIHUB_vs_API_Management_domain.png`;

// ─── Navigation ──────────────────────────────────────────────────────────────
export const NAV_LINKS = [
  { label: 'Why APIHUB', href: withBase('why/') },
  { label: 'Use Cases', href: withBase('use-cases/') },
  { label: 'Features', href: withBase('features/') },
  { label: 'Capabilities', href: withBase('capabilities/') },
  { label: 'Radar', href: withBase('radar/') },
  { label: 'Releases', href: withBase('releases/') },
  { label: 'Deploy', href: withBase('deploy/') },
  { label: 'Docs', href: withBase('docs/') },
  { label: 'Guides', href: DOCS_URL, external: true },
];

// ─── Stats ───────────────────────────────────────────────────────────────────
export const stats = [
  { value: '27+', label: 'Open Source Repositories' },
  { value: 'v2.15.0', label: 'Latest Release' },
  { value: 'Contracts', label: 'API Types + DDLAPI + MCP' },
  { value: 'MCP', label: 'Server + Catalog Contracts' },
];

// ─── Pillars ─────────────────────────────────────────────────────────────────
export const pillars = [
  {
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-7 h-7"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>`,
    title: 'Unified Contract Catalog',
    description: 'Version REST, GraphQL, AsyncAPI, database schemas (DDLAPI), and MCP tool surfaces in one hierarchy — workspaces, groups, packages, and releases. One place for every machine-readable contract.',
    color: 'blue',
    href: withBase('capabilities/'),
  },
  {
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-7 h-7"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>`,
    title: 'Automated Compatibility Checks',
    description: 'Know exactly what breaks before it reaches production. The diff engine classifies changes as Breaking, Semi-Breaking, Deprecated, or Non-Breaking — for REST, GraphQL, AsyncAPI, and DDLAPI.',
    color: 'violet',
    href: withBase('features/'),
  },
  {
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-7 h-7"><path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.563.563 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" /></svg>`,
    title: 'Quality & Governance at Scale',
    description: 'Enforce standards with Spectral linting, AI-powered recommendations, and configurable rulesets. Inline highlighting and multi-linter results in one dashboard.',
    color: 'indigo',
    href: withBase('capabilities/'),
  },
];

// ─── Why APIHUB: business case (/why) ────────────────────────────────────────
export const whyRows = [
  {
    id: 'inventory',
    number: '01',
    title: 'Knowing what you have',
    without:
      'Nobody can say how many APIs exist, which version is live in production, or who depends on them. Knowledge sits in people\'s heads, spreadsheets, and wiki pages that stopped being true a year ago. When a key engineer leaves, the map leaves with them.',
    with:
      'One searchable catalog of every API contract — REST, GraphQL, event streams, database schemas, AI tool interfaces. Agents in your Kubernetes clusters discover what is actually deployed and keep the catalog current without manual updates.',
    outcome:
      'The organization owns its integration landscape, not individual employees. Audits, due diligence, and "what would break if we switch this off?" questions get answers in minutes.',
  },
  {
    id: 'breaking-changes',
    number: '02',
    title: 'Changes that break other people\'s systems',
    without:
      'A developer renames a field or removes a parameter. Nothing in the process catches it. Weeks later a partner integration or the mobile app fails in production. The incident is found by customers, fixed over a weekend, and followed by a meeting about whose fault it was.',
    with:
      'Every new version is compared with the previous one automatically. Each change is classified as breaking, risky, deprecating, or safe — before release, in the CI pipeline, with the option to block the merge. Consumers see the full changelog of what will affect them.',
    outcome:
      'Fewer production incidents caused by integration breaks, predictable releases, and lower support and on-call cost. Backward compatibility becomes a policy, not a hope.',
  },
  {
    id: 'documentation',
    number: '03',
    title: 'Documentation as a tax',
    without:
      'Documentation is written by hand, after the fact, in whatever format each team prefers. It is out of date the day it is published. Analysts and technical writers spend weeks per release re-describing what the code already says. Partners ask for "the latest doc" by email.',
    with:
      'Documentation is generated from the contract itself, versioned alongside it, and available with an interactive "try it" playground. There is one format, one place, one link per version. Markdown guides, examples, and diagrams live next to the spec.',
    outcome:
      'Documentation overhead drops from a recurring project to a by-product of publishing. Partner and customer integrations start faster and generate fewer support tickets.',
  },
  {
    id: 'design-review',
    number: '04',
    title: 'Design review by meeting',
    without:
      'API standards exist on a wiki page nobody reads. Reviews happen in meetings and email threads, inconsistently, depending on who is available. Inconsistencies in naming, errors, and security schemes are discovered late, when fixing them means rework across several teams.',
    with:
      'Standards are encoded as rules — Spectral rulesets, optionally AI-assisted review — and executed automatically on every publish. Each version receives a quality score visible to every team. Architects review exceptions and disagreements instead of every file.',
    outcome:
      'Shorter approval cycles, consistent APIs across teams and vendors, and far less late-stage rework. Governance scales with automation, not with headcount.',
  },
  {
    id: 'coordination',
    number: '05',
    title: 'Teams waiting on each other',
    without:
      '"Is it safe to upgrade?" is a question answered in chat, if at all. Consumers postpone upgrades, producers keep old versions alive indefinitely, and releases are preceded by integration freezes and manual regression rounds.',
    with:
      'Every consumer can see, per version, exactly what changed and what is deprecated, and can compare any two versions or revisions. Producers and consumers work in parallel with a shared, machine-checked contract.',
    outcome:
      'Faster time-to-market for features that span several teams, fewer coordination meetings, and a clean deprecation path instead of an ever-growing legacy surface.',
  },
  {
    id: 'ai',
    number: '06',
    title: 'AI that knows your systems',
    without:
      'Developers ask AI assistants about internal APIs and get confident, wrong answers, because the assistant has never seen the real contracts. Building AI agents on top of your systems means hand-feeding them documentation that is already stale.',
    with:
      'APIHUB exposes the catalog through the Model Context Protocol (MCP), so IDE assistants and AI agents query the real, current contracts and their change history. Your own MCP tool surfaces can be published and versioned as contracts, too.',
    outcome:
      'AI adoption in engineering is grounded in facts, not guesses. Contract knowledge becomes an asset that both people and machines can use.',
  },
];

export const whyOutcomes = [
  { title: 'Fewer incidents', text: 'Breaking changes are caught before release, not by customers.', color: 'blue' },
  { title: 'Faster delivery', text: 'Teams and partners integrate against a known, versioned contract instead of waiting for each other.', color: 'violet' },
  { title: 'Lower overhead', text: 'Documentation, change review, and standards checks become automated by-products of publishing.', color: 'emerald' },
  { title: 'Less key-person risk', text: 'The integration landscape belongs to the organization, discoverable by anyone.', color: 'cyan' },
  { title: 'Audit readiness', text: 'Every version, change, and review decision has a record and an owner.', color: 'orange' },
  { title: 'No license bill', text: 'Apache 2.0, self-hosted, data stays in your perimeter. Cost does not scale with headcount.', color: 'pink' },
];

// ─── Why APIHUB: positioning (/why) ──────────────────────────────────────────
export const domainCoverage = [
  { domain: 'API Portal', detail: 'Portal, doc viewer, playground, search', level: 'full' },
  { domain: 'API Lifecycle', detail: 'Versions, revisions, diffs, deprecations, export', level: 'full' },
  { domain: 'API Policy', detail: 'Spectral + AI linter, rulesets, quality score', level: 'strong' },
  { domain: 'Analytics & Monitoring', detail: 'Bring your gateway or APM', level: 'none' },
  { domain: 'API Gateway', detail: 'Runtime traffic — by design', level: 'none' },
  { domain: 'Monetization', detail: '', level: 'none' },
  { domain: 'Integration / low-code', detail: '', level: 'none' },
];

export const comparisonColumns = [
  { key: 'apihub', label: 'Qubership APIHUB', sub: '', highlight: true },
  { key: 'suites', label: 'Full APIM suites', sub: 'Kong Konnect, Apigee, Azure APIM, WSO2, Gravitee' },
  { key: 'design', label: 'Design & docs platforms', sub: 'SwaggerHub / API Hub, Stoplight, Redocly, Bump.sh, Postman' },
  { key: 'catalogs', label: 'Open-source catalogs', sub: 'Backstage API plugin, Apicurio Registry' },
  { key: 'cli', label: 'CLI tools', sub: 'oasdiff, Spectral' },
];

export const comparisonRows: { capability: string; cells: Record<string, string> }[] = [
  {
    capability: 'Contract types in one catalog',
    cells: {
      apihub: 'REST, GraphQL, AsyncAPI 3, DDL (DB schemas), MCP tools, Markdown, Protobuf stubs',
      suites: 'REST first; GraphQL / AsyncAPI vary by vendor',
      design: 'REST first; AsyncAPI in some (Bump.sh, Redocly); GraphQL in some',
      catalogs: 'Broad storage (Apicurio: Avro, Protobuf, JSON Schema too); rendering only in Backstage',
      cli: 'OpenAPI only',
    },
  },
  {
    capability: 'Breaking-change classification',
    cells: {
      apihub: 'Yes — REST, GraphQL, AsyncAPI, DDL (table schema Diff View); breaking / risky / deprecated / safe; operation-level diff; Excel export including MCP',
      suites: 'Basic or spec-lint only in most; not the core product',
      design: 'Yes for REST (varies); AsyncAPI in Bump.sh',
      catalogs: 'Apicurio: schema compatibility rules. Backstage: via oasdiff, OpenAPI only',
      cli: 'oasdiff: deep, OpenAPI only',
    },
  },
  {
    capability: 'Standards enforcement (linting)',
    cells: {
      apihub: 'Spectral rulesets per API type, AI-assisted review, version quality score',
      suites: 'Yes in higher tiers (Konnect, Apigee, Azure API Center)',
      design: 'Yes (SwaggerHub standardization, Redocly scorecards, Stoplight style guides)',
      catalogs: 'Backstage: no. Apicurio: validity rules',
      cli: 'Spectral: yes, no history or dashboard',
    },
  },
  {
    capability: 'Discovers what is actually deployed (K8s)',
    cells: {
      apihub: 'Yes — agents in each cluster, snapshot, promote to catalog; optional per-service discovery and PAT auth',
      suites: 'Gateway sees traffic, not contracts; catalogs need registration',
      design: 'No (Git / CI push model)',
      catalogs: 'Backstage: entity YAML in repos. Apicurio: push',
      cli: 'No',
    },
  },
  {
    capability: 'Developer portal with try-it',
    cells: {
      apihub: 'Yes — REST playground, GraphiQL, agent proxy for in-cluster calls',
      suites: 'Yes (often a paid add-on, per portal)',
      design: 'Yes — core strength, polished public-facing themes',
      catalogs: 'Backstage: basic. Apicurio: minimal',
      cli: 'No',
    },
  },
  {
    capability: 'SSO, RBAC, audit trail',
    cells: {
      apihub: 'Included — SAML, OIDC, LDAP, hierarchical roles, activity log',
      suites: 'Enterprise tier',
      design: 'Enterprise tier (often plus per-user SSO fee)',
      catalogs: 'Backstage: yes. Apicurio: yes',
      cli: 'n/a',
    },
  },
  {
    capability: 'AI / MCP',
    cells: {
      apihub: 'Built-in MCP server over the catalog, AI assistant, MCP contracts as a versioned type',
      suites: 'AI gateway features; MCP support emerging',
      design: 'MCP servers generated from docs (Bump.sh, Redocly)',
      catalogs: 'No',
      cli: 'oasdiff: hosted MCP',
    },
  },
  {
    capability: 'Runtime: gateway, traffic policy, analytics, monetization',
    cells: {
      apihub: 'No — by design',
      suites: 'Yes — core product',
      design: 'No',
      catalogs: 'No',
      cli: 'No',
    },
  },
  {
    capability: 'Visual designer, mocking, SDK generation',
    cells: {
      apihub: 'No — bring your editor; design tools are complementary',
      suites: 'Partial',
      design: 'Yes — core strength',
      catalogs: 'Apicurio Studio (separate)',
      cli: 'No',
    },
  },
  {
    capability: 'Deployment',
    cells: {
      apihub: 'Self-hosted: Helm or Docker Compose; PostgreSQL, optional S3',
      suites: 'SaaS or hybrid; heavy self-hosted stacks',
      design: 'SaaS (some on-prem in enterprise)',
      catalogs: 'Self-hosted',
      cli: 'Local / CI',
    },
  },
  {
    capability: 'License and cost',
    cells: {
      apihub: 'Apache 2.0, free, no per-seat fees',
      suites: 'Enterprise contracts; per-gateway and/or per-request; SSO and audit gated',
      design: 'Per-seat subscriptions (roughly USD 10–90 per user per month); SSO extra',
      catalogs: 'Apache 2.0, free',
      cli: 'Apache 2.0, free (oasdiff Pro paid)',
    },
  },
  {
    capability: 'Community and vendor scale',
    cells: {
      apihub: 'Netcracker-backed, 27+ repos, releases every 4–6 weeks; smaller community',
      suites: 'Large vendors, large ecosystems',
      design: 'Established vendors',
      catalogs: 'Large (Backstage is CNCF) / Red Hat',
      cli: 'Active OSS',
    },
  },
];

export const fitFor = [
  'You run many services (typically on Kubernetes) and need one source of truth for contracts across REST, GraphQL, events, and database schemas.',
  'You want breaking-change detection and standards checks in CI without a per-seat bill for every developer who reads the docs.',
  'Specifications must stay inside your own perimeter — regulated industries, on-prem, sovereign clouds.',
  'You already have a gateway (or several) and are missing the governance layer on top.',
  'You are building AI-assisted engineering and want assistants to work from real contracts.',
];

export const notFitFor = [
  'You need runtime API management — traffic routing, rate limiting, monetization, consumer key management. Use a gateway; APIHUB complements it.',
  'You want a visual design-first editor with mocking and SDK generation as the primary workflow (Stoplight, SwaggerHub, Apicurio Studio are built for that).',
  'A public, branded developer portal for external customers is your main deliverable (Redocly, Bump.sh, ReadMe-class products are stronger here).',
  'You want a fully managed SaaS with vendor SLAs — APIHUB is self-hosted and community-supported.',
];

// ─── Section nav cards (shown on home) ───────────────────────────────────────
export const sectionCards = [
  {
    href: withBase('use-cases/'),
    icon: '💡',
    title: 'Use Cases',
    description: 'See how API developers, DevOps, governance leads, data architects, and AI teams use APIHUB in real workflows.',
    color: 'blue',
  },
  {
    href: withBase('features/'),
    icon: '⚡',
    title: 'Features',
    description: 'Interactive showcase of discovery, breaking change detection, quality gates, K8s discovery, and more.',
    color: 'violet',
  },
  {
    href: withBase('capabilities/'),
    icon: '📦',
    title: 'All Capabilities',
    description: 'Complete feature matrix — API types, contract types (DDL & MCP), security, AI, export, and more.',
    color: 'indigo',
  },
  {
    href: withBase('radar/'),
    icon: '📡',
    title: 'Technology Radar',
    description: 'What we run and how we build it: Adopt, Trial, Assess, Hold across product runtime and engineering practice.',
    color: 'emerald',
  },
  {
    href: withBase('releases/'),
    icon: '🚀',
    title: 'Releases',
    description: 'Actively developed with releases every 4–6 weeks. See the full changelog from v2.5.x to v2.15.0.',
    color: 'emerald',
  },
  {
    href: withBase('deploy/'),
    icon: '🐳',
    title: 'Deploy',
    description: 'Docker Compose, Helm chart, or build from source. Architecture overview included.',
    color: 'orange',
  },
  {
    href: withBase('docs/architecture/'),
    icon: '🏛️',
    title: 'Architecture',
    description: 'The C4 model from context down to code, the three runtime flows, and 60 sub-capabilities mapped onto the services that implement them.',
    color: 'blue',
  },
];

// ─── Features (feature tab data) ─────────────────────────────────────────────
export const features = [
  {
    id: 'discovery',
    tab: 'API Discovery',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>`,
    title: 'Find Any API in Seconds',
    description: 'Powerful global search across all operations, documents, and packages. Navigate the full hierarchy — workspace → group → package → version — with rich filters.',
    bullets: [
      'Search across REST operations, GraphQL queries, AsyncAPI channels, DDL tables, and MCP tools',
      'Browse DDLAPI and MCP contracts in the same package hierarchy and on dashboards',
      'Deep-link directly into the doc view or package summary',
      'Filter by audience, tags, API kind, deprecation, and multiple version statuses',
    ],
    image: null,
    image2: null,
    alt: '',
    mockup: 'search',
  },
  {
    id: 'comparison',
    tab: 'Breaking Changes',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>`,
    title: 'Detect Breaking Changes Automatically',
    description: 'Version-to-version and operation-level diffs with automated classification. Compare versions, revisions, or REST path groups — including AsyncAPI and DDLAPI table schemas — with export to Excel for compliance.',
    bullets: [
      'Breaking / Semi-Breaking / Deprecated / Non-Breaking / Annotation severity',
      'Compare versions or revisions across REST, GraphQL, AsyncAPI, and DDLAPI (table schema Diff View)',
      'GraphQL no-BWC and experimental apiKind use the same change rules as REST',
      'Export REST, GraphQL, AsyncAPI, DDL, and MCP change lists to Excel',
    ],
    image: withBase('images/feature-breaking-changes.png'),
    image2: 'https://github.com/user-attachments/assets/34f7d6f6-ccd7-4e28-a88a-6cc5effc9f83',
    alt: 'API Changes comparison view showing breaking change classification',
    mockup: null,
  },
  {
    id: 'quality',
    tab: 'API Quality',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" /></svg>`,
    title: 'Enforce API Standards Automatically',
    description: 'Multi-linter governance with Spectral rulesets and AI-powered analysis. Inline spec highlighting shows exactly which line violates a rule.',
    bullets: [
      'Spectral engine with configurable custom rulesets per API type',
      'AI linter for OpenAI-powered quality recommendations',
      'Inline problem highlighting directly in the spec viewer',
      'Per-ruleset activation history and downloadable reports',
    ],
    image: withBase('images/feature-quality.png'),
    image2: 'https://github.com/user-attachments/assets/023db369-8f0f-4d77-b886-01a1fe4bfbde',
    alt: 'API Quality tab showing multi-linter results with inline spec highlighting',
    mockup: null,
  },
  {
    id: 'kubernetes',
    tab: 'K8s Discovery',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15a4.5 4.5 0 0 0 4.5 4.5H18a3.75 3.75 0 0 0 1.332-7.257 3 3 0 0 0-3.758-3.848 5.25 5.25 0 0 0-10.233 2.33A4.502 4.502 0 0 0 2.25 15Z" /></svg>`,
    title: 'Discover APIs Running in Your Clusters',
    description: 'Deploy lightweight agents to remote Kubernetes clusters. Agents automatically discover REST, GraphQL, and AsyncAPI services and promote specs into the central catalog.',
    bullets: [
      'Pluggable discovery runners: REST, GraphQL, AsyncAPI, JSON Schema',
      'Limit a run to specified services, or keep namespace-wide discovery',
      'PAT authentication for agents; heartbeat health checks with snapshot TTL cleanup',
      'One-click promotion from agent snapshot to the governed portal catalog',
    ],
    image: withBase('images/feature-k8s-discovery.png'),
    image2: null,
    alt: 'Kubernetes API discovery visualization showing cluster pods and API spec detection',
    mockup: null,
  },
  {
    id: 'playground',
    tab: 'REST Playground',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" /></svg>`,
    title: 'Try APIs Without Leaving the Portal',
    description: 'Spec-driven REST playground directly in the doc view. Pick server, fill parameters from the spec schema, send requests, and inspect responses.',
    bullets: [
      'Spec-driven parameter and body filling from OpenAPI schema',
      'Multiple server support with custom server override',
      'Agent Proxy for in-cluster testing via the K8s agent network',
      'Server selection and custom URLs persisted in local storage',
    ],
    image: 'https://github.com/user-attachments/assets/35e9c1dd-75bc-4dcf-95ee-a9b5b7f5ee65',
    image2: null,
    alt: 'REST Playground sidebar showing request builder and response viewer',
    mockup: null,
  },
  {
    id: 'asyncapi',
    tab: 'AsyncAPI',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" /></svg>`,
    title: 'First-Class AsyncAPI Support',
    description: 'AsyncAPI 3.0 treated as a first-class citizen — full doc rendering, SEND/RECEIVE badges, channel addressing, Kafka/AMQP bindings, and complete diff engine integration.',
    bullets: [
      'AsyncAPI 3.0 operation rendering with SEND/RECEIVE semantics',
      'Kafka, AMQP bindings at operation, channel, and message level',
      'Breaking change detection, classification, and Diff View in Doc Viewer',
      'Agent-based discovery of AsyncAPI services in Kubernetes clusters',
    ],
    image: 'https://github.com/user-attachments/assets/475d3256-8da5-4420-981d-65dcecccd579',
    image2: null,
    alt: 'AsyncAPI DocView showing SEND/RECEIVE operations with channel and binding details',
    mockup: null,
  },
  {
    id: 'contracts',
    tab: 'Contracts',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>`,
    title: 'Beyond API Types: Catalog Contracts',
    description: 'Publish DDLAPI database schemas and MCP tool/resource/prompt documents as first-class contracts in the same package versions. The Portal covers search, dashboards, changelog, and export — not only browse.',
    bullets: [
      'DDLAPI: table viewer, changelog, dashboards, and side-by-side schema Diff View',
      'MCP contracts: configure endpoints before publish, then search, compare, and export',
      'Shared build pipeline via ddlBuilder / mcpBuilder; document apiKind persisted on publish',
      'MCP server for IDEs remains separate: it queries the catalog; it is not the contract type',
    ],
    image: withBase('images/feature-ai-mcp.png'),
    image2: null,
    alt: 'Contract types — DDLAPI and MCP alongside classic API types',
    mockup: null,
  },
];

// ─── Business Scenarios ───────────────────────────────────────────────────────
export const scenarios = [
  {
    persona: 'API Developer',
    icon: '👨‍💻',
    title: 'Ship new API version safely',
    steps: ['Upload spec', 'Auto-build & diff', 'Review changes', 'Publish'],
    value: 'Ship confidently — see exactly what breaks for consumers before release',
    color: 'blue',
  },
  {
    persona: 'DevOps / CI Platform',
    icon: '⚙️',
    title: 'Block breaking changes in pull requests',
    steps: ['PR opened', 'CI triggers APIHUB', 'Diff computed', 'Previous version status checked', 'Breaking? Fail', 'Safe? Merge'],
    value: 'Zero breaking changes reach production. Every release is safe by default.',
    color: 'violet',
  },
  {
    persona: 'API Consumer / Team Lead',
    icon: '🧑‍💼',
    title: 'Onboard new developers in minutes',
    steps: ['Global search', 'Browse operations', 'Read docs & schemas', 'Try in Playground', 'Copy API key'],
    value: 'New developers become productive in hours, not days. No Slack pings needed.',
    color: 'emerald',
  },
  {
    persona: 'API Governance Lead',
    icon: '🏛️',
    title: 'Enforce API standards across all teams',
    steps: ['Upload ruleset', 'Activate per API type', 'Auto-lint on publish', 'Review dashboard', 'AI review edge cases'],
    value: '100% API coverage with automated governance. Quality scores visible to every team.',
    color: 'orange',
  },
  {
    persona: 'Platform Engineer',
    icon: '☸️',
    title: 'Always-current API inventory from K8s',
    steps: ['Deploy agent', 'Scope services or namespaces', 'Snapshot specs', 'Review in UI', 'Promote to catalog'],
    value: 'Catalog always reflects what\'s actually deployed. No stale docs, no manual updates.',
    color: 'cyan',
  },
  {
    persona: 'Data / Platform Architect',
    icon: '🗄️',
    title: 'Version database schemas next to APIs',
    steps: ['Publish DDLAPI', 'Review table viewer', 'Diff table schemas', 'Export changelog'],
    value: 'DB contracts live in the same catalog as service APIs — one release story for app and data.',
    color: 'indigo',
  },
  {
    persona: 'AI / LLM Developer',
    icon: '🤖',
    title: 'Give AI agents real contract knowledge',
    steps: ['Connect MCP client', 'Search catalog', 'Fetch specs & diffs', 'Publish MCP contracts', 'Generate code'],
    value: 'Use the MCP server for live catalog access, and store your own MCP surfaces as versioned contracts.',
    color: 'pink',
  },
];

// ─── Releases (legacy fallback; Releases page uses content/releases/*.md) ─────
export const releases = [
  {
    version: 'v2.15.0',
    date: 'September 24, 2026',
    latest: true,
    highlights: [
      'Global search authorization; MCP/DDL in MCP tools',
      'Archived version status removed; AI linter optional',
      'OpenTelemetry metrics; migration UX counters',
    ],
  },
  {
    version: 'v2.14.0',
    date: 'August 28, 2026',
    latest: false,
    highlights: [
      'MCP and DDL advanced Portal scenarios',
      'DDL table schema Diff View',
      'Multi-status version filter; scoped agent discovery',
    ],
  },
  {
    version: 'v2.13.0',
    date: 'July 30, 2026',
    latest: false,
    highlights: [
      'GraphQL no-BWC / experimental API Kind',
      'PAT authentication for Kubernetes agents',
      'Admin Builds API; config.yaml for linter and agents-backend',
    ],
  },
  {
    version: 'v2.12.0',
    date: 'July 15, 2026',
    latest: false,
    highlights: [
      'MCP & DDL catalog contracts in UI',
      'DDL table viewer and AsyncAPI Diff View',
      'Mermaid in Markdown docs; custom CA mounts',
    ],
  },
  {
    version: 'v2.11.0',
    date: 'June 1, 2026',
    latest: false,
    highlights: [
      'Honey AI Assistant productized',
      'AsyncAPI Quality Check in Portal',
      'Node.js 24 LTS for frontend libraries',
    ],
  },
  {
    version: 'v2.10.0',
    date: 'May 12, 2026',
    latest: false,
    highlights: [
      'AsyncAPI Operation Groups end-to-end',
      'Hardened nginx timeouts',
    ],
  },
  {
    version: 'v2.9.0',
    date: 'April 26, 2026',
    latest: false,
    highlights: [
      'Document shareability & AsyncAPI change classification',
      'MCP tools / AI chat metrics',
    ],
  },
  {
    version: 'v2.8.0',
    date: 'April 9, 2026',
    latest: false,
    highlights: [
      'AsyncAPI Phase 2/3 — full support across the stack',
      'REST & GraphQL Quality Gates',
    ],
  },
];

// ─── Formats ─────────────────────────────────────────────────────────────────
export const formats = [
  { name: 'OpenAPI 3.x', color: '#85E89D' },
  { name: 'Swagger 2.0', color: '#85E89D' },
  { name: 'GraphQL', color: '#E535AB' },
  { name: 'AsyncAPI 3.0', color: '#F7A541' },
  { name: 'DDLAPI', color: '#22D3EE' },
  { name: 'MCP Contracts', color: '#34D399' },
  { name: 'JSON Schema', color: '#60A5FA' },
  { name: 'Protobuf / gRPC', color: '#A78BFA' },
  { name: 'Markdown Docs', color: '#94A3B8' },
];

// ─── Deploy options ───────────────────────────────────────────────────────────
export const deployOptions = [
  {
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 17.25v-.228a4.5 4.5 0 0 0-.12-1.03l-2.268-9.64a3.375 3.375 0 0 0-3.285-2.602H7.923a3.375 3.375 0 0 0-3.285 2.602l-2.268 9.64a4.5 4.5 0 0 0-.12 1.03v.228m19.5 0a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3m19.5 0a3 3 0 0 0-3-3H5.25a3 3 0 0 0-3 3m16.5 0h.008v.008h-.008v-.008Zm-3 0h.008v.008h-.008v-.008Z" /></svg>`,
    title: 'Docker Compose',
    description: 'Get up and running in minutes. Every release ships a production-ready docker-compose configuration with all six services pre-configured.',
    badge: 'Recommended for dev',
    cta: 'View docker-compose',
    href: 'https://github.com/Netcracker/qubership-apihub/tree/main/docker-compose',
    color: 'blue',
  },
  {
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5a2.25 2.25 0 0 0 2.25 2.25Zm.75-12h9v9h-9v-9Z" /></svg>`,
    title: 'Kubernetes / Helm',
    description: 'Production-grade Kubernetes deployment with Helm charts. Full configurability via values.yaml — RBAC, resource limits, S3, SSO, monitoring, and API keys mounted as files.',
    badge: 'Production ready',
    cta: 'View Helm chart',
    href: 'https://github.com/Netcracker/qubership-apihub/tree/main/helm-templates',
    color: 'violet',
  },
  {
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8"><path stroke-linecap="round" stroke-linejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" /></svg>`,
    title: 'Build from Source',
    description: 'All 27+ repositories are open source under Apache 2.0. Build any component, run the full test suite, and contribute back to the project.',
    badge: 'Open source',
    cta: 'View on GitHub',
    href: GITHUB_URL,
    color: 'indigo',
  },
];
