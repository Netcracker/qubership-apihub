# documents-backend

APIHUB extension that stores and serves **generic Markdown articles** (guides, policies, corporate documentation)
with their **attached files** (images, attachments), plus metadata for **package articles** whose body is a Markdown
document published in an APIHUB package version. Authentication and authorization are delegated to APIHUB: the
service never issues tokens and never re-implements APIHUB RBAC.

| Article kind | Body stored | Who can read |
|---|---|---|
| `generic` / `public` | here | everyone, incl. anonymous when APIHUB `anonymousAccess.enabled` is true |
| `generic` / `corporate` | here | any authenticated APIHUB user |
| `package` | in APIHUB (fetched with the caller's credentials) | whoever APIHUB lets read the package version |

Writes are restricted to APIHUB system administrators, except package-scoped articles and navigation: those can also
be managed by a *package admin* — a caller holding the APIHUB permission `create_and_update_package` (the one APIHUB
requires to edit package settings) on that package.

## Run locally

The Nx project is `documents-backend` (tag `lang:go`). Run from the repository root:

```bash
pnpm exec nx run documents-backend:build
pnpm exec nx run documents-backend:test
```

The Compose stacks in [`deploy/docker-compose`](../../deploy/docker-compose) start the service with PostgreSQL and the
rest of the product. To run it from this directory instead, copy [`config.template.yaml`](config.template.yaml) to
`config.yaml`, set the database and the APIHUB backend, and start it:

```bash
cd backend/documents-backend
DOCS_DATABASE_HOST=localhost DOCS_DATABASE_PORT=5433 DOCS_DATABASE_PASSWORD=documents \
DOCS_APIHUB_URL=http://localhost:8090 go run .
```

Run from the module directory: `resources/migrations` is resolved relative to `BASE_PATH` (default `.`), and
`config.yaml` is read from `DOCS_CONFIG_FOLDER` (default `BASE_PATH`). A folder in the import layout (see below)
can be imported from the command line:

```bash
go run . -import <folder>
```

### Configuration

`config.yaml` is read first; the image does not contain one, so the keys come from the mounted file. Every key can be
overridden with `DOCS_<SECTION>_<KEY>` environment variables
(viper, like APIHUB). The effective configuration is logged at startup with secrets masked.

| Key | Env | Default | Meaning |
|---|---|---|---|
| `server.listenAddress` | `DOCS_SERVER_LISTENADDRESS` | `0.0.0.0:8080` | |
| `database.host/port/name/username/password` | `DOCS_DATABASE_*` | `localhost/5432/documents/documents/` | PostgreSQL |
| `server.allowedOrigins` | `DOCS_SERVER_ALLOWEDORIGINS` | `[]` | CORS origins |
| `server.showDebugInResponse` | `DOCS_SERVER_SHOWDEBUGINRESPONSE` | `true` | include `debug` in error bodies |
| `apihub.url` | `DOCS_APIHUB_URL` | `http://apihub-backend:8080` | internal APIHUB backend URL |
| `apihub.timeout` | `DOCS_APIHUB_TIMEOUT` | `10s` | per-call timeout |
| `apihub.configurationCacheTtl` | `DOCS_APIHUB_CONFIGURATIONCACHETTL` | `60s` | how often `anonymousAccess.enabled` is re-read |
| `apihub.packageAccessCacheTtl` | `DOCS_APIHUB_PACKAGEACCESSCACHETTL` | `60s` | cache for version access checks and package bodies (per principal) |
| `static.maxUploadSizeBytes` | `DOCS_STATIC_MAXUPLOADSIZEBYTES` | `5242880` | upload limit, also applied to import |
| `log.level` | `DOCS_LOG_LEVEL` | `info` | |

Migrations live in `resources/migrations/N_name.{up,down}.sql` and run at startup (same mechanism as APIHUB:
`schema_migrations` + `stored_schema_migration`, with hash comparison and automatic down-migration of changed files).

## Register the extension in APIHUB

APIHUB backend `config.yaml`:

```yaml
extensions:
  - name: docs-backend
    baseUrl: http://qubership-apihub-documents-backend:8080
    pathPrefix: docs-backend
security:
  anonymousAccess: true   # optional: lets anonymous visitors read public articles
```

APIHUB then lists the extension in `GET /api/v2/system/configuration`, and the portal UI
renders the "Things worth reading first" section from `GET /docs-backend/api/v1/articles?scope=generic`.

### nginx snippet (APIHUB UI)

The service expects the prefix to be stripped, exactly like `agents-backend`:

```nginx
location ^~ /docs-backend {
    set $docs_backend_upstream http://${APIHUB_DOCS_BACKEND_ADDRESS};
    add_header X-Content-Type-Options  "nosniff" always;
    add_header Referrer-Policy         "strict-origin-when-cross-origin" always;
    add_header X-Frame-Options         "DENY" always;
    add_header Content-Security-Policy "frame-ancestors 'none'" always;
    rewrite ^/docs-backend/(.*)$ /$1 break;
    proxy_pass $docs_backend_upstream;
    proxy_connect_timeout 1s;
    proxy_next_upstream off;
    proxy_intercept_errors off;
}
```

Do not add `Cache-Control: no-store` here: the service sets `Cache-Control` itself for `/articles/{slug}/files/**`.
Images in article bodies should point at `/docs-backend/api/v1/articles/<slug>/files/<path>` (the admin UI copies that URL).

## API

Full spec: [`docs/api/documents-backend.yaml`](docs/api/documents-backend.yaml). Base path `/api/v1`
(`/docs-backend/api/v1` through nginx). Errors are `{ "status", "code", "message" }` with `DOCS-NNNN` codes.

Credentials: cookie `apihub-access-token` or `Authorization: Bearer <apihub token>` (RS256, validated against
`GET /api/v2/auth/publicKey`), or header `api-key` (validated via APIHUB `GET /api/v2/auth/apiKey`; accepted only
when the key has the *System administrator* role). Invalid or expired credentials are always `401`, never anonymous.

Principal *pkg-admin* = authenticated non-sysadmin caller whose permissions on the target package, read from APIHUB
`GET /api/v2/packages/{packageId}` with the caller's own credentials, include `create_and_update_package`. The target
package comes from the `packageId` query/body parameter (with `scope=package`) or from the stored article / navigation
section. The check is done at most once per package per request (no persistent cache). Without the permission → `403`
(`DOCS-1002`); APIHUB rejecting the credentials → `401`; APIHUB unreachable → `502`.

| Method / path | Principal | Notes |
|---|---|---|
| `GET /articles?scope=generic[&visibility=&limit=&page=]` | anonymous\*, user, admin | published only; anonymous sees `public` only |
| `GET /articles?scope=package&packageId=&version=` | anonymous\*, user, admin | APIHUB version access check with the caller's credentials; non-200 → 404 |
| `GET /articles/{slug}[?version=]` | anonymous\*, user, admin | adds `bodyMd`; corporate → 404 for anonymous; package body fetched from APIHUB; admins see unpublished |
| `GET /navigation?scope=generic` / `?scope=package&packageId=&version=` | anonymous\*, user, admin | guides tree: sections → nested `guide`/`group` items (depth ≤ 3) filtered by the same rules as `GET /articles`; unplaced visible articles land in a trailing synthetic `Other` section |
| `GET /home-articles` | anonymous\*, user, admin | admin-curated ordered list of generic guides for the home page, filtered by the same rules as `GET /articles`; empty when nothing is configured (UI falls back to the first generic guides) |
| `GET /articles/{slug}/files/{path}` | anonymous\*, user, admin | file attached to the article, same access rules as `GET /articles/{slug}`; `ETag`/`If-None-Match` → 304, `Cache-Control` by the article's audience |
| `GET /live`, `GET /ready` (also `/api/v1/health`, `/api/v1/ready`) | none | `/ready` turns 200 once migrations finished |
| any other `/api/**` path | | `421` "Requested unknown endpoint", like APIHUB |
| `GET/POST /admin/articles`, `PUT/DELETE /admin/articles/{id}`, `POST /admin/articles/{id}/(un)publish` | admin; pkg-admin for `scope=package&packageId=X` / articles of package X (on `PUT` both the stored and the new package) | package refs validated in APIHUB (400 with the missing element); slugs are immutable; `POST` also accepts multipart (`article` JSON + `markdown` + `file` parts, title/subtitle/slug derived from the Markdown); delete cascades to attached files |
| `GET /admin/apihub/packages/{id}/versions`, `.../versions/{v}/documents` | admin, pkg-admin of `{id}` | caller credentials forwarded; relays (documents filtered to `type=markdown`) |
| `GET/POST /admin/articles/{id}/files`, `DELETE /admin/articles/{id}/files/{path}` | admin; pkg-admin for articles of their package | files attached to an article; multipart `file` (repeatable), optional `path` relative to the article and unique within it (409 otherwise); 413 over the limit; identical bytes are stored once; `files[]` appears on article responses |
| `GET /admin/navigation?scope=&packageId=` | admin; pkg-admin for `scope=package&packageId=X` | full tree, nothing dropped; guide items carry `articleId`, `titleOverride`, `published`, `dangling` |
| `POST /admin/navigation/sections`, `PUT/DELETE /admin/navigation/sections/{id}` | admin; pkg-admin for sections of their package | one tree per scope (`generic`) or per `packageId` (`package`); delete cascades to items |
| `POST /admin/navigation/items`, `PUT/DELETE /admin/navigation/items/{id}` | admin; pkg-admin for items in sections of their package | `guide` needs `articleId` (same scope/package as the section, one placement per article → 409), `group` needs `title`; parent in the same section, no cycles, depth ≤ 3 |
| `GET/PUT /admin/home-articles` | admin | the home page list incl. unpublished; `PUT { articleIds: [] }` replaces it atomically (position = order; generic only → 400 `DOCS-3016`, duplicates → 400 `DOCS-3017`, unknown id → 404) |
| `POST /admin/import[?validate=false]`, `GET /admin/export` | admin | zip: `articles.yaml` (articles, navigation, home) + `*.md` + `articles/<slug>/**` |

\* only when APIHUB `anonymousAccess.enabled` is true; otherwise every endpoint answers `401` without credentials.

### Smoke test

```bash
B=http://localhost:<host port>/api/v1
curl -s $B/articles?scope=generic | jq '.articles[].slug'          # public only
curl -si $B/articles/<corporate slug> | head -1                     # 404 (corporate)
curl -si $B/admin/articles | head -1                                # 401
curl -s -H "Authorization: Bearer $USER_TOKEN" $B/articles?scope=generic | jq '.articles[].slug'   # + corporate
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" $B/admin/export -o export.zip
curl -s -H "api-key: $CI_ADMIN_KEY" -F archive=@export.zip $B/admin/import
curl -s "$B/articles?scope=package&packageId=<packageId>&version=<version>" | jq
```

### Import / export layout

```text
articles.yaml
<slug>.md             # body of each generic article (path given by `file:`)
articles/<slug>/<path>   # files attached to <slug> (slug must be in the manifest or already stored); audience follows the article
```

```yaml
articles:
  - { slug, title, subtitle, scope: generic, visibility: public|corporate, file: slug.md, labels: [], order: 1, published: true }
  - { slug, title, scope: package, packageId, version, documentSlug, labels: [], order: 2, published: true }
navigation:                      # optional; every (scope, packageId) listed here is replaced on import
  - scope: generic               # or: scope: package, packageId: <id>
    title: Getting started
    order: 1
    items:
      - { kind: guide, article: <slug>, title: optional override, order: 1 }
      - kind: group
        title: Reference
        order: 2
        items:                   # nested, max depth 3
          - { kind: guide, article: <slug> }
home: [<slug>, <slug>]           # optional; ordered generic guides for the home page, replaced when present
```

## Repository layout

The module follows the layout of the other Go services under `backend/`: documentation in `docs/` with the OpenAPI
specification in [`docs/api/documents-backend.yaml`](docs/api/documents-backend.yaml), and the `Dockerfile` at the
module root. The Compose stacks live in [`deploy/docker-compose`](../../deploy/docker-compose).

### Module layout

Same conventions as `backend/portal-backend` (interface + `xxxImpl`, `responder`, `SystemInfoService`, flat route
table and startup sequence in `main.go`) with `backend/agents-backend` file naming (snake_case, one file per domain):

`main.go` wiring, migrations, routes · `controller/` handlers (`article`, `admin_article`, `navigation`, `home_article`, `admin_home_article`,
`admin_navigation`, `article_file`, `import_export`, `health`) · `service/` business rules (`article`, `navigation`, `home_article`,
`apihub_relay`, `article_file`, `import`, `export`, `db_migration`, `system_info`) · `repository/` go-pg access (`article`, `article_file`,
`file_data` — deduplicated contents by checksum, `navigation`) · `entity/` rows + `Make*View` · `view/` API models ·
`client/` APIHUB client + forwarded credentials · `security/` go-guardian strategies, public key and anonymous-flag
providers, `Authenticator` middleware · `secctx/` principal in context · `responder/`, `exception/`, `utils/`, `db/`
· `resources/migrations/` SQL · `docs/api/` OpenAPI · `internal/testsupport/` fakes.
