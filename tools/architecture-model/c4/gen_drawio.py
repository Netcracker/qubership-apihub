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


def lbl(name, typ=None, desc=None, big=False):
    s = f'<b style="font-size:{13 if big else 12}px">{escape(name)}</b>'
    if typ:
        s += f'<br><i style="font-size:9px">[{escape(typ)}]</i>'
    if desc:
        s += f'<br><span style="font-size:9px">{escape(desc)}</span>'
    return s


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


def legend(p, x, y):
    p.text(x, y, 520, 20, 'Legend', 12, True)
    items = [('person', 'Person / role'), ('system', 'Software system'), ('core', 'Core container'),
             ('ext_svc', 'Extension container'), ('agent', 'Remote / agent side'), ('planned', 'New — integration pending'),
             ('store', 'Data store / infra'), ('external', 'External system')]
    for i, (k, t) in enumerate(items):
        fill, stroke, font = C[k]
        cid = p._id()
        p.cells.append(f'<mxCell id="{cid}" value="{t}" style="rounded=1;whiteSpace=wrap;html=1;fillColor={fill};strokeColor={stroke};fontColor={font};fontSize=9;" vertex="1" parent="1"><mxGeometry x="{x + (i % 4) * 130}" y="{y + 22 + (i // 4) * 30}" width="120" height="24" as="geometry"/></mxCell>')
    p.text(x, y + 88, 560, 40, 'Edges: thick = primary business flow · thin = call / dependency · dashed = optional or planned', 9)


# ======================= 1. SYSTEM CONTEXT =======================
p = Page('L1 System Context'); pages.append(p)
p.text(20, 10, 1200, 30, 'Qubership APIHUB — C4 Level 1: System Context (2026-09)', 18, True)
persons = [('dev', 'API Developer / Publisher', 'Publishes specs, reviews changes, manages packages'),
           ('consumer', 'API Consumer', 'Browses docs, compares versions, uses playground'),
           ('admin', 'System Administrator', 'Users, roles, IdPs, rulesets, cleanup, migrations'),
           ('cicd', 'CI/CD Pipeline', 'Publishes specs with API keys / PATs'),
           ('ai', 'AI Assistant / MCP client', 'Cursor, Claude, IDE agents, chat bots')]
for i, (k, n, d) in enumerate(persons):
    p.node(k, 60 + i * 260, 60, n, 'Person', d, kind='person', shape='person', w=200, h=130)
p.node('apihub', 470, 330, 'Qubership APIHUB', 'Software System', 'API Registry & API Management platform: store · build · normalize · diff · document · lint · score · discover · expose to AI', kind='system', shape='system', w=420, h=140)
exts = [('pg', 'PostgreSQL 14+', 'External: RDBMS', 'One database per service', 'store'),
        ('s3', 'S3 / MinIO', 'External: object storage', 'Optional cold storage for build results', 'store'),
        ('idp', 'Identity Provider', 'External: SAML 2.0 / OIDC / LDAP', 'Keycloak, ADFS, corporate SSO', 'external'),
        ('llm', 'LLM API', 'External: OpenAI-compatible', 'AI linting, AI chat (optional)', 'external'),
        ('k8s', 'Remote Kubernetes clusters', 'External: K8s API + workloads', 'Services exposing API docs', 'agent'),
        ('maven', 'Maven / OCI registries', 'External', 'Java artifacts for Java API analysis', 'external'),
        ('gh', 'GitHub / ghcr.io / npm', 'External: CI, images, packages', 'Delivery of images and libraries', 'external'),
        ('mon', 'Prometheus / Grafana', 'External: monitoring', '/metrics, ServiceMonitor, dashboards', 'external')]
for i, (k, n, t, d, kind) in enumerate(exts):
    p.node(k, 60 + i * 165, 600, n, t, d, kind=kind, w=150, h=110, shape='cylinder' if kind == 'store' else 'box')
for k, l in [('dev', 'HTTPS Portal UI, REST'), ('consumer', 'HTTPS Portal UI'), ('admin', 'HTTPS admin API'), ('cicd', 'REST + api-key / PAT'), ('ai', 'MCP Streamable HTTP')]:
    p.edge(k, 'apihub', l, 'primary')
p.edge('apihub', 'pg', 'go-pg / SQL'); p.edge('apihub', 's3', 'S3 API', 'dashed'); p.edge('apihub', 'idp', 'SSO login, LDAP')
p.edge('apihub', 'llm', 'chat completions, AI lint', 'dashed'); p.edge('apihub', 'k8s', 'agent discovery, proxy', 'primary')
p.edge('apihub', 'maven', 'jars / images (Java builds)', 'dashed'); p.edge('gh', 'apihub', 'images, npm packages'); p.edge('apihub', 'mon', 'metrics')
legend(p, 20, 760)

# ======================= 2. CONTAINERS =======================
p = Page('L2 Containers'); pages.append(p)
p.text(20, 10, 1200, 30, 'Qubership APIHUB — C4 Level 2: Containers', 18, True)
p.node('user', 80, 50, 'Users', 'Person', 'Developer · Consumer · Admin', kind='person', shape='person', w=180, h=120)
p.node('cicd', 1160, 50, 'CI/CD', 'Person', 'api-key / PAT', kind='person', shape='person', w=160, h=120)
p.node('mcpc', 1360, 50, 'MCP clients', 'Person', 'Cursor, Claude, bots', kind='person', shape='person', w=160, h=120)
p.group(40, 200, 1520, 760, 'Qubership APIHUB — Kubernetes namespace (Helm chart qubership-apihub)', 'blue')
p.node('ui', 80, 250, 'APIHUB UI', 'Container: nginx 1.28 + React 18 / MUI 5 / Vite', 'Portal SPA + Agents SPA; reverse proxy /api → backend, /api-linter, /agents-backend, /apihub-nc', kind='core', w=260, h=120)
p.node('be', 560, 420, 'APIHUB Backend', 'Container: Go 1.26, gorilla/mux, go-pg · :8080', 'REST API v1–v4 · auth & RBAC · packages/versions · build orchestration · search · export · MCP server · AI chat · cleanup jobs · migrations', kind='core', w=320, h=150)
p.node('btc', 1160, 250, 'Build Task Consumer', 'Container: Node 24 / NestJS 10 · :3000', 'Stateless worker: polls build tasks, runs api-processor (parse · normalize · diff · changelog · export)', kind='core', w=300, h=120)
p.node('jtc', 1160, 420, 'Java Task Consumer', 'Container: Java 21, plain JVM + jdiff-engine · :3000', 'Java API report / jar diff / upgrade impact (japicmp, jdeps). Backend queue pending', kind='planned', w=300, h=120, dashed=True)
p.node('linter', 560, 700, 'API Linter Service', 'Container: Go 1.26 · :8080', 'Spectral + AI linting, rulesets, bulk validation, version scoring, MCP endpoint', kind='ext_svc', w=280, h=120)
p.node('abe', 80, 700, 'Agents Backend', 'Container: Go 1.26 · :8080', 'Agent registry, discovery orchestration, snapshots → Portal, namespace security checks', kind='ext_svc', w=280, h=120)
p.node('pg', 1160, 700, 'PostgreSQL 14+', 'Data store', 'apihub · apihub_linter · agents DBs', kind='store', shape='cylinder', w=170, h=110)
p.node('olric', 920, 700, 'Olric', 'Embedded: cache + DTopic pub/sub', 'runs inside Backend and Linter pods', kind='store', w=190, h=110)
p.node('s3', 1370, 700, 'S3 / MinIO', 'Data store (optional)', 'build sources / results', kind='store', shape='cylinder', w=150, h=110)
p.group(40, 1000, 700, 220, 'Remote Kubernetes cluster(s)', 'orange')
p.node('agent', 80, 1050, 'APIHUB Agent', 'Container: Go 1.26 · :8080', 'Namespace/service discovery, spec probing via pluggable DiscoveryRunners, service proxy', kind='agent', w=280, h=120)
p.node('svc', 440, 1050, 'Workload services', 'K8s Services', 'expose /swagger, /graphql, AsyncAPI, Markdown…', kind='k8s_svc', w=260, h=120)
p.node('idp', 800, 1050, 'Identity Provider', 'External', 'SAML / OIDC / LDAP', kind='external', w=180, h=100)
p.node('llm', 1020, 1050, 'LLM API', 'External', 'OpenAI-compatible', kind='external', w=180, h=100)
p.node('maven', 1240, 1050, 'Maven / OCI registries', 'External', 'jars, images', kind='external', w=180, h=100)
p.edge('user', 'ui', 'HTTPS', 'primary'); p.edge('cicd', 'be', 'REST, api-key / PAT', 'primary'); p.edge('mcpc', 'be', 'MCP Streamable HTTP /api/v1/mcp/', 'primary')
p.edge('ui', 'be', '/api/*, /saml, /login/sso, /playground', 'primary'); p.edge('ui', 'linter', '/api-linter/* (rewrite)'); p.edge('ui', 'abe', '/agents-backend/* (rewrite)')
p.edge('btc', 'be', 'poll /api/v2/builders/{id}/tasks · post /api/v3/…/publish/{id}/status', 'primary')
p.edge('jtc', 'be', 'poll /api/v2/java-builders/{id}/tasks (contract only)', 'dashed'); p.edge('jtc', 'maven', 'resolve jars', 'dashed')
p.edge('be', 'pg', ''); p.edge('linter', 'pg', ''); p.edge('abe', 'pg', ''); p.edge('be', 's3', 'optional', 'dashed')
p.edge('be', 'olric', "publish 'version-published'"); p.edge('olric', 'linter', 'DTopic subscription'); p.edge('linter', 'be', 'REST: versions, documents (access token)')
p.edge('abe', 'be', 'REST: packages, publish snapshots'); p.edge('be', 'idp', 'SSO, LDAP'); p.edge('be', 'llm', 'chat completions', 'dashed'); p.edge('linter', 'llm', 'AI lint', 'dashed')
p.edge('abe', 'agent', 'discover / specs / proxy (agent URL, JWT)', 'primary'); p.edge('agent', 'abe', 'register + heartbeat ~30s', 'primary'); p.edge('agent', 'svc', 'list services, probe spec endpoints', 'primary')
p.edge('mcpc', 'linter', 'MCP /api-linter/api/v1/mcp/', 'dashed')
legend(p, 800, 1240)

# ======================= 3. BACKEND COMPONENTS =======================
p = Page('L3 Backend'); pages.append(p)
p.text(20, 10, 1300, 30, 'C4 Level 3: APIHUB Backend components (qubership-apihub-backend, Go 1.26, gorilla/mux)', 18, True)
p.node('ui', 60, 60, 'APIHUB UI / CI / MCP clients', 'Containers & actors', None, kind='external', w=260, h=70)
p.group(40, 160, 1560, 1120, 'APIHUB Backend — one process, layered micro-monolith', 'blue')
x0 = 70
w, h = p.boxed(x0, 200, 'HTTP edge', 2, [
    ('router', 'Router & middleware', 'gorilla/mux', 'Prometheus, write-deadline, CORS, security headers'),
    ('health', 'Health / SystemInfo', 'Controllers', '/live /ready /api/v1/system/*')], 'lblue')
p.boxed(x0 + w + 30, 200, 'Security', 3, [
    ('auth', 'Auth strategies', 'go-guardian', 'Cookie JWT · Bearer JWT · Refresh · api-key · PAT · ephemeral-file token', 'sec'),
    ('idpm', 'IDP Manager', 'security/idp/providers', 'SAML (crewjam) · OIDC (go-oidc) · LDAP lookup · local auth', 'sec'),
    ('rbac', 'RoleService / permissions', 'service', 'System roles, package roles, custom roles, API-key scopes', 'sec')], 'red')
p.boxed(x0, 400, 'Catalog domain', 6, [
    ('pkg', 'PackageService', 'service', 'Workspaces · groups · packages · dashboards · favorites'),
    ('ver', 'VersionService / PublishedService', 'service', 'Versions · revisions · references · documents · shareability'),
    ('ops', 'OperationService / OperationGroupService', 'service', 'Operations · tags · groups · deprecated · model usages'),
    ('cmp', 'ComparisonService', 'service', 'Version & operation changes, changelog summaries'),
    ('contracts', 'DDL / MCP Contract services', 'service', 'DDL entities & changes; MCP tools / prompts / resources'),
    ('search', 'SearchController', 'controller v3/v4', 'Full-text search over packages, versions, operations, docs')], 'lblue')
p.boxed(x0, 600, 'Build & export', 5, [
    ('buildsvc', 'BuildService / BuildProcessor', 'service', 'Task queue in DB, GetFreeBuild, ownership, statuses'),
    ('result', 'BuildResultService', 'service', 'Unpacks result ZIP, stores operations / docs / changes'),
    ('export', 'ExportService / ExcelService', 'service (excelize)', 'Async exports, xlsx, shareability reports'),
    ('transform', 'TransformationService', 'service', 'Merged / reduced specs, document groups'),
    ('notify', 'PublishNotificationService', 'service (Olric)', "DTopic 'version-published'")], 'lblue')
p.boxed(x0, 800, 'AI & integration', 3, [
    ('mcp', 'MCPService + MCPController', 'mcp-go Streamable HTTP · /api/v1/mcp/', 'tools · api-packages resource · IDS prompt', 'ai'),
    ('chat', 'AiChatTurnService / AiChatsService', 'openai-go', 'SSE streaming, tool loop (≤10), ephemeral files, cleanup', 'ai'),
    ('playground', 'PlaygroundProxyController', 'controller', '/playground/proxy to allowed hosts', 'ai')], 'purple')
p.boxed(x0 + 780, 800, 'Operations & maintenance', 3, [
    ('cleanup', 'CleanupService', 'robfig/cron', 'revisions · comparisons · soft-deleted · unreferenced · builds · ephemeral files · VACUUM', 'gray'),
    ('migration', 'Migration framework', 'migration/', 'DB schema + operations migration FSM (/api/internal/migrate)', 'gray'),
    ('activity', 'ActivityTracking / BusinessMetrics', 'service', 'Audit trail, Prometheus counters', 'gray')], 'slate')
p.boxed(x0, 1000, 'Data access', 2, [
    ('repo', 'Repositories', 'go-pg ORM', '~26 repositories, entity structs, LockService'),
    ('minio', 'MinioStorageService', 'minio-go', 'build sources / results in S3', 'gray')], 'lblue')
for k, n, t, kind, x in [('pg', 'PostgreSQL apihub', 'Data store', 'store', 60), ('s3', 'S3 / MinIO', 'optional', 'store', 300),
                         ('btc', 'Build Task Consumer', 'Container', 'core', 540), ('linter', 'API Linter Service', 'Container', 'ext_svc', 800),
                         ('idp', 'Identity Provider', 'External', 'external', 1060), ('llm', 'LLM API', 'External', 'external', 1300)]:
    p.node(k, x, 1320, n, t, None, kind=kind, w=200, h=70, shape='cylinder' if kind == 'store' else 'box')
p.edge('ui', 'router', 'HTTP', 'primary'); p.edge('router', 'auth', '', 'primary'); p.edge('auth', 'rbac', ''); p.edge('auth', 'idpm', ''); p.edge('idpm', 'idp', 'SSO')
for k in ['pkg', 'ver', 'ops', 'cmp', 'contracts', 'search', 'export', 'buildsvc', 'mcp', 'chat', 'playground']:
    p.edge('router', k, '')
for k in ['pkg', 'ver', 'ops', 'cmp', 'result', 'cleanup', 'migration']:
    p.edge(k, 'repo', '')
p.edge('repo', 'pg', 'SQL'); p.edge('minio', 's3', 'S3 API', 'dashed'); p.edge('result', 'minio', '', 'dashed')
p.edge('buildsvc', 'btc', 'task ZIP / status', 'primary'); p.edge('btc', 'result', 'result ZIP', 'primary'); p.edge('result', 'notify', ''); p.edge('notify', 'linter', 'Olric DTopic')
p.edge('chat', 'mcp', 'MCP tools'); p.edge('mcp', 'ops', ''); p.edge('mcp', 'search', ''); p.edge('chat', 'llm', 'LLM', 'dashed')

# ======================= 4. UI COMPONENTS =======================
p = Page('L3 UI'); pages.append(p)
p.text(20, 10, 1300, 30, 'C4 Level 3: APIHUB UI components (qubership-apihub-ui — nginx + Portal / Agents SPAs)', 18, True)
p.node('browser', 60, 60, 'Browser', 'Person', None, kind='person', shape='person', w=160, h=110)
p.group(40, 200, 1500, 900, 'APIHUB UI container — nginx 1.28 serving two Vite-built SPAs', 'blue')
p.node('nginx', 70, 240, 'nginx reverse proxy', 'nginx.conf.template, envsubst', '/portal, /agents static · /api → backend · /api-linter → linter · /agents-backend → agents-backend · /apihub-nc → optional NC extension · no-buffering for MCP / chat SSE', kind='comp', w=1440, h=80)
p.boxed(70, 350, 'Portal SPA (packages/portal) — React Router 6, react-query', 3, [
    ('p_nav', 'Workspaces / Groups / Packages', 'pages', 'catalog navigation, favorites, settings'),
    ('p_ver', 'Version pages', 'pages', 'overview · operations · changes · deprecated · documents · api-quality'),
    ('p_cmp', 'Compare', 'pages', 'versions · operations · groups'),
    ('p_edit', 'Dashboard / package editor', 'pages', 'publish dialog, export settings, operation groups'),
    ('p_admin', 'Portal settings', 'pages', 'roles, admins, tokens, rulesets, profile / PATs'),
    ('p_ai', 'AI chat & Contracts tab', 'pages', 'AI chat, DDL / MCP contracts')], 'lblue')
p.boxed(850, 350, 'Agents SPA (packages/agents)', 1, [
    ('a_disc', 'Discovery', 'pages', 'agents · namespaces · services'),
    ('a_snap', 'Snapshots & promotion', 'pages', 'to Portal packages'),
    ('a_sec', 'Namespace security checks', 'pages', 'auth-check reports')], 'lblue')
p.node('shared', 1120, 384, 'Shared library (packages/shared)', '@netcracker/qubership-apihub-ui-shared', 'entities (api-types, contract-types), hooks, MUI theme, widgets, Storybook', kind='comp', w=380, h=110)
p.boxed(70, 840, 'Rendering web components / libraries (npm @netcracker/*)', 5, [
    ('apispec', 'apispec-view', 'web component', '<apispec-view> <operation-view> <diff-operation-view>', 'lib'),
    ('docviewer', 'api-doc-viewer', 'React', 'JsonSchemaViewer, GraphQLOperationViewer (+diff)', 'lib'),
    ('playground', 'rest-playground', 'web component', '<rest-playground> TryIt', 'lib'),
    ('classview', 'class-view', 'web component', 'UML class diagrams (D3 + ELK)', 'lib'),
    ('proc', 'api-processor / api-diff / api-unifier', 'TS libraries', 'client-side build & compare', 'lib')], 'teal')
for k, n, kind, x in [('be', 'APIHUB Backend', 'core', 200), ('linter', 'API Linter Service', 'ext_svc', 600), ('abe', 'Agents Backend', 'ext_svc', 1000)]:
    p.node(k, x, 1150, n, 'Container', None, kind=kind, w=240, h=60)
p.edge('browser', 'nginx', 'HTTPS', 'primary'); p.edge('nginx', 'be', '/api', 'primary'); p.edge('nginx', 'linter', '/api-linter'); p.edge('nginx', 'abe', '/agents-backend')
p.edge('p_ver', 'apispec', ''); p.edge('p_ver', 'docviewer', ''); p.edge('p_ver', 'playground', ''); p.edge('p_cmp', 'classview', ''); p.edge('p_edit', 'proc', '')
p.edge('p_nav', 'shared', ''); p.edge('a_disc', 'shared', '')

# ======================= 5. BUILD TASK CONSUMER =======================
p = Page('L3 Build Task Consumer'); pages.append(p)
p.text(20, 10, 1300, 30, 'C4 Level 3: Build Task Consumer (NestJS 10, stateless worker, N replicas)', 18, True)
p.node('be', 60, 300, 'APIHUB Backend', 'Container', 'build task queue (DB)', kind='core', w=220, h=100)
p.group(340, 60, 1000, 640, 'Build Task Consumer', 'blue')
p.node('app', 380, 100, 'AppModule / AppController', 'NestJS', 'bootstrap, /live', kind='comp', w=280, h=80)
p.node('registry', 380, 220, 'RegistryModule → RegistryService', 'HTTP client (api-key)', 'findTask · postBuildStatus · getVersionConfig · getVersionOperations · getVersionDocuments · getVersionComparison · getGroupExportTemplate …', kind='comp', w=420, h=130)
p.node('builder', 380, 400, 'BuilderModule → BuilderService', 'RxJS interval poll', 'requestInterval poll, statusInterval running heartbeat, ZIP unpack, ajv builder schema validation', kind='comp', w=420, h=130)
p.node('processor', 860, 400, 'api-processor', '@netcracker/qubership-apihub-api-processor', 'PackageVersionBuilder + strategy per buildType', kind='lib', w=420, h=130)
p.node('templates', 860, 220, 'HTML export templates', 'templates/', 'apispec-view.js bundle, markdown-it', kind='comp', w=420, h=130)
p.text(360, 580, 960, 100, 'buildType values (api-processor consts.ts): build · changelog · prefix-groups-changelog · exportVersion · exportRestDocument · exportRestOperationsGroup · exportGraphqlOperationsGroup · exportAsyncapiOperationsGroup; deprecated: documentGroup · reducedSourceSpecifications · mergedSpecification', 10)
p.edge('registry', 'be', 'POST /api/v2/builders/{builderId}/tasks → 204 or task ZIP', 'primary'); p.edge('builder', 'be', 'POST /api/v3/packages/{id}/publish/{publishId}/status (running | complete + ZIP | error)', 'primary')
p.edge('registry', 'builder', 'task'); p.edge('builder', 'processor', 'run(buildType)', 'primary'); p.edge('processor', 'registry', 'resolvers fetch data', 'dashed'); p.edge('builder', 'templates', '')

# ======================= 6. LINTER =======================
p = Page('L3 API Linter Service'); pages.append(p)
p.text(20, 10, 1300, 30, 'C4 Level 3: API Linter Service (Go 1.26)', 18, True)
p.node('ui', 60, 60, 'APIHUB UI (/api-linter)', 'Container', None, kind='external', w=220, h=70)
p.node('olric', 60, 400, "Olric DTopic 'version-published'", 'Embedded pub/sub', None, kind='store', w=220, h=80)
p.node('be', 60, 640, 'APIHUB Backend', 'Container', 'versions, documents, roles', kind='core', w=220, h=80)
p.group(340, 40, 1180, 900, 'API Linter Service', 'green')
p.boxed(370, 80, 'HTTP API', 3, [
    ('ctl', 'Controllers', 'gorilla/mux', 'validation (v1/v2), scoring, rulesets, bulkValidation, linters, cleanup, logs', 'comp_g'),
    ('security', 'Security', 'go-guardian', 'cookie JWT · api-key · PAT · authorization via Backend roles', 'sec'),
    ('mcp', 'MCP endpoint', 'mcp-go · /api/v1/mcp/', 'list_linter_issues_for_package_version', 'ai')], 'lgreen')
p.node('listener', 370, 300, 'PublishEventListener', 'service', 'subscribes to Olric DTopic, creates version lint task', kind='comp_g')
p.node('vtask', 620, 300, 'VersionTaskProcessor', 'service', 'fetch version documents from Backend, fan-out to document tasks', kind='comp_g')
p.node('dtask', 870, 300, 'DocTaskProcessor', 'service', 'worker pool; LinterSelector picks engine by ApiType + package pattern', kind='comp_g')
p.node('spectral', 620, 460, 'SpectralExecutor', 'bundled Spectral CLI', 'rulesets for OpenAPI, AsyncAPI', kind='lib')
p.node('aiexec', 870, 460, 'AIOasExecutor', 'OpenAI-compatible LLM', 'rate-limited, include/exclude packages', kind='lib')
p.node('vacuum', 1120, 460, 'Vacuum', 'bundled binary & rules', 'not active in code', kind='gray')
p.node('scoring', 1120, 300, 'ScoringService', 'service', 'version quality score after lint', kind='comp_g')
p.node('rulesets', 370, 460, 'RulesetService', 'service', 'ruleset CRUD, activation, data', kind='comp_g')
p.node('repo', 370, 640, 'Repositories', 'go-pg', 'tasks · results · rulesets · scoring', kind='comp_g', w=450)
p.node('cleanup', 870, 640, 'Cleanup / DB migration', 'service', None, kind='gray')
p.node('client', 1120, 640, 'ApihubClient / OlricClient', 'client/', None, kind='comp_g')
p.node('pg', 620, 800, 'PostgreSQL apihub_linter', 'Data store', None, kind='store', shape='cylinder', w=220, h=90)
p.node('llm', 1120, 800, 'LLM API', 'External', None, kind='external', w=200, h=70)
p.edge('ui', 'ctl', 'REST', 'primary'); p.edge('ctl', 'security', ''); p.edge('olric', 'listener', 'event', 'primary'); p.edge('listener', 'vtask', '', 'primary'); p.edge('vtask', 'dtask', '', 'primary')
p.edge('vtask', 'client', 'get documents'); p.edge('client', 'be', 'REST (access token)'); p.edge('dtask', 'spectral', '', 'primary'); p.edge('dtask', 'aiexec', '', 'dashed'); p.edge('dtask', 'vacuum', '', 'dashed')
p.edge('dtask', 'scoring', ''); p.edge('aiexec', 'llm', '', 'dashed'); p.edge('ctl', 'rulesets', ''); p.edge('ctl', 'scoring', ''); p.edge('ctl', 'mcp', '')
for k in ['listener', 'rulesets', 'scoring', 'dtask']:
    p.edge(k, 'repo', '')
p.edge('repo', 'pg', 'SQL')

# ======================= 7. AGENTS BACKEND =======================
p = Page('L3 Agents Backend'); pages.append(p)
p.text(20, 10, 1300, 30, 'C4 Level 3: Agents Backend (Go 1.26)', 18, True)
p.node('ui', 60, 60, 'Agents SPA (/agents-backend)', 'Container', None, kind='external', w=240, h=70)
p.node('agent', 60, 400, 'APIHUB Agent (remote)', 'Container', None, kind='agent', w=240, h=80)
p.node('be', 60, 640, 'APIHUB Backend', 'Container', None, kind='core', w=240, h=80)
p.group(360, 40, 1160, 800, 'Agents Backend', 'green')
p.node('ctl', 400, 80, 'Controllers', 'gorilla/mux', 'agents · namespaces · discovery · snapshots · namespace_security · spec · proxy', kind='comp_g', w=560, h=80)
p.node('security', 1000, 80, 'Security', 'go-guardian', 'cookie / bearer JWT · api-key · PAT', kind='sec', w=440, h=80)
p.grid(400, 220, 4, [
    ('agentsvc', 'AgentService', 'service', 'registration & heartbeat registry, agent status', 'comp_g'),
    ('discovery', 'DiscoveryService', 'service', 'triggers discovery on agent, collects services & documents', 'comp_g'),
    ('snapshot', 'SnapshotService', 'service', 'packages discovered specs, publishes versions to Portal dashboard', 'comp_g'),
    ('nssec', 'NamespaceSecurityService', 'service', 'auth-check processes, Excel report (excelize)', 'comp_g'),
    ('proxy', 'Proxy controller', 'controller', 'UI → agent → service proxying', 'comp_g'),
    ('perm', 'PermissionService', 'service', 'role checks via Backend', 'comp_g'),
    ('clients', 'Clients', 'client/', 'AgentClient · ApihubClient', 'comp_g'),
    ('repo', 'Repositories', 'go-pg', 'agents · namespace_security', 'comp_g')], w=250, h=110)
p.node('pg', 400, 640, 'PostgreSQL agents DB', 'Data store', None, kind='store', shape='cylinder', w=220, h=90)
p.edge('ui', 'ctl', 'REST', 'primary'); p.edge('ctl', 'security', ''); p.edge('agent', 'ctl', 'POST register / heartbeat', 'primary'); p.edge('ctl', 'agentsvc', ''); p.edge('ctl', 'discovery', ''); p.edge('ctl', 'snapshot', ''); p.edge('ctl', 'nssec', ''); p.edge('ctl', 'proxy', '')
p.edge('discovery', 'clients', ''); p.edge('snapshot', 'clients', ''); p.edge('proxy', 'clients', ''); p.edge('perm', 'clients', ''); p.edge('clients', 'agent', 'discover, services, specs, proxy', 'primary'); p.edge('clients', 'be', 'publish snapshot, versions, references', 'primary')
p.edge('agentsvc', 'repo', ''); p.edge('nssec', 'repo', ''); p.edge('repo', 'pg', 'SQL')

# ======================= 8. AGENT =======================
p = Page('L3 Agent'); pages.append(p)
p.text(20, 10, 1300, 30, 'C4 Level 3: APIHUB Agent (Go 1.26, one per cluster / namespace scope)', 18, True)
p.node('abe', 60, 200, 'Agents Backend', 'Container', None, kind='ext_svc', w=220, h=80)
p.node('k8s', 60, 520, 'Kubernetes API', 'External', 'namespaces, services, routes', kind='external', w=220, h=80)
p.node('svc', 60, 760, 'Workload services', 'K8s services', 'spec endpoints', kind='k8s_svc', w=220, h=80)
p.group(340, 40, 1280, 900, 'APIHUB Agent', 'orange')
p.node('ctl', 380, 80, 'Controllers', 'gorilla/mux', 'namespaces · services · discover (v1–v3, workspace-aware) · routes · specs · proxy · health · api-docs', kind='comp_o', w=700, h=80)
p.node('security', 1120, 80, 'Security', 'go-guardian', 'JWT (public key from Backend) · api-key · PAT', kind='sec', w=380, h=80)
p.node('reg', 380, 220, 'RegistrationService', 'service', 'registers agent (cloud, URL, namespace), heartbeat ~30s', kind='comp_o')
p.node('cloud', 630, 220, 'CloudService / caches', 'client-go', 'namespaces, services, routes; TTL caches', kind='comp_o')
p.node('disc', 880, 220, 'DiscoveryService', 'service', 'per-service parallel run of DocumentDiscoveryService', kind='comp_o')
p.node('docdisc', 1130, 220, 'DocumentDiscoveryService', 'service', 'runs all DiscoveryRunners in parallel, merges docs + failed calls', kind='comp_o')
p.boxed(380, 400, 'DiscoveryRunners (api_type/*) — implement generic.DiscoveryRunner', 6, [
    ('r_rest', 'REST', 'rest/discovery.go', 'swagger / openapi URL probes', 'runner'),
    ('r_gql', 'GraphQL', 'graphql/discovery.go', 'introspection query', 'runner'),
    ('r_async', 'AsyncAPI', 'asyncapi/discovery.go', 'AsyncAPI doc URLs', 'runner'),
    ('r_md', 'Markdown', 'markdown/discovery.go', 'file URL probing', 'runner'),
    ('r_json', 'JSON Schema', 'json_schema/discovery.go', 'URL probing', 'runner'),
    ('r_unknown', 'Unknown / generic', 'unknown, generic', 'fallback paths', 'runner')], 'lorange', w=170, h=100)
p.node('proxy', 380, 640, 'ServiceProxy', 'controller', 'HTTP proxy to in-cluster services', kind='comp_o')
p.node('clients', 630, 640, 'Clients', 'client/', 'AgentsBackendClient · ApihubClient · SpecClient', kind='comp_o')
p.edge('abe', 'ctl', 'discover / list / specs / proxy', 'primary'); p.edge('ctl', 'security', ''); p.edge('reg', 'clients', ''); p.edge('clients', 'abe', 'register + heartbeat', 'primary')
p.edge('ctl', 'disc', ''); p.edge('disc', 'docdisc', '', 'primary'); p.edge('disc', 'cloud', ''); p.edge('cloud', 'k8s', 'list')
for r in ['r_rest', 'r_gql', 'r_async', 'r_md', 'r_json', 'r_unknown']:
    p.edge('docdisc', r, '')
p.edge('r_rest', 'svc', 'HTTP probes'); p.edge('ctl', 'proxy', ''); p.edge('proxy', 'svc', 'proxy')

# ======================= 9. JAVA TASK CONSUMER =======================
p = Page('L3 Java Task Consumer'); pages.append(p)
p.text(20, 10, 1300, 30, 'C4 Level 3: Java Task Consumer (new — Java 21, plain JVM; backend java-builders queue pending)', 18, True)
p.node('be', 60, 300, 'APIHUB Backend', 'Container', 'java-builders queue: contract only', kind='core', w=220, h=100)
p.group(340, 60, 1180, 700, 'Java Task Consumer', 'amber')
p.grid(380, 100, 3, [
    ('main', 'WorkerMain', 'class', 'bootstrap, shutdown hook', 'comp_a'),
    ('poller', 'TaskPoller', 'class', 'scheduled poll, one build per instance', 'comp_a'),
    ('orch', 'BuildOrchestrator', 'class', 'running heartbeat, dispatch, result ZIP', 'comp_a'),
    ('exec', 'BuildExecutor', 'class', 'buildType → pipeline', 'comp_a'),
    ('client', 'RegistryClient', 'java.net.http', 'api-key auth', 'comp_a'),
    ('health', 'HealthServer', 'com.sun.net.httpserver', 'GET /live :3000', 'comp_a')], w=250, h=100)
p.boxed(380, 380, 'jdiff-engine (module)', 3, [
    ('report', 'ApiReportPipeline', 'pipeline', 'java-api-report (japicmp)', 'lib'),
    ('diff', 'ApiDiffPipeline', 'pipeline', 'java-api-diff (japicmp)', 'lib'),
    ('impact', 'UpgradeImpactPipeline', 'pipeline', 'java-upgrade-impact (japicmp + jdeps)', 'lib'),
    ('resolve', 'resolve.*', 'JarSource', 'GavJarSource · DockerImageJarSource · MavenArtifactResolver · OCI pull', 'lib'),
    ('tools', 'japicmp / jdeps runners', 'tools', 'subprocess execution', 'lib'),
    ('model', 'model.DiffReport', 'model', 'canonical JSON output (report.json)', 'lib')], 'teal', w=250, h=100)
p.node('maven', 60, 600, 'Maven repos / OCI registries', 'External', None, kind='external', w=220, h=80)
p.edge('be', 'client', 'POST /api/v2/java-builders/{id}/tasks', 'dashed'); p.edge('orch', 'be', 'POST /api/v3/packages/{id}/java-publish/{publishId}/status', 'dashed')
p.edge('client', 'poller', ''); p.edge('poller', 'orch', ''); p.edge('orch', 'exec', ''); p.edge('exec', 'report', ''); p.edge('exec', 'diff', ''); p.edge('exec', 'impact', '')
p.edge('diff', 'resolve', ''); p.edge('impact', 'tools', ''); p.edge('resolve', 'maven', '', 'dashed')

# ======================= 10. CODE: BACKEND =======================
p = Page('L4 Backend code'); pages.append(p)
p.text(20, 10, 1300, 30, 'C4 Level 4: Backend — request pipeline, security strategies, scheduled jobs', 18, True)
p.boxed(40, 60, 'Request pipeline (per HTTP request)', 7, [
    ('mux', 'mux.Router', 'Service.go', 'route registration, DI wiring'),
    ('mw', 'middleware', 'middleware/', 'PrometheusMiddleware, WriteDeadline'),
    ('secmw', 'security.Middleware', 'security/', 'go-guardian union of strategies'),
    ('ctrl', 'controller.*Controller', 'controller/', '39 interfaces + implementations'),
    ('svc', 'service.*Service', 'service/', 'business logic (~60 files)'),
    ('repo', 'repository.*Repository', 'repository/', 'go-pg queries (~26)'),
    ('ent', 'entity.*Entity', 'entity/', 'DB structs')], 'blue', w=180, h=100)
p.node('view', 40 + 20 + 3 * 210, 260, 'view.*', 'view/', 'DTOs, ApiType consts (CommonOperation.go)', kind='comp', w=180, h=90)
p.node('secctx', 40 + 20 + 4 * 210, 260, 'context.SecurityContext', 'context/', 'user / api-key / PAT identity', kind='comp', w=180, h=90)
for a, b in [('mux', 'mw'), ('mw', 'secmw'), ('secmw', 'ctrl'), ('ctrl', 'svc'), ('svc', 'repo'), ('repo', 'ent')]:
    p.edge(a, b, '', 'primary')
p.edge('ctrl', 'view', ''); p.edge('svc', 'secctx', '')
p.boxed(40, 400, 'security/ — go-guardian strategies (union)', 4, [
    ('s1', 'CookieTokenStrategy', 'BaseJWTStrategy', None, 'sec'), ('s2', 'BearerTokenStrategy', 'BaseJWTStrategy', None, 'sec'),
    ('s3', 'RefreshTokenStrategy', None, '/api/v3/auth/local/refresh', 'sec'), ('s4', 'ApihubApiKeyStrategy', None, 'api-key header', 'sec'),
    ('s5', 'ApihubPATStrategy', None, 'personal access tokens', 'sec'), ('s6', 'CustomJWTStrategy', None, None, 'sec'),
    ('s7', 'EphemeralFileTokens', None, 'AI chat file downloads', 'sec'), ('jwtv', 'JWTValidator', None, 'RSA public key (/api/v2/auth/publicKey)', 'sec')], 'red', w=200, h=80)
p.boxed(1000, 400, 'security/idp/providers', 1, [
    ('mgr', 'IDPManager', None, 'externalIdentityProviders[]', 'sec'), ('saml', 'SAMLProvider', 'crewjam/saml', '/api/v1/saml/{idpId}/acs, metadata', 'sec'),
    ('oidc', 'OIDCProvider', 'coreos/go-oidc', '/api/v1/oidc/{idpId}/callback', 'sec')], 'red', w=260, h=80)
p.edge('secmw', 's1', '', 'dashed'); p.edge('mgr', 'saml', ''); p.edge('mgr', 'oidc', ''); p.edge('ctrl', 'mgr', '/api/v1/login/sso/{idpId}', 'dashed')
p.boxed(40, 760, 'service/cleanup — robfig/cron jobs (schedules from config.yaml)', 9, [
    ('runner', 'cleanup.Runner', None, 'lock via LockService', 'gray'),
    ('j1', 'Revisions', '0 21 * * 0', 'ttl 365d', 'gray'), ('j2', 'Comparisons', '0 5 * * 0', 'ttl 30d', 'gray'),
    ('j3', 'SoftDeletedData', '0 22 * * 5', 'ttl 730d', 'gray'), ('j4', 'UnreferencedData', '0 15 * * 6', None, 'gray'),
    ('j5', 'MaintenanceVacuum', '0 2 * * 1', 'VACUUM', 'gray'), ('j6', 'Builds', '0 1 * * 0', None, 'gray'),
    ('j7', 'EphemeralFiles', '*/5 * * * *', None, 'gray'), ('j8', 'AiChatCleanup', '15 3 * * *', 'retentionDays', 'gray')], 'slate', w=150, h=80)
for j in ['j1', 'j2', 'j3', 'j4', 'j5', 'j6', 'j7', 'j8']:
    p.edge('runner', j, '')

# ======================= 11. CODE: TS STACK =======================
p = Page('L4 TypeScript stack'); pages.append(p)
p.text(20, 10, 1300, 30, 'C4 Level 4: TypeScript processing stack — libraries and SpecType registries', 18, True)
layers = [
    ('L6 — UI rendering', [('docviewer', 'api-doc-viewer', 'React', 'JsonSchemaViewer, GraphQLOperationViewer (+diff)', 'ext_svc'), ('apispec', 'apispec-view', 'web components', '<apispec-view> <operation-view>', 'ext_svc'), ('playground', 'rest-playground', 'web component', 'TryIt', 'ext_svc'), ('classview', 'class-view', 'web component', 'UML (D3 + ELK)', 'ext_svc')]),
    ('L5 — Orchestration', [('processor', 'api-processor 5.6.x', 'PackageVersionBuilder', '7 ApiBuilders, 10 strategies', 'l5')]),
    ('L4 — Data model', [('datamodel', 'api-data-model', 'IModelTree', 'json-schema · graph-api · diff trees', 'lib')]),
    ('L3 — Analysis', [('diff', 'api-diff', 'COMPARE_ENGINES_MAP', 'json-schema-04/06/07 → compareJsonSchema · openapi-3.0/3.1 → compareOpenApi · asyncapi-3 → compareAsyncApi · graphapi → compareGraphApi · ddlapi-1.0 → compareDdlApi', 'l3'), ('visitor', 'api-visitor', 'walker', 'OpenAPI visitor callbacks', 'l3')]),
    ('L2 — Normalization', [('unifier', 'api-unifier', 'RULES map · SpecType', "'openapi-3.0' | 'openapi-3.1' | 'json-schema-04/06/07' | 'asyncapi-3' | 'graphapi' | 'ddlapi-1.0' · resolveSpec()", 'core')]),
    ('L1 — Format conversion', [('graphapi', 'graphapi', 'GraphQL SDL ⇄ GraphAPI JSON', None, 'l1'), ('ddlapi', 'ddlapi 1.0.0', 'external package', 'DDLAPI document model', 'l1'), ('httpspec', 'http-spec', 'OAS / Postman / AsyncAPI → Stoplight AST', None, 'l1')]),
    ('L0 — Foundation', [('crawl', 'json-crawl 1.2.x', 'CrawlRules', 'crawl · syncCrawl · clone · transform (zero deps)', 'l0')]),
]
y = 60
for title, items in layers:
    w = 300 if len(items) == 1 else 260
    p.boxed(40, y, title, 4, items, 'slate', w=(340 if title.startswith('L3') or title.startswith('L2') else w), h=110)
    y += 190
p.node('btc', 1420, 60, 'build-task-consumer', 'app', None, kind='comp_a', w=200, h=80); p.node('ui', 1420, 170, 'apihub-ui', 'app', None, kind='comp_a', w=200, h=80); p.node('aux', 1420, 280, 'aux-tools / apihub-api-diff', 'CLI + local MCP', None, kind='comp_a', w=200, h=80)
for a, b in [('crawl', 'unifier'), ('unifier', 'diff'), ('unifier', 'visitor'), ('crawl', 'visitor'), ('diff', 'datamodel'), ('datamodel', 'docviewer'), ('graphapi', 'diff'), ('graphapi', 'datamodel'), ('ddlapi', 'diff'), ('diff', 'processor'), ('unifier', 'processor'), ('graphapi', 'processor'), ('ddlapi', 'processor'), ('httpspec', 'apispec'), ('httpspec', 'playground'), ('processor', 'btc'), ('processor', 'ui'), ('processor', 'aux'), ('diff', 'aux'), ('apispec', 'ui'), ('docviewer', 'ui')]:
    p.edge(a, b, '')

# ======================= 12. CODE: API-PROCESSOR =======================
p = Page('L4 api-processor'); pages.append(p)
p.text(20, 10, 1300, 30, 'C4 Level 4: api-processor — PackageVersionBuilder, ApiBuilders and strategies', 18, True)
p.node('pvb', 560, 60, 'PackageVersionBuilder', 'src/builder.ts', 'apiBuilders: ApiBuilder[] · run(buildType) · createBuildStrategy() · findApiBuilderByApiType / BySpecType', kind='l5', w=400, h=110)
p.node('apib', 60, 240, 'ApiBuilder (interface)', 'types/internal/apiBuilder.ts', 'apiType / contractType · parser · buildDocument · buildOperations · compareOperations · dumpDocument', kind='core', w=300, h=110)
p.boxed(400, 220, 'apitypes/* — registered in constructor (7)', 4, [
    ('b_rest', 'restApiBuilder', "apiType 'rest'", 'swagger2openapi, oas3/oas31 schemas'), ('b_gql', 'graphqlApiBuilder', "apiType 'graphql'", 'graphapi conversion'),
    ('b_async', 'asyncApiBuilder', "apiType 'asyncapi'", 'asyncapi-3 rules'), ('b_ddl', 'ddlBuilder', "contractType 'ddl'", 'ddlapi-1.0 entities / changes'),
    ('b_mcp', 'mcpBuilder', "contractType 'mcp'", 'MCP schemas 2024-11-05 … 2025-11-25; tools · prompts · resources'), ('b_text', 'textApiBuilder', 'Markdown / text', None), ('b_unk', 'unknownApiBuilder', 'fallback', 'raw files')], 'lblue', w=220, h=100)
p.node('strat', 60, 560, 'BuilderStrategy (interface)', 'builder-strategy.ts', 'execute(context)', kind='core', w=300, h=90)
p.boxed(400, 540, 'strategies/* — selected by buildType', 5, [
    ('st1', 'BuildStrategy', "'build'", None), ('st2', 'ChangelogStrategy', "'changelog'", None), ('st3', 'PrefixGroupsChangelogStrategy', "'prefix-groups-changelog'", None),
    ('st4', 'DocumentGroupStrategy', "'documentGroup'", 'deprecated'), ('st5', 'MergedDocumentGroupStrategy', "'mergedSpecification'", 'deprecated'),
    ('st6', 'ExportVersionStrategy', "'exportVersion'", None), ('st7', 'ExportRestDocumentStrategy', "'exportRestDocument'", None), ('st8', 'ExportRestOperationsGroupStrategy', "'exportRestOperationsGroup'", None),
    ('st9', 'ExportGraphQlOperationsGroupStrategy', "'exportGraphqlOperationsGroup'", None), ('st10', 'ExportAsyncApiOperationsGroupStrategy', "'exportAsyncapiOperationsGroup'", None)], 'lblue', w=200, h=90)
p.node('comps', 60, 800, 'components/', 'src/components', 'compare/ (rest · graphql · async · ddl BWC validation) · document · operations · package · files · build-result-index · deprecated · mcp · ddl · zip tools', kind='lib', w=1480, h=80)
p.text(40, 900, 1500, 60, 'BuildStrategy pipeline per document: parse & detect SpecType / contract type → buildDocument → buildOperations → normalize (api-unifier) → compare with previous version (api-diff; resolvers fetch previous operations from Backend) → classify changes (breaking / risky / non-breaking / semi-breaking / annotation / deprecated) → BWC validation → result ZIP (build-result-index)', 10)
p.edge('pvb', 'apib', 'registers 7'); p.edge('pvb', 'strat', 'picks by buildType'); p.edge('pvb', 'comps', 'uses', 'dashed')
for b in ['b_rest', 'b_gql', 'b_async', 'b_ddl', 'b_mcp', 'b_text', 'b_unk']:
    p.edge('apib', b, '', 'dashed')
for s in ['st1', 'st2', 'st3', 'st4', 'st5', 'st6', 'st7', 'st8', 'st9', 'st10']:
    p.edge('strat', s, '', 'dashed')

# ======================= 13. CODE: OTHER SERVICES =======================
p = Page('L4 Services code'); pages.append(p)
p.text(20, 10, 1400, 30, 'C4 Level 4: Build Task Consumer · Linter · Agents Backend · Agent · Java Task Consumer — key classes', 18, True)
p.boxed(40, 60, 'Build Task Consumer (NestJS)', 3, [
    ('AppModule', 'AppModule', 'app.module.ts', 'imports BuilderModule, RegistryModule, ConfigModule'), ('AppController', 'AppController', None, 'GET /live'),
    ('BuilderService', 'BuilderService', 'modules/builder', 'requestInterval$ · statusInterval · startBuildJob() · buildVersionFile() · ajv schema'),
    ('RegistryService', 'RegistryService', 'modules/registry', 'findTask() · postBuildStatus() · getVersion*() · getGroupExportTemplate()'),
    ('PVB', 'PackageVersionBuilder', 'api-processor', 'run(buildType)', 'lib')], 'blue', w=230, h=90)
p.edge('BuilderService', 'RegistryService', ''); p.edge('BuilderService', 'PVB', '')
p.boxed(880, 60, 'API Linter Service (Go)', 3, [
    ('PEL', 'PublishEventListener', None, "Olric DTopic 'version-published' → VersionLintTask", 'comp_g'),
    ('VTP', 'VersionTaskProcessor', None, 'fetch docs via ApihubClient, create DocLintTasks', 'comp_g'),
    ('DTP', 'DocTaskProcessor', None, 'worker pool (spectral.workers, ai.workers)', 'comp_g'),
    ('LS', 'LinterSelector', None, 'select(apiType, packageId) — apiTypes + package glob patterns', 'comp_g'),
    ('SE', 'SpectralExecutor', None, 'bundled Spectral CLI + rules', 'comp_g'), ('AE', 'AIOasExecutor', None, 'OpenAI client, rate limit', 'comp_g'),
    ('SS', 'ScoringService', None, 'computeVersionScore()', 'comp_g'), ('RS', 'RulesetService', None, 'CRUD · activation · data', 'comp_g'),
    ('LMCP', 'MCPService', None, 'list_linter_issues_for_package_version', 'ai')], 'green', w=230, h=90)
for a, b in [('PEL', 'VTP'), ('VTP', 'DTP'), ('DTP', 'LS'), ('LS', 'SE'), ('LS', 'AE'), ('DTP', 'SS')]:
    p.edge(a, b, '')
p.boxed(40, 500, 'Agents Backend (Go)', 3, [
    ('AS', 'AgentService', None, 'register · heartbeat · list · status', 'comp_g'), ('DS', 'DiscoveryService', None, 'discover(agent, ns, workspace) · services · spec', 'comp_g'),
    ('SnS', 'SnapshotService', None, 'createSnapshot · publish → Portal dashboard version', 'comp_g'), ('NSS', 'NamespaceSecurityService', None, 'startAuthCheck · status · excelReport', 'comp_g'),
    ('AC', 'AgentClient', 'client/', 'HTTP to remote agent', 'comp_g'), ('APC', 'ApihubClient', 'client/', 'packages · versions · publish · users', 'comp_g')], 'green', w=230, h=90)
for a, b in [('DS', 'AC'), ('SnS', 'AC'), ('SnS', 'APC'), ('NSS', 'AC')]:
    p.edge(a, b, '')
p.boxed(880, 500, 'APIHUB Agent (Go)', 3, [
    ('DR', 'DiscoveryRunner (interface)', 'api_type/generic', 'GetName() · Discover(service, ctx)', 'agent'),
    ('DDS', 'DocumentDiscoveryService', 'service/document_discovery.go', 'runners []DiscoveryRunner — parallel goroutines', 'comp_o'),
    ('DiS', 'DiscoveryService', None, 'per-service fan-out', 'comp_o'),
    ('R1', 'RestDiscoveryRunner', None, None, 'runner'), ('R2', 'GraphqlDiscoveryRunner', None, None, 'runner'), ('R3', 'AsyncAPIDiscoveryRunner', None, None, 'runner'),
    ('R4', 'MarkdownDiscoveryRunner', None, None, 'runner'), ('R5', 'JsonSchemaDiscoveryRunner', None, None, 'runner'), ('R6', 'UnknownDiscoveryRunner', None, None, 'runner'),
    ('CS', 'CloudService', 'client-go', 'namespaces, services, routes; caches', 'comp_o'), ('RegS', 'RegistrationService', None, 'heartbeat ticker', 'comp_o')], 'orange', w=230, h=90)
for r in ['R1', 'R2', 'R3', 'R4', 'R5', 'R6']:
    p.edge('DR', r, '', 'dashed')
p.edge('DDS', 'DR', 'registers'); p.edge('DiS', 'DDS', ''); p.edge('DiS', 'CS', '')
p.boxed(40, 1060, 'Java Task Consumer (Java 21) + jdiff-engine', 6, [
    ('WM', 'WorkerMain', None, None, 'comp_a'), ('TP', 'TaskPoller', None, None, 'comp_a'), ('BO', 'BuildOrchestrator', None, 'heartbeat, dispatch, ZIP', 'comp_a'),
    ('BE', 'BuildExecutor', None, 'buildType → pipeline', 'comp_a'), ('RC', 'RegistryClient', None, 'pollTask · postStatus', 'comp_a'), ('BT', 'BuildType', None, 'java-api-report · java-api-diff · java-upgrade-impact', 'comp_a'),
    ('JBS', 'JdiffBuildService', 'jdiff-engine', None, 'lib'), ('ARP', 'ApiReportPipeline', None, None, 'lib'), ('ADP', 'ApiDiffPipeline', None, None, 'lib'),
    ('UIP', 'UpgradeImpactPipeline', None, None, 'lib'), ('JSR', 'JarSourceResolver', None, 'GavJarSource · DockerImageJarSource', 'lib'), ('DRp', 'DiffReport', None, 'canonical JSON', 'lib')], 'amber', w=230, h=90)
for a, b in [('WM', 'TP'), ('TP', 'RC'), ('TP', 'BO'), ('BO', 'BE'), ('BE', 'JBS'), ('JBS', 'ARP'), ('JBS', 'ADP'), ('JBS', 'UIP'), ('ADP', 'JSR'), ('ADP', 'DRp')]:
    p.edge(a, b, '')

# ======================= 14. DEPLOYMENT =======================
p = Page('Deployment K8s'); pages.append(p)
p.text(20, 10, 1300, 30, 'Deployment view — Kubernetes (Helm chart qubership-apihub) + remote cluster', 18, True)
p.node('internet', 60, 60, 'Internet / corporate network', None, None, kind='external', w=240, h=60)
p.group(40, 150, 1500, 820, 'Kubernetes cluster — APIHUB namespace', 'blue')
p.node('ingress', 70, 190, 'Ingress (http / https + TLS secret)', 'k8s Ingress', '→ Service qubership-apihub-ui:8080', kind='gray', w=400, h=70)
p.node('ui', 70, 300, 'Deployment qubership-apihub-ui', 'nginx + SPAs', 'replicas: 1 (scalable)', kind='core', w=280, h=100)
p.node('be', 70, 440, 'Deployment qubership-apihub-backend', 'Go :8080', 'replicas 1 · ServiceAccount + RoleBinding (Olric discovery) · ServiceMonitor · Grafana dashboards · GOMEMLIMIT', kind='core', w=280, h=120)
p.node('btc', 400, 440, 'Deployment build-task-consumer', 'Node :3000', 'replicas 1 → 3–6 in production · api-key secret', kind='core', w=280, h=120)
p.node('jtc', 730, 440, 'Deployment java-task-consumer', 'Java :3000 (separate chart)', 'optional registryAuth secret', kind='planned', w=280, h=120, dashed=True)
p.node('lint', 400, 600, 'Deployment api-linter-service', 'Go :8080', 'ServiceAccount + RoleBinding (Olric) · Spectral binaries bundled', kind='ext_svc', w=280, h=120)
p.node('abe', 730, 600, 'Deployment agents-backend', 'Go :8080', None, kind='ext_svc', w=280, h=120)
p.node('secrets', 1080, 300, 'ConfigMaps / Secrets', 'k8s', 'config.yaml per service, JWT private key, DB credentials, access tokens, TLS', kind='gray', w=400, h=100)
p.node('olric', 1080, 440, 'Olric LAN cluster', 'embedded', 'in backend + linter pods', kind='store', w=400, h=100)
p.node('pg', 1080, 600, 'PostgreSQL 14+', 'external or local-k8s-quickstart/postgres-db', '3 databases', kind='store', shape='cylinder', w=200, h=110)
p.node('s3', 1300, 600, 'S3 / MinIO', 'optional', None, kind='store', shape='cylinder', w=180, h=110)
p.node('prom', 70, 800, 'Prometheus / Grafana', 'monitoring', 'ServiceMonitor + dashboards', kind='external', w=240, h=80)
p.node('superset', 1080, 800, 'Apache Superset', 'optional quickstart subchart', 'BI over apihub DB', kind='external', w=240, h=80)
p.node('idp', 400, 800, 'Identity Provider', 'Keycloak in quickstart', None, kind='external', w=240, h=80)
p.node('llm', 730, 800, 'LLM API', 'external', None, kind='external', w=240, h=80)
p.group(40, 1010, 800, 220, 'Remote Kubernetes cluster', 'orange')
p.node('agent', 70, 1060, 'Deployment qubership-apihub-agent', 'Go :8080', 'ServiceAccount with list namespaces/services', kind='agent', w=360, h=110)
p.node('wl', 470, 1060, 'Workloads', 'K8s services', 'API producers', kind='k8s_svc', w=320, h=110)
p.edge('internet', 'ingress', '', 'primary'); p.edge('ingress', 'ui', '', 'primary'); p.edge('ui', 'be', '', 'primary'); p.edge('ui', 'lint', ''); p.edge('ui', 'abe', '')
p.edge('be', 'btc', 'poll / status', 'both'); p.edge('be', 'jtc', 'pending', 'dashed'); p.edge('be', 'pg', ''); p.edge('lint', 'pg', ''); p.edge('abe', 'pg', ''); p.edge('be', 's3', '', 'dashed')
p.edge('be', 'olric', ''); p.edge('lint', 'olric', ''); p.edge('be', 'idp', ''); p.edge('be', 'llm', '', 'dashed'); p.edge('lint', 'llm', '', 'dashed'); p.edge('prom', 'be', 'scrape'); p.edge('superset', 'pg', '', 'dashed')
p.edge('abe', 'agent', 'discover / register', 'both'); p.edge('agent', 'wl', '', 'primary')
p.text(870, 1030, 660, 180, 'Sizing (values.yaml): Backend CPU 3 / 3 Gi in production (GOMEMLIMIT ≈ 80% of limit); Build Task Consumer 3–6 replicas; Linter 1000 Mi default; Agents Backend 256 Mi default. Probes: /live, /ready (Go services); /live (consumers); nginx /probes/live, /probes/ready.<br><br>Docker Compose (apihub-generic): ui, backend, build-task-consumer, api-linter-service, agents-backend, postgres. Variants: with-keycloak, with-gitlab; java-task-consumer/docker-compose.yml standalone.', 10)

# ======================= 15. DYNAMIC: PUBLISH =======================
p = Page('Dynamic Publish flow'); pages.append(p)
p.text(20, 10, 1300, 30, 'Dynamic view — Publish a package version (numbered steps)', 18, True)
p.node('user', 60, 80, 'User / CI', 'Person', None, kind='person', shape='person', w=160, h=110)
p.node('ui', 300, 100, 'Portal UI', 'Container', None, kind='core', w=200, h=80)
p.node('be', 600, 100, 'APIHUB Backend', 'Container', 'BuildService · BuildResultService · PublishNotificationService', kind='core', w=300, h=100)
p.node('pg', 1000, 100, 'PostgreSQL', 'store', 'build task, sources, results', kind='store', shape='cylinder', w=180, h=100)
p.node('btc', 600, 340, 'Build Task Consumer', 'Container', 'PackageVersionBuilder: parse → buildDocument → buildOperations → normalize → apiDiff → classify → BWC → result ZIP', kind='core', w=300, h=130)
p.node('olric', 1000, 340, 'Olric DTopic', "'version-published'", None, kind='store', w=180, h=80)
p.node('lint', 1000, 540, 'API Linter Service', 'Container', 'PublishEventListener → VersionTaskProcessor → DocTaskProcessor → Spectral / AI → ScoringService', kind='ext_svc', w=300, h=130)
p.node('llm', 1000, 760, 'LLM API', 'optional', None, kind='external', w=180, h=70)
p.edge('user', 'ui', '1. upload sources, configure version', 'primary'); p.edge('ui', 'be', '2. POST /api/v2/packages/{id}/publish', 'primary'); p.edge('be', 'pg', '3. insert build task, store sources')
p.edge('btc', 'be', '4. POST /api/v2/builders/{builderId}/tasks (poll) → task ZIP', 'primary'); p.edge('btc', 'be', '5. status=running heartbeat; GET previous version ops (resolvers)')
p.edge('btc', 'be', '6. POST /api/v3/…/publish/{publishId}/status complete + result ZIP', 'primary'); p.edge('be', 'pg', '7. store documents, operations, changes, contracts')
p.edge('be', 'olric', "8. publish 'version-published'"); p.edge('olric', 'lint', '9. DTopic subscription', 'primary'); p.edge('lint', 'be', '10. GET version documents (access token)'); p.edge('lint', 'llm', '11. AI lint (optional)', 'dashed')
p.edge('lint', 'pg', '12. store lint results + score (apihub_linter)'); p.edge('ui', 'be', '13. poll publish status'); p.edge('ui', 'lint', '14. GET validation summary / scoring', 'dashed')

# ======================= 16. DYNAMIC: DISCOVERY =======================
p = Page('Dynamic Discovery flow'); pages.append(p)
p.text(20, 10, 1300, 30, 'Dynamic view — Agent discovery and snapshot promotion', 18, True)
p.node('user', 60, 80, 'User', 'Person', None, kind='person', shape='person', w=160, h=110)
p.node('ui', 300, 100, 'Agents SPA', 'Container', None, kind='core', w=200, h=80)
p.node('abe', 600, 100, 'Agents Backend', 'Container', 'AgentService · DiscoveryService · SnapshotService', kind='ext_svc', w=300, h=100)
p.node('be', 1000, 100, 'APIHUB Backend', 'Container', 'publish dashboard versions', kind='core', w=260, h=100)
p.node('agent', 600, 340, 'APIHUB Agent', 'Container (remote cluster)', 'DiscoveryService → DocumentDiscoveryService → DiscoveryRunners (parallel)', kind='agent', w=300, h=120)
p.node('k8s', 1000, 340, 'Kubernetes API', 'external', 'namespaces, services', kind='external', w=200, h=80)
p.node('svc', 600, 560, 'Workload services', 'K8s services', 'swagger / graphql / asyncapi / markdown / json-schema endpoints', kind='k8s_svc', w=300, h=100)
p.edge('agent', 'abe', '1. register (cloud, URL, namespace); heartbeat every ~30s', 'primary'); p.edge('user', 'ui', '2. select agent → namespace → workspace; run discovery', 'primary')
p.edge('ui', 'abe', '3. POST /api/v2/agents/{id}/namespaces/{ns}/workspaces/{ws}/discover', 'primary'); p.edge('abe', 'agent', '4. POST /api/v2/namespaces/{ns}/workspaces/{ws}/discover', 'primary')
p.edge('agent', 'k8s', '5. list services (cached)'); p.edge('agent', 'svc', '6. parallel runners: REST · GraphQL · AsyncAPI · Markdown · JSON Schema · generic probes', 'primary')
p.edge('abe', 'ui', '7. services + documents + failed calls'); p.edge('ui', 'abe', '8. create snapshot'); p.edge('abe', 'agent', '9. GET specs'); p.edge('abe', 'be', '10. publish package versions (dashboard + references)', 'primary')

# ======================= 17. DYNAMIC: MCP / AI =======================
p = Page('Dynamic MCP and AI chat'); pages.append(p)
p.text(20, 10, 1300, 30, 'Dynamic view — MCP clients and built-in AI chat', 18, True)
p.node('ide', 60, 80, 'MCP client', 'Cursor / Claude / bots', 'api-key or PAT', kind='person', shape='person', w=180, h=110)
p.node('dev', 60, 420, 'Developer', 'Person', 'Portal AI chat', kind='person', shape='person', w=180, h=110)
p.node('mcp', 400, 100, 'Backend MCP server', '/api/v1/mcp/ · Streamable HTTP · session TTL 15 min', 'tools: search_api_operations · get_api_operation_specification · get_api_operation_diff · get_document (+ legacy *_rest_*) · resource mcp://api-packages-list · IDS authoring prompt', kind='ai', w=420, h=140)
p.node('ops', 900, 100, 'OperationService / Search / VersionService', 'Backend components', 'RBAC via SecurityContext', kind='comp', w=320, h=100)
p.node('chat', 400, 420, 'AiChatTurnService', '/api/v1/ai-chat/chats/{id}/messages/stream', 'tool loop ≤ 10 iterations · MCP tools + ask_clarification (+ IDS tools) · SSE streaming · ephemeral files', kind='ai', w=420, h=140)
p.node('llm', 900, 440, 'LLM API', 'OpenAI-compatible (ai.chat.openAI)', 'model gpt-5 by default, reasoningEffort', kind='external', w=320, h=100)
p.node('lmcp', 400, 640, 'Linter MCP endpoint', '/api-linter/api/v1/mcp/', 'list_linter_issues_for_package_version', kind='ai', w=420, h=90)
p.edge('ide', 'mcp', '1. initialize; 2. tools/call · resources/read · prompts/get', 'primary'); p.edge('mcp', 'ops', '3. execute tool', 'primary'); p.edge('ide', 'lmcp', 'lint issues', 'dashed')
p.edge('dev', 'chat', '1. POST message (stream)', 'primary'); p.edge('chat', 'llm', '2. chat completion with tools', 'primary'); p.edge('llm', 'chat', '3. tool call'); p.edge('chat', 'mcp', '4. MCPService.ExecuteXxxTool'); p.edge('chat', 'dev', '5. SSE tokens, tool events', 'dashed')

# ======================= WRITE =======================
xml = ('<mxfile host="app.diagrams.net" modified="2026-09-11T00:00:00.000Z" agent="claude-c4-generator" version="26.0.0" type="device">'
       + ''.join(pg.xml() for pg in pages) + '</mxfile>')
open('/home/claude/c4/APIHUB_C4_architecture.drawio', 'w', encoding='utf-8').write(xml)
print('pages:', len(pages), 'bytes:', len(xml))
