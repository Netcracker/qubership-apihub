export type RadarQuadrant = 'techniques' | 'tools' | 'platforms' | 'languages';
export type RadarRing = 'adopt' | 'trial' | 'assess' | 'hold';
export type RadarDomain = 'product' | 'engineering' | 'both';

export type RadarBlip = {
  id: number;
  name: string;
  quadrant: RadarQuadrant;
  ring: RadarRing;
  domain: RadarDomain;
  why: string;
};

export type PlacedBlip = RadarBlip & { x: number; y: number };

export const RADAR_SNAPSHOT = 'September 2026';
export const RADAR_SIZE = 640;

export const QUADRANT_LABEL: Record<RadarQuadrant, string> = {
  techniques: 'Techniques',
  tools: 'Tools',
  platforms: 'Platforms',
  languages: 'Languages & frameworks',
};

export const RING_LABEL: Record<RadarRing, string> = {
  adopt: 'Adopt',
  trial: 'Trial',
  assess: 'Assess',
  hold: 'Hold',
};

export const DOMAIN_LABEL: Record<RadarDomain, string> = {
  product: 'Product',
  engineering: 'Engineering',
  both: 'Product + engineering',
};

export const RING_ORDER: RadarRing[] = ['adopt', 'trial', 'assess', 'hold'];

export const RING_COLOR: Record<RadarRing, string> = {
  adopt: '#34d399',
  trial: '#60a5fa',
  assess: '#fbbf24',
  hold: '#fb7185',
};

export const RING_HELP: Record<RadarRing, string> = {
  adopt: 'Default choice. Use it unless there is a concrete reason not to.',
  trial: 'Already in limited production. Worth repeating on the next similar problem.',
  assess: 'Worth a spike. Do not bet a release on it yet.',
  hold: 'Stop investing, or do not introduce it as a new default.',
};

export const QUADRANT_HELP: Record<RadarQuadrant, string> = {
  techniques: 'How the product behaves and how the team builds: registry pattern, E2E, MCP, hold items.',
  tools: 'CLI, CI, editors, linters, and the agent harness.',
  platforms: 'Where it runs: Kubernetes, PostgreSQL, identity, optional OpenAI and S3.',
  languages: 'Go, TypeScript, React, and the API formats the hub understands.',
};

const RAW: Omit<RadarBlip, 'id'>[] = [
  {
    name: 'Conventional Commits',
    quadrant: 'techniques',
    ring: 'adopt',
    domain: 'engineering',
    why: 'PR title lint and reusable CI gates enforce type(scope): description across product repositories.',
  },
  {
    name: 'Reusable GitHub Actions',
    quadrant: 'techniques',
    ring: 'adopt',
    domain: 'engineering',
    why: 'qubership-apihub-ci publishes workflow_call pipelines (Docker, frontend, E2E, linters, reports) consumed by the other repos.',
  },
  {
    name: 'API-type registry pattern',
    quadrant: 'techniques',
    ring: 'adopt',
    domain: 'product',
    why: 'Every layer registers types in a map: SpecType to RULES, COMPARE_ENGINES_MAP, ApiBuilder[], DiscoveryRunner[], backend ApiType, UI constants.',
  },
  {
    name: 'CrawlRules traversal',
    quadrant: 'techniques',
    ring: 'adopt',
    domain: 'product',
    why: 'json-crawl rule trees are the shared walk for unifier, diff, data-model, and visitor. New formats extend rules, not ad-hoc walkers.',
  },
  {
    name: 'Classified changelog',
    quadrant: 'techniques',
    ring: 'adopt',
    domain: 'product',
    why: 'api-diff labels changes as breaking, non-breaking, risky, annotation, or deprecated. That classification is the product compatibility story.',
  },
  {
    name: 'Spec unification',
    quadrant: 'techniques',
    ring: 'adopt',
    domain: 'product',
    why: 'The build pipeline resolves $ref (including cycles), merges allOf, infers defaults, and hashes structure before persist and compare.',
  },
  {
    name: 'Package-level RBAC',
    quadrant: 'techniques',
    ring: 'adopt',
    domain: 'product',
    why: 'Viewer, Editor, and Owner plus custom roles and API-key scopes. Auth is SAML, OIDC, LDAP, PAT, or local JWT in non-production.',
  },
  {
    name: 'Dist-tag branching',
    quadrant: 'techniques',
    ring: 'adopt',
    domain: 'engineering',
    why: 'develop maps to dev, release to next, git tags to latest for both GHCR images and GitHub NPM. Feature branches get slug tags.',
  },
  {
    name: 'Full-stack E2E',
    quadrant: 'techniques',
    ring: 'adopt',
    domain: 'engineering',
    why: 'CI brings the stack up with podman-compose, then Newman (Postman) for the backend and Playwright for Portal and Agents UI.',
  },
  {
    name: 'Poll-based workers',
    quadrant: 'techniques',
    ring: 'adopt',
    domain: 'product',
    why: 'Build-task-consumer instances poll the backend for tasks. Workers stay stateless and scale horizontally without a message bus.',
  },
  {
    name: 'Web Components + Shadow DOM',
    quadrant: 'techniques',
    ring: 'adopt',
    domain: 'product',
    why: 'apispec-view, rest-playground, and class-view ship as custom elements so Portal can embed isolated viewers.',
  },
  {
    name: 'Agent-native engineering',
    quadrant: 'techniques',
    ring: 'trial',
    domain: 'engineering',
    why: 'APM packages in qubership-apihub-ci install into Cursor and Claude via apm.yml in a dozen repos (Go developer, self-review, conventions).',
  },
  {
    name: 'MCP for AI catalog clients',
    quadrant: 'techniques',
    ring: 'trial',
    domain: 'both',
    why: 'Backend exposes /api/v1/mcp/. Honey and IDE MCP servers search operations, fetch specs, and diff versions against a live catalog.',
  },
  {
    name: 'AI lint + version scoring',
    quadrant: 'techniques',
    ring: 'trial',
    domain: 'product',
    why: 'Linter service runs Spectral, then an optional OpenAI OAS engine, then a version-level quality score after publish via Olric events.',
  },
  {
    name: 'Kind local Kubernetes',
    quadrant: 'techniques',
    ring: 'trial',
    domain: 'engineering',
    why: 'helm-templates/local-k8s-quickstart is the in-cluster path next to Docker Compose, for ingress, ServiceMonitor, or the optional analytics subchart.',
  },
  {
    name: 'Visual regression',
    quadrant: 'techniques',
    ring: 'trial',
    domain: 'engineering',
    why: 'Screenshot CI uses Puppeteer and jest-image-snapshot. Playwright covers flows; this path guards pixel diffs and can regenerate baselines.',
  },
  {
    name: 'DDLAPI + MCP contracts',
    quadrant: 'techniques',
    ring: 'trial',
    domain: 'product',
    why: 'DDLAPI is a SpecType (ddlapi-1.0) with unifier and diff. MCP catalog contracts are a processor contract type, not operations. Both show in Portal Contracts.',
  },
  {
    name: 'Tyk GitOps bridge',
    quadrant: 'techniques',
    ring: 'assess',
    domain: 'product',
    why: 'qubership-apihub-tyk-adapter is design-only. No implementation yet; treat it as a candidate gateway export, not a shipping integration.',
  },
  {
    name: 'Java API builds in the hub',
    quadrant: 'techniques',
    ring: 'assess',
    domain: 'both',
    why: 'java-task-consumer can poll for java-api-report, java-api-diff, and upgrade-impact (japicmp, jdeps). Backend wiring is still marked future.',
  },
  {
    name: 'Protobuf/gRPC full pipeline',
    quadrant: 'techniques',
    ring: 'assess',
    domain: 'product',
    why: 'Backend and the Nest worker recognize the type. Unifier, diff, UI viewers, and agent discovery are missing. Do not present it as first-class yet.',
  },
  {
    name: 'Password auth in production',
    quadrant: 'techniques',
    ring: 'hold',
    domain: 'product',
    why: 'Local username/password to JWT is documented as non-production. Production mode expects SAML, OIDC, or LDAP.',
  },
  {
    name: 'AsyncAPI 2 as a first-class path',
    quadrant: 'techniques',
    ring: 'hold',
    domain: 'product',
    why: 'asyncapi-2 was superseded. New work goes through asyncapi-3 rules in unifier and diff.',
  },
  {
    name: 'Copy APM skills to workspace root',
    quadrant: 'techniques',
    ring: 'hold',
    domain: 'engineering',
    why: 'Nested discovery already scopes repo skills. A root copy drifts on the next apm install.',
  },
  {
    name: 'Add-ons as product services',
    quadrant: 'techniques',
    ring: 'hold',
    domain: 'engineering',
    why: 'Demo trees, wiki clones, and generated samples are extras, not deployable APIHUB services.',
  },
  {
    name: 'Helm',
    quadrant: 'tools',
    ring: 'adopt',
    domain: 'both',
    why: 'Production packaging lives in qubership-apihub. One chart deploys backend, UI, workers, and optional extensions.',
  },
  {
    name: 'Playwright',
    quadrant: 'tools',
    ring: 'adopt',
    domain: 'engineering',
    why: 'qubership-apihub-ui-tests is the Portal and Agents E2E suite, with page objects.',
  },
  {
    name: 'Newman / Postman',
    quadrant: 'tools',
    ring: 'adopt',
    domain: 'engineering',
    why: 'qubership-apihub-postman-collections is the backend API E2E suite, run from reusable CI.',
  },
  {
    name: 'Spectral',
    quadrant: 'tools',
    ring: 'adopt',
    domain: 'both',
    why: 'Product linter for OpenAPI and AsyncAPI 3, including custom rulesets. Also the default API-quality engine for the team.',
  },
  {
    name: 'Vite + Jest',
    quadrant: 'tools',
    ring: 'adopt',
    domain: 'engineering',
    why: 'UI and the TypeScript libraries build with Vite (ESM + CJS). Unit tests are Jest; screenshot tests use Jest image snapshots.',
  },
  {
    name: 'Monaco Editor',
    quadrant: 'tools',
    ring: 'adopt',
    domain: 'product',
    why: 'Portal uses Monaco for spec editing and request bodies in playground flows.',
  },
  {
    name: 'Dependabot',
    quadrant: 'tools',
    ring: 'adopt',
    domain: 'engineering',
    why: 'Go services and several libraries ship dependabot.yml. That is the in-repo dependency bot, not Renovate.',
  },
  {
    name: 'Super-linter + link-checker',
    quadrant: 'tools',
    ring: 'adopt',
    domain: 'engineering',
    why: 'Reusable PR quality workflows, plus Conventional Commits, CLA, auto-label, and auto-assign.',
  },
  {
    name: 'Buildx + QEMU',
    quadrant: 'tools',
    ring: 'adopt',
    domain: 'engineering',
    why: 'docker-ci builds multi-platform images and pushes to ghcr.io/netcracker/*.',
  },
  {
    name: 'Agent Package Manager',
    quadrant: 'tools',
    ring: 'trial',
    domain: 'engineering',
    why: 'apm install --target cursor,claude --legacy-skill-paths. Central store is qubership-apihub-ci/agent-packages; consumers keep apm.yml.',
  },
  {
    name: 'Cursor / Claude Code',
    quadrant: 'tools',
    ring: 'trial',
    domain: 'engineering',
    why: 'Deployed skills and AGENTS.md are the delivery harness. Treat them as toolchain, not as a product runtime.',
  },
  {
    name: 'apihub-api-diff CLI + MCP',
    quadrant: 'tools',
    ring: 'trial',
    domain: 'engineering',
    why: 'aux-tools ships a local changelog CLI and MCP that uses the same compare engines as api-processor.',
  },
  {
    name: 'Storybook 7/8',
    quadrant: 'tools',
    ring: 'trial',
    domain: 'engineering',
    why: 'Component showcase deploys to GitHub Pages per branch. Useful for viewer libraries; not the production UI host.',
  },
  {
    name: 'Podman',
    quadrant: 'tools',
    ring: 'trial',
    domain: 'engineering',
    why: 'Local development and E2E CI prefer Podman. GitHub Actions ubuntu-latest still invokes docker in some jobs.',
  },
  {
    name: 'Honey',
    quadrant: 'tools',
    ring: 'trial',
    domain: 'product',
    why: 'In-product AI assistant that calls backend MCP tools for catalog-backed conversation.',
  },
  {
    name: 'Lerna',
    quadrant: 'tools',
    ring: 'trial',
    domain: 'engineering',
    why: 'apihub-ui is a Lerna monorepo (Portal, Agents, shared). It works; do not start a second JS workspace tool without a migration plan.',
  },
  {
    name: 'Renovate automerge',
    quadrant: 'tools',
    ring: 'assess',
    domain: 'engineering',
    why: 'No renovate.json in product clones. Dependabot is what is wired. Automerge is a process experiment, not current CI.',
  },
  {
    name: 'VS Code extension surface',
    quadrant: 'tools',
    ring: 'assess',
    domain: 'product',
    why: 'CI has a vsce multi-OS workflow. That is delivery capacity, not a core APIHUB service.',
  },
  {
    name: 'Docker Desktop as local default',
    quadrant: 'tools',
    ring: 'hold',
    domain: 'engineering',
    why: 'Compose files stay Docker-compatible. Local verification uses Podman. Do not assume a Docker daemon.',
  },
  {
    name: 'Message bus for builds',
    quadrant: 'tools',
    ring: 'hold',
    domain: 'product',
    why: 'Workers poll HTTP. The Kafka label on AsyncAPI builds is an enum name, not a broker. Do not introduce a queue for the default publish path.',
  },
  {
    name: 'Kubernetes 1.23+',
    quadrant: 'platforms',
    ring: 'adopt',
    domain: 'both',
    why: 'Production topology. The agent also runs in remote clusters for discovery. Health endpoints are /ready and /live.',
  },
  {
    name: 'PostgreSQL 14+',
    quadrant: 'platforms',
    ring: 'adopt',
    domain: 'product',
    why: 'System of record. Separate databases per service. Not optional.',
  },
  {
    name: 'nginx reverse proxy',
    quadrant: 'platforms',
    ring: 'adopt',
    domain: 'product',
    why: 'UI image is the ingress: Portal and Agents SPAs, /api/* to backend, /api-linter/*, /agents-backend/*.',
  },
  {
    name: 'GitHub (Actions, Packages, Pages)',
    quadrant: 'platforms',
    ring: 'adopt',
    domain: 'engineering',
    why: 'Source, reusable workflows, GHCR, GitHub NPM (@netcracker/*), Storybook and reports on Pages.',
  },
  {
    name: 'SAML / OIDC / LDAP',
    quadrant: 'platforms',
    ring: 'adopt',
    domain: 'product',
    why: 'Enterprise identity. A Keycloak Compose variant exists for SSO labs; production uses the customer IdP.',
  },
  {
    name: 'Prometheus + Grafana',
    quadrant: 'platforms',
    ring: 'adopt',
    domain: 'both',
    why: 'Services expose /metrics. Helm can emit ServiceMonitor and ships Grafana dashboard JSON.',
  },
  {
    name: 'GHCR + Alpine images',
    quadrant: 'platforms',
    ring: 'adopt',
    domain: 'engineering',
    why: 'Multi-stage golang:1.26-alpine / node:24 / nginx:1.31-alpine, non-root UIDs, published to ghcr.io/netcracker/.',
  },
  {
    name: 'Olric',
    quadrant: 'platforms',
    ring: 'trial',
    domain: 'product',
    why: 'In-process distributed cache and DTopic pub/sub (version-published to linter). LAN discovery in Kubernetes. Not a separate product to operate.',
  },
  {
    name: 'MinIO / S3',
    quadrant: 'platforms',
    ring: 'trial',
    domain: 'product',
    why: 'Optional cold storage for build results. PostgreSQL remains required even when S3 is on.',
  },
  {
    name: 'OpenAI API',
    quadrant: 'platforms',
    ring: 'trial',
    domain: 'product',
    why: 'Optional. Powers AI chat (with MCP tools) and the linter AI OAS engine. Spectral still runs without it.',
  },
  {
    name: 'Keycloak (Compose lab)',
    quadrant: 'platforms',
    ring: 'trial',
    domain: 'engineering',
    why: 'docker-compose/with-keycloak is the SSO test bed. Not the production IdP.',
  },
  {
    name: 'Kind',
    quadrant: 'platforms',
    ring: 'trial',
    domain: 'engineering',
    why: 'Local cluster target for the Helm quickstart. Complements Compose rather than replacing PostgreSQL-on-Compose for everyday UI work.',
  },
  {
    name: 'Apache Superset',
    quadrant: 'platforms',
    ring: 'assess',
    domain: 'product',
    why: 'Optional subchart in local-k8s-quickstart for BI. Not part of the core production chart.',
  },
  {
    name: 'Tyk API Gateway',
    quadrant: 'platforms',
    ring: 'assess',
    domain: 'product',
    why: 'Candidate GitOps export target. Adapter repo has no runtime yet.',
  },
  {
    name: 'Compose as production topology',
    quadrant: 'platforms',
    ring: 'hold',
    domain: 'engineering',
    why: 'Docker Compose is for local and generic demos. Production is Helm on Kubernetes.',
  },
  {
    name: 'One shared database',
    quadrant: 'platforms',
    ring: 'hold',
    domain: 'product',
    why: 'Architecture is separate databases per service. Do not collapse backend, linter, and agents-backend onto one schema.',
  },
  {
    name: 'Go 1.26.x',
    quadrant: 'languages',
    ring: 'adopt',
    domain: 'both',
    why: 'Backend, agent, agents-backend, and linter pin go 1.26.5. Layering is controller, service, repository, entity.',
  },
  {
    name: 'TypeScript 4–5',
    quadrant: 'languages',
    ring: 'adopt',
    domain: 'both',
    why: 'UI, processing and viewer libraries, and Nest build-task-consumer. Libraries publish ESM + CJS to GitHub NPM.',
  },
  {
    name: 'React 18 + MUI 5',
    quadrant: 'languages',
    ring: 'adopt',
    domain: 'product',
    why: 'Portal and Agents SPAs. Server state is TanStack Query; layout and controls are MUI.',
  },
  {
    name: 'NestJS 10',
    quadrant: 'languages',
    ring: 'adopt',
    domain: 'product',
    why: 'build-task-consumer is the TypeScript worker (api-processor, --max-old-space-size=3100).',
  },
  {
    name: 'gorilla/mux + go-pg + go-guardian',
    quadrant: 'languages',
    ring: 'adopt',
    domain: 'product',
    why: 'Default Go HTTP, ORM, and auth stack. Match existing modules; do not add a second router or ORM in the same service.',
  },
  {
    name: 'OpenAPI 3.0 / 3.1',
    quadrant: 'languages',
    ring: 'adopt',
    domain: 'product',
    why: 'Primary REST SpecType. Full path: parse, unify, diff, lint, discover, render, playground.',
  },
  {
    name: 'GraphQL + GraphAPI',
    quadrant: 'languages',
    ring: 'adopt',
    domain: 'product',
    why: 'SDL/introspection to GraphAPI JSON to unifier, diff, data-model, and viewers. Agent has a GraphQL runner. No Spectral path.',
  },
  {
    name: 'TanStack React Query',
    quadrant: 'languages',
    ring: 'adopt',
    domain: 'product',
    why: 'Portal and Agents server-state default. Keep REST cache and invalidation here rather than ad-hoc stores.',
  },
  {
    name: 'AsyncAPI 3',
    quadrant: 'languages',
    ring: 'trial',
    domain: 'product',
    why: 'End-to-end in the TypeScript stack (unifier asyncapi-3, diff, processor, Portal, Spectral, agent runner). Data-model coverage is still thinner than REST.',
  },
  {
    name: 'MCP protocol',
    quadrant: 'languages',
    ring: 'trial',
    domain: 'both',
    why: 'Used twice: backend MCP server for clients, and MCP catalog contracts as published documents. Not a SpecType.',
  },
  {
    name: 'DDLAPI 1.0',
    quadrant: 'languages',
    ring: 'trial',
    domain: 'product',
    why: 'First-class SpecType for database-schema contracts. No agent discovery runner yet.',
  },
  {
    name: 'D3 + ELK',
    quadrant: 'languages',
    ring: 'trial',
    domain: 'product',
    why: 'class-view renders UML-style schema diagrams as a web component.',
  },
  {
    name: 'Python 3.11 (CI reports)',
    quadrant: 'languages',
    ring: 'trial',
    domain: 'engineering',
    why: 'Sprint, PR, and release HTML reports in qubership-apihub-ci (requests, Jinja2). Not an application runtime.',
  },
  {
    name: 'Mermaid in Markdown',
    quadrant: 'languages',
    ring: 'trial',
    domain: 'product',
    why: 'Markdown documents render Mermaid blocks with a safe fallback. GitHub Flavored Markdown is already adopted; Mermaid is the extra diagram path.',
  },
  {
    name: 'Java 21 + japicmp',
    quadrant: 'languages',
    ring: 'assess',
    domain: 'both',
    why: 'java-task-consumer is plain Java (no Spring), Corretto 21 alpine, Maven, japicmp, jdeps. Productize only after backend task types exist.',
  },
  {
    name: 'Protobuf / gRPC',
    quadrant: 'languages',
    ring: 'assess',
    domain: 'product',
    why: 'Stub storage and a consumer enum. No normalize, diff, or UI. Keep samples, but do not extend the stub into a fake pipeline.',
  },
  {
    name: 'Swagger 2 as a native model',
    quadrant: 'languages',
    ring: 'hold',
    domain: 'product',
    why: 'Supported via conversion to OpenAPI 3. Do not add Swagger 2 rules to unifier or diff.',
  },
  {
    name: 'AsyncAPI 2 schema rules',
    quadrant: 'languages',
    ring: 'hold',
    domain: 'product',
    why: 'Inputs may still appear on the way to AsyncAPI 3 rules. New compare engines target asyncapi-3 only.',
  },
];

export const RADAR_BLIPS: RadarBlip[] = RAW.map((b, i) => ({ ...b, id: i + 1 }));

const QUAD_DEG: Record<RadarQuadrant, [number, number]> = {
  techniques: [14, 76],
  tools: [-76, -14],
  platforms: [-166, -104],
  languages: [104, 166],
};

const RING_R: Record<RadarRing, number> = {
  adopt: 0.3,
  trial: 0.49,
  assess: 0.67,
  hold: 0.85,
};

export function placeBlips(size: number): PlacedBlip[] {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.42;
  const groups = new Map<string, RadarBlip[]>();
  for (const b of RADAR_BLIPS) {
    const key = `${b.quadrant}:${b.ring}`;
    const list = groups.get(key) ?? [];
    list.push(b);
    groups.set(key, list);
  }
  const out: PlacedBlip[] = [];
  for (const [key, list] of groups) {
    const [quadrant, ring] = key.split(':') as [RadarQuadrant, RadarRing];
    const [a0, a1] = QUAD_DEG[quadrant];
    const n = list.length;
    list.forEach((b, i) => {
      const t = (i + 1) / (n + 1);
      const deg = a0 + t * (a1 - a0);
      const rad = (deg * Math.PI) / 180;
      const jitter = ((i % 3) - 1) * 0.028;
      const r = maxR * (RING_R[ring] + jitter);
      out.push({
        ...b,
        x: cx + r * Math.cos(rad),
        y: cy - r * Math.sin(rad),
      });
    });
  }
  return out;
}

export const PLACED_BLIPS = placeBlips(RADAR_SIZE);

export function countByRing(ring: RadarRing): number {
  return RADAR_BLIPS.filter((b) => b.ring === ring).length;
}
