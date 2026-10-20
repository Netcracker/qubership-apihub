#!/usr/bin/env node
// The database ERDs of the backends, rendered from their SQL migrations and stored in ghcr.
//
//   erd.js backends <ref>              the backends that own a database at <ref>, one per line
//   erd.js key <backend> <ref>         the store key of that backend's ERD at <ref>
//   erd.js render <backend> <out>      apply the migrations of the checkout, run SchemaSpy into <out>
//   erd.js assemble <site-erd> <ref>   pull every backend's render for <ref>, write the index page
//   erd.js gc [--dry-run]              delete renders no one needs any more
//
// WHY MIGRATIONS AND NOT A RUNNING SERVICE. A backend's `public` schema comes only from its
// `resources/migrations/N_*.up.sql`, applied in numeric order, one transaction each, by its Go
// migrator. The migrator adds two bookkeeping tables, created here exactly as it creates them. So an
// empty PostgreSQL and psql give the tables of a running service without images, secrets, or the
// rest of APIHUB. A backend joins by convention: any `backend/<name>/resources/migrations/` that
// holds an `*.up.sql`.
//
// THE STORE, per backend, in `<ERD_REGISTRY>/erd-<backend>`: one OCI artifact per render, tagged
// `mig-<key>`, a gzipped tarball of the SchemaSpy output. The key hashes everything that decides
// the output (see `computeKey`), so a key is rendered once and never again; erd.yml renders only the
// keys the store lacks. The annotations carry the commit, the date, and the last migration.
//
// Environment:
//   ERD_REGISTRY            the registry namespace, default ghcr.io/netcracker (assemble, gc)
//   PGHOST PGPORT PGUSER PGPASSWORD
//                           the PostgreSQL server render creates its database on; PGPORT
//                           defaults to 5432
//   ERD_CONTAINER_CLI       the container runner for SchemaSpy, default docker (podman works)
//   ERD_CONTAINER_NETWORK   the network the SchemaSpy container joins, default host
//   ERD_SCHEMASPY_PGHOST, ERD_SCHEMASPY_PGPORT
//                           the server as the SchemaSpy container reaches it, default PGHOST and
//                           PGPORT (they differ when the server runs in a container network)
//   OWNER                   the ghcr namespace for gc's package API, default the last segment
//                           of ERD_REGISTRY
//   GH_TOKEN                for gc, which lists and deletes package versions with `gh api`
//   DRY_RUN=true            the same as `gc --dry-run`
//   GITHUB_OUTPUT, GITHUB_STEP_SUMMARY
//                           optional; render writes last_migration, tables, and columns to the first
//
// Exit codes: 0 done, 1 failed (the message says why), 2 usage.
'use strict'

const { execFileSync, spawnSync } = require('child_process')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', '..')
const SCHEMASPY_VERSION = '7.0.2'
const SCHEMASPY_IMAGE = `docker.io/schemaspy/schemaspy:${SCHEMASPY_VERSION}`
// erd.yml's `postgres:16` service must match; render checks the server it is given.
const POSTGRES_MAJOR = 16
const DEFAULT_REGISTRY = 'ghcr.io/netcracker'
const TARBALL = 'erd.tar.gz'
const TAG = /^mig-[0-9a-f]{16}$/
const GC_MIN_AGE_MS = 30 * 24 * 60 * 60 * 1000
// The branches whose renders gc never deletes: the site shows one of them (D16).
const KEPT_BRANCHES = ['main', 'develop']

// The tables the Go migrator creates before it applies the first migration
// (portal-backend, api-linter-service, and agents-backend create the same two).
const BOOKKEEPING_SQL = `
CREATE TABLE IF NOT EXISTS public.schema_migrations ("version" int4 NOT NULL, dirty bool NOT NULL,
  CONSTRAINT schema_migrations_pkey PRIMARY KEY (version));
CREATE TABLE IF NOT EXISTS public.stored_schema_migration (num int4 NOT NULL, up_hash varchar NOT NULL,
  sql_up varchar NOT NULL, down_hash varchar NULL, sql_down varchar NULL,
  CONSTRAINT stored_schema_migration_pkey PRIMARY KEY (num));
`

// ---- pure functions ---------------------------------------------------------------------------

// Backends from `git ls-tree -r --name-only <ref> -- backend/`: those whose migrations folder holds
// at least one `*.up.sql` directly.
function detectBackends(listing) {
  const found = new Set()
  for (const line of listing.split('\n')) {
    const m = line.trim().match(/^backend\/([^/]+)\/resources\/migrations\/[^/]+\.up\.sql$/)
    if (m) found.add(m[1])
  }
  return [...found].sort()
}

// The `*.up.sql` names in the order the migrator applies them: by the number before the first `_`.
// A name without that number, or two files with one number, is an error rather than a guess.
function orderMigrations(names) {
  const seen = new Map()
  const ups = []
  for (const name of names) {
    if (!name.endsWith('.up.sql')) continue
    const m = name.match(/^(\d+)_.*\.up\.sql$/)
    if (!m) throw new Error(`migration ${name} does not start with N_, so its place in the order is unknown`)
    const n = Number(m[1])
    if (seen.has(n)) throw new Error(`migrations ${seen.get(n)} and ${name} share the number ${n}`)
    seen.set(n, name)
    ups.push({ n, name })
  }
  return ups.sort((a, b) => a.n - b.n).map((u) => u.name)
}

// The generator's own files from `git ls-tree <ref> -- tools/ci/ .github/workflows/erd.yml`.
function generatorFiles(listing) {
  const files = []
  for (const line of listing.split('\n')) {
    const m = line.match(/^\d+ blob ([0-9a-f]+)\t(.+)$/)
    if (m && (/^tools\/ci\/erd[^/]*$/.test(m[2]) || m[2] === '.github/workflows/erd.yml')) files.push({ path: m[2], blob: m[1] })
  }
  return files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
}

// The store key: everything that decides what a render produces. The migrations tree hash changes
// with any migration; the generator's blobs with any change to how it renders; the two versions
// with the tools. First 16 hex characters of a sha256.
function computeKey({ migrationsTree, generator, schemaspy, postgresMajor }) {
  if (!/^[0-9a-f]{40,64}$/.test(migrationsTree || '')) throw new Error(`not a tree hash: '${migrationsTree}'`)
  const lines = [
    `migrations ${migrationsTree}`,
    ...[...generator].sort((a, b) => (a.path < b.path ? -1 : 1)).map((g) => `generator ${g.path} ${g.blob}`),
    `schemaspy ${schemaspy}`,
    `postgres ${postgresMajor}`,
  ]
  return crypto.createHash('sha256').update(lines.join('\n') + '\n').digest('hex').slice(0, 16)
}

// SchemaSpy prints the database name in every page title, so it is the backend's name.
const databaseName = (backend) => backend.replace(/-/g, '_')

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function formatDate(iso) {
  const t = Date.parse(iso || '')
  if (Number.isNaN(t)) return 'an unknown date'
  const d = new Date(t)
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
}

// `/erd/index.html`: one card per backend. The stylesheet is the navigation page's, at the site root.
function renderIndex({ ref, cards }) {
  const items = cards
    .map((c) => {
      const commit = c.revision ? `commit <code>${escapeHtml(c.revision.slice(0, 9))}</code>` : 'an unknown commit'
      return [
        `        <a class="card" href="${escapeHtml(c.backend)}/">`,
        `          <h2>${escapeHtml(c.backend)}</h2>`,
        `          <p>Last migration: <code>${escapeHtml(c.lastMigration)}</code></p>`,
        `          <p>Rendered from ${commit} on ${escapeHtml(formatDate(c.created))}</p>`,
        '        </a>',
      ].join('\n')
    })
    .join('\n')
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Database ERD</title>
    <link rel="stylesheet" href="../style.css">
  </head>
  <body>
    <main class="page">
      <h1>Database ERD</h1>
      <p>The schema of each backend database at <code>${escapeHtml(ref)}</code>, built from its SQL migrations
        by SchemaSpy ${SCHEMASPY_VERSION} on PostgreSQL ${POSTGRES_MAJOR}.</p>
      <section class="cards">
${items}
      </section>
      <p><a href="../">All APIHUB sites</a></p>
    </main>
  </body>
</html>
`
}

// gc's choice for one package. versions: [{ id, updated_at, tags }]; keep: the tags of the kept
// branches' keys. A version goes when all its tags are `mig-*`, none is kept, and it is over
// 30 days old; an untagged version (a render replaced by a forced one) goes at the same age. Any
// other tag is not this tool's and keeps the version. ghcr refuses to delete a package's last
// version, so when everything would go, the newest stays.
function selectGc(versions, keep, now) {
  const remove = []
  for (const v of versions) {
    const age = now - Date.parse(v.updated_at)
    if (!(age > GC_MIN_AGE_MS)) continue
    if (v.tags.length === 0) remove.push({ ...v, why: 'untagged, over 30 days old' })
    else if (v.tags.every((t) => TAG.test(t) && !keep.has(t))) {
      remove.push({ ...v, why: 'not the key of main or develop, over 30 days old' })
    }
  }
  let last = null
  if (remove.length > 0 && remove.length === versions.length) {
    remove.sort((a, b) => Date.parse(a.updated_at) - Date.parse(b.updated_at))
    last = remove.pop()
  }
  return { remove, last }
}

// ---- processes --------------------------------------------------------------------------------

function run(cmd, args, options = {}) {
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 256 * 1024 * 1024, ...options })
}

const git = (...args) => run('git', ['-C', ROOT, ...args])

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

// "Does not exist" is an answer and is thrown at once with `notFound`. Any other failure is
// retried, then fatal: a transient error must not read as a missing render.
function registry(cmd, args) {
  let last
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return run(cmd, args)
    } catch (e) {
      const stderr = String(e.stderr || e.message)
      const err = new Error(`${cmd} ${args.join(' ')}: ${stderr.trim()}`)
      err.notFound = /name unknown|NAME_UNKNOWN|MANIFEST_UNKNOWN|not found|HTTP 404/i.test(stderr)
      if (err.notFound) throw err
      last = err
      sleep(2000 * attempt)
    }
  }
  throw last
}

function write(lines) {
  const text = lines.join('\n') + '\n'
  process.stdout.write(text)
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, text)
}

const registryBase = () => (process.env.ERD_REGISTRY || DEFAULT_REGISTRY).replace(/\/+$/, '').toLowerCase()
const repoOf = (backend) => `${registryBase()}/erd-${backend}`

function checkBackendName(backend) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(backend || '')) throw new Error(`not a backend name: '${backend}'`)
}

// ---- git at a ref -----------------------------------------------------------------------------

function backendsAt(ref) {
  return detectBackends(git('ls-tree', '-r', '--name-only', ref, '--', 'backend/'))
}

function migrationsAt(backend, ref) {
  const dir = `backend/${backend}/resources/migrations/`
  return orderMigrations(git('ls-tree', '--name-only', ref, '--', dir).split('\n').filter(Boolean).map((p) => path.posix.basename(p)))
}

function keyAt(backend, ref) {
  checkBackendName(backend)
  const dir = `backend/${backend}/resources/migrations`
  let migrationsTree
  try {
    migrationsTree = git('rev-parse', '--verify', '--quiet', `${ref}:${dir}`).trim()
  } catch {
    throw new Error(`${dir} does not exist at ${ref}`)
  }
  const generator = generatorFiles(git('ls-tree', ref, '--', 'tools/ci/', '.github/workflows/erd.yml'))
  if (!generator.some((g) => g.path === 'tools/ci/erd.js')) {
    const err = new Error(`tools/ci/erd.js is not at ${ref}, so no ERD can have been rendered for it`)
    err.noGenerator = true
    throw err
  }
  return computeKey({ migrationsTree, generator, schemaspy: SCHEMASPY_VERSION, postgresMajor: POSTGRES_MAJOR })
}

// ---- render -----------------------------------------------------------------------------------

function pgEnv() {
  for (const name of ['PGHOST', 'PGUSER', 'PGPASSWORD']) if (!process.env[name]) throw new Error(`${name} is not set`)
  return { ...process.env, PGPORT: process.env.PGPORT || '5432' }
}

// psql with the given arguments; returns stdout. On failure the error carries psql's stderr.
function psql(env, args, what) {
  const r = spawnSync('psql', ['-X', '-v', 'ON_ERROR_STOP=1', ...args], { env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  if (r.error) throw new Error(`${what}: cannot run psql: ${r.error.message}`)
  if (r.status !== 0) throw new Error(`${what}: psql exited with ${r.status}\n${(r.stderr || '').trim()}`)
  return r.stdout
}

// A container's server may still be starting; wait up to a minute for it to accept connections.
function waitForServer(env) {
  let last
  for (let i = 0; i < 30; i++) {
    try {
      return psql(env, ['-At', '-d', 'postgres', '-c', 'SHOW server_version_num'], 'connect').trim()
    } catch (e) {
      last = e
      sleep(2000)
    }
  }
  throw new Error(`cannot reach PostgreSQL at ${env.PGHOST}:${env.PGPORT}: ${last.message}`)
}

function render(backend, outArg) {
  checkBackendName(backend)
  const started = Date.now()
  const dir = path.join(ROOT, 'backend', backend, 'resources', 'migrations')
  if (!fs.existsSync(dir)) throw new Error(`${path.relative(ROOT, dir)} does not exist in this checkout`)
  const files = orderMigrations(fs.readdirSync(dir))
  if (files.length === 0) throw new Error(`${path.relative(ROOT, dir)} holds no *.up.sql`)

  const out = path.resolve(outArg)
  if (fs.existsSync(out) && fs.readdirSync(out).length > 0) throw new Error(`${out} is not empty; render writes into an empty folder`)

  const env = pgEnv()
  const version = Number(waitForServer(env))
  if (Math.floor(version / 10000) !== POSTGRES_MAJOR) {
    const at = `${env.PGHOST}:${env.PGPORT}`
    throw new Error(`the server at ${at} is PostgreSQL ${Math.floor(version / 10000)}; the key assumes ${POSTGRES_MAJOR}`)
  }

  const db = databaseName(backend)
  const lookup = `SELECT 1 FROM pg_database WHERE datname = '${db}'`
  const exists = psql(env, ['-At', '-d', 'postgres', '-c', lookup], 'look up the database').trim()
  if (exists) throw new Error(`database ${db} already exists on ${env.PGHOST}:${env.PGPORT}; render needs a server without it`)
  fs.mkdirSync(out, { recursive: true })
  // The SchemaSpy image runs as its own user, which cannot write into a folder the runner owns.
  if (process.platform !== 'win32') fs.chmodSync(out, 0o777)
  psql(env, ['-q', '-d', 'postgres', '-c', `CREATE DATABASE ${db}`], `create database ${db}`)
  psql(env, ['-q', '-d', db, '-c', BOOKKEEPING_SQL], 'create the bookkeeping tables')
  for (const f of files) psql(env, ['-q', '--single-transaction', '-d', db, '-f', path.join(dir, f)], `migration ${f}`)
  const applied = Date.now()

  const count = (sql) => Number(psql(env, ['-At', '-d', db, '-c', sql], 'count').trim())
  const tables = count("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'")
  const columns = count(
    'SELECT count(*) FROM information_schema.columns c JOIN information_schema.tables t USING (table_schema, table_name)' +
      " WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'",
  )

  const cli = process.env.ERD_CONTAINER_CLI || 'docker'
  const args = [
    'run', '--rm', '--network', process.env.ERD_CONTAINER_NETWORK || 'host',
    // Forward slashes: Podman on Windows reads `C:\…:/output` as three fields.
    '-v', `${out.replace(/\\/g, '/')}:/output`,
    SCHEMASPY_IMAGE,
    '-t', 'pgsql11',
    '-host', process.env.ERD_SCHEMASPY_PGHOST || env.PGHOST,
    '-port', process.env.ERD_SCHEMASPY_PGPORT || env.PGPORT,
    '-db', db, '-u', env.PGUSER, '-p', env.PGPASSWORD,
    '-s', 'public', '-cat', '%', '-imageformat', 'svg', '-norows',
  ]
  const r = spawnSync(cli, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  if (r.error) throw new Error(`cannot run ${cli}: ${r.error.message}`)
  if (r.status !== 0) {
    throw new Error(`SchemaSpy exited with ${r.status}\n${`${r.stdout || ''}${r.stderr || ''}`.trim().split('\n').slice(-40).join('\n')}`)
  }

  // Validate the output, not the exit code.
  const index = path.join(out, 'index.html')
  if (!fs.existsSync(index) || fs.statSync(index).size === 0) throw new Error(`SchemaSpy wrote no ${index}`)
  const tablesDir = path.join(out, 'tables')
  const pages = fs.existsSync(tablesDir) ? fs.readdirSync(tablesDir).filter((f) => f.endsWith('.html')).length : 0
  if (pages < tables) throw new Error(`SchemaSpy wrote ${pages} table pages for ${tables} tables`)

  const last = files[files.length - 1]
  const seconds = (ms) => (ms / 1000).toFixed(1)
  write([
    `${backend}: ${files.length} migrations up to ${last}, ${tables} tables, ${columns} columns;` +
      ` migrations ${seconds(applied - started)} s, SchemaSpy ${seconds(Date.now() - applied)} s; ERD in ${out}`,
  ])
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `last_migration=${last}\ntables=${tables}\ncolumns=${columns}\n`)
  }
}

// ---- assemble ---------------------------------------------------------------------------------

function pull(backend, tag, dir) {
  const tmp = `${dir}.pull`
  fs.rmSync(tmp, { recursive: true, force: true })
  fs.rmSync(dir, { recursive: true, force: true })
  try {
    registry('oras', ['pull', `${repoOf(backend)}:${tag}`, '-o', tmp])
    const tarball = path.join(tmp, TARBALL)
    if (!fs.existsSync(tarball)) throw new Error(`${repoOf(backend)}:${tag} pulled without ${TARBALL}`)
    fs.mkdirSync(dir, { recursive: true })
    // Relative names: GNU tar reads `C:` in an absolute Windows path as a remote host.
    run('tar', ['xzf', path.relative(dir, tarball).replace(/\\/g, '/')], { cwd: dir })
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
  const index = path.join(dir, 'index.html')
  if (!fs.existsSync(index) || fs.statSync(index).size === 0) throw new Error(`${repoOf(backend)}:${tag}: index.html missing or empty`)
}

function assemble(siteErdArg, ref) {
  const siteErd = path.resolve(siteErdArg)
  const backends = backendsAt(ref)
  if (backends.length === 0) throw new Error(`no backend has resources/migrations/*.up.sql at ${ref}`)

  const plans = backends.map((backend) => {
    const tag = `mig-${keyAt(backend, ref)}`
    const migrations = migrationsAt(backend, ref)
    return { backend, tag, lastMigration: migrations[migrations.length - 1] }
  })

  // Every manifest first, so one run names every missing render.
  const missing = []
  for (const p of plans) {
    try {
      p.annotations = JSON.parse(registry('oras', ['manifest', 'fetch', `${repoOf(p.backend)}:${p.tag}`])).annotations || {}
    } catch (e) {
      if (!e.notFound) throw e
      missing.push(`${p.backend} (${repoOf(p.backend)}:${p.tag})`)
    }
  }
  if (missing.length) throw new Error(`no ERD render at ${ref} for ${missing.join(', ')}; run erd.yml on ${ref}`)

  fs.mkdirSync(siteErd, { recursive: true })
  for (const p of plans) pull(p.backend, p.tag, path.join(siteErd, p.backend))

  const cards = plans.map((p) => ({
    backend: p.backend,
    lastMigration: p.lastMigration,
    revision: p.annotations['org.opencontainers.image.revision'] || '',
    created: p.annotations['org.opencontainers.image.created'] || '',
  }))
  fs.writeFileSync(path.join(siteErd, 'index.html'), renderIndex({ ref: ref.replace(/^origin\//, ''), cards }))

  write([
    `### ERD at \`${ref}\``,
    '',
    '| backend | render | last migration | commit |',
    '|---|---|---|---|',
    ...cards.map((c, i) => `| ${c.backend} | \`${plans[i].tag}\` | \`${c.lastMigration}\` | ${c.revision.slice(0, 9)} |`),
  ])
}

// ---- gc ---------------------------------------------------------------------------------------

function owner() {
  return (process.env.OWNER || registryBase().split('/').pop()).toLowerCase()
}

// origin/<branch>, fetched when the checkout lacks it: trees only, and shallow only where the
// checkout already is. Undefined when the remote has no such branch.
function keptRef(branch) {
  const ref = `origin/${branch}`
  const has = () => {
    try {
      git('rev-parse', '--verify', '--quiet', `${ref}^{commit}`)
      return true
    } catch {
      return false
    }
  }
  if (has()) return ref
  if (!git('ls-remote', '--heads', 'origin', branch).trim()) return undefined
  const shallow = git('rev-parse', '--is-shallow-repository').trim() === 'true'
  git('fetch', '--no-tags', '--filter=blob:none', ...(shallow ? ['--depth=1'] : []), 'origin', `+refs/heads/${branch}:refs/remotes/${ref}`)
  if (!has()) throw new Error(`fetched ${branch} and still cannot resolve ${ref}`)
  return ref
}

function gc(dry) {
  const refs = KEPT_BRANCHES.map(keptRef).filter(Boolean)
  if (refs.length === 0) throw new Error(`none of ${KEPT_BRANCHES.join(', ')} exists on origin; refusing to treat that as nothing to keep`)

  // backend -> the tags its kept branches' keys name.
  const keep = new Map()
  for (const ref of refs) {
    for (const backend of backendsAt(ref)) {
      if (!keep.has(backend)) keep.set(backend, new Set())
      try {
        keep.get(backend).add(`mig-${keyAt(backend, ref)}`)
      } catch (e) {
        if (!e.noGenerator) throw e
      }
    }
  }

  const now = Date.now()
  const lines = [
    `### ERD store cleanup${dry ? ' (dry run)' : ''}`, '', `Kept: the keys of ${refs.join(', ')}.`, '',
    '| package | version | tags | action |', '|---|---|---|---|',
  ]
  const header = lines.length
  let failures = 0
  for (const [backend, kept] of keep) {
    const pkg = `erd-${backend}`
    const api = `users/${owner()}/packages/container/${pkg}/versions`
    let versions
    try {
      versions = registry('gh', ['api', '--paginate', api, '--jq', '.[] | {id, updated_at, tags: .metadata.container.tags}'])
        .split('\n')
        .filter(Boolean)
        .map((l) => JSON.parse(l))
    } catch (e) {
      if (e.notFound) continue
      throw e
    }
    const { remove, last } = selectGc(versions, kept, now)
    const tags = (v) => (v.tags.length ? v.tags.map((t) => `\`${t}\``).join(' ') : '_none_')
    if (last) lines.push(`| ${pkg} | ${last.id} | ${tags(last)} | kept: the package's last version cannot be deleted (${last.why}) |`)
    for (const v of remove) {
      if (dry) {
        lines.push(`| ${pkg} | ${v.id} | ${tags(v)} | would delete: ${v.why} |`)
        continue
      }
      try {
        registry('gh', ['api', '-X', 'DELETE', `${api}/${v.id}`])
        lines.push(`| ${pkg} | ${v.id} | ${tags(v)} | deleted: ${v.why} |`)
      } catch (e) {
        failures++
        lines.push(`| ${pkg} | ${v.id} | ${tags(v)} | **FAILED** to delete (${v.why}): ${String(e.message).split('\n')[0].slice(0, 160)} |`)
      }
    }
  }
  if (lines.length === header) lines.push('| | | | nothing to delete |')
  write(lines)
  if (failures) process.exit(1)
}

// ---- main -------------------------------------------------------------------------------------

module.exports = { detectBackends, orderMigrations, generatorFiles, computeKey, databaseName, renderIndex, formatDate, selectGc }

const USAGE = 'usage: erd.js backends <ref> | key <backend> <ref> | render <backend> <out> | assemble <site-erd-dir> <ref> | gc [--dry-run]'

if (require.main === module) {
  const [mode, a, b, ...rest] = process.argv.slice(2)
  try {
    if (mode === 'backends' && a && !b) for (const backend of backendsAt(a)) console.log(backend)
    else if (mode === 'key' && a && b && !rest.length) console.log(keyAt(a, b))
    else if (mode === 'render' && a && b && !rest.length) render(a, b)
    else if (mode === 'assemble' && a && b && !rest.length) assemble(a, b)
    else if (mode === 'gc' && (!a || a === '--dry-run') && !b) gc(a === '--dry-run' || process.env.DRY_RUN === 'true')
    else {
      console.error(USAGE)
      process.exit(2)
    }
  } catch (e) {
    console.error(`::error::erd.js ${mode}: ${e.message}`)
    process.exit(1)
  }
}
