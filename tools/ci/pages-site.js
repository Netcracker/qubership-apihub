#!/usr/bin/env node
// Lays out the GitHub Pages site of the repository: every section, in one folder that pages.yml
// uploads as the Pages artifact.
//
//   pages-site.js <site-dir> --landing <dist> --ref <name> --commit <sha> [options]
//
//   --landing <dist>           the landing's build (sites/landing/dist); required
//   --docs <dist>              the docs site's build; without it, or when the folder does not
//                              exist, docs/ gets a page saying the documentation site is coming
//   --ref <name>, --commit <sha>
//                              the ref the site shows (D16) and its commit; the ERDs are read at
//                              the commit, and the footer of the navigation page names both
//   --landing-ref <name>, --landing-commit <sha>
//                              the landing's own ref, when LANDING_REF moved it elsewhere
//   --index <dir>              the navigation page's templates (default sites/index)
//   --repo-url <url>           for the footer and the docs placeholder (default from GITHUB_*)
//   --budget-mib <n>           the whole site's budget (default 900)
//   --erd-optional             a failed ERD assembly gives a placeholder erd/index.html and a
//                              warning instead of a failure; also ERD_OPTIONAL=true
//   --erd-script <js>, --storybook-script <js>
//                              the scripts to run for those sections (default tools/ci/erd.js and
//                              tools/ci/storybook-site.js); tests and local runs pass stubs
//
// The layout (D15), under /qubership-apihub/:
//
//   /                  sites/index/*, the placeholders filled; its README.md is not published
//   /404.html          the template with the Storybook text; /404-map.js routes the legacy URLs
//   /landing/          the landing
//   /docs/             the docs site
//   /erd/              tools/ci/erd.js assemble
//   /pages/erd/        a redirect to /erd/portal-backend/, the legacy ERD
//   /storybook/        tools/ci/storybook-site.js assemble, with the budget the rest leaves
//
// Everything except the Storybooks is laid out first and measured. The Storybooks get
// `budget - everything else`, and the run fails when everything else passes 300 MiB, because then
// the Storybooks would have too little room to be worth publishing.
'use strict'

const { execFileSync, spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const { NOT_PUBLISHED_HTML, SECTION: STORYBOOK, SITE_LIMIT } = require('./storybook-site.js')

const MIB = 1024 ** 2
const DEFAULT_BUDGET_MIB = 900
const REST_LIMIT = 300 * MIB
const REPO_ROOT = path.resolve(__dirname, '..', '..')
const COMPONENTS = JSON.parse(fs.readFileSync(path.join(__dirname, 'storybooks.json'), 'utf8')).map((c) => c.component)

// Files of sites/index that are filled before they are published, and the placeholders each must
// hold. A template without one of them fails the run: a page that silently lost its lists is worse
// than a failed deploy, which leaves the previous site up.
const TEMPLATES = {
  'index.html': ['STORYBOOK_COMPONENTS', 'ERD_BACKENDS', 'BUILD_REF'],
  '404.html': ['STORYBOOK_404_TEXT'],
}
const REQUIRED_INDEX_FILES = ['index.html', '404.html', '404-map.js']
// Folders the sections own. A file of sites/index with one of these names would be overwritten.
const SECTIONS = ['landing', 'docs', 'erd', 'pages', STORYBOOK]

const html = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const mib = (n) => `${(n / MIB).toFixed(1)} MiB`
const size = (n) => (n < MIB ? `${(n / 1024).toFixed(1)} KiB` : mib(n))

// ---- pure parts, tested in pages-site.test.js -----------------------------------------------------

// Replaces every `<!--@NAME@-->` of `values` in `template`. Fails when a value has no placeholder,
// or when a placeholder is left without a value.
function fillPlaceholders(template, values) {
  let out = template
  for (const [name, value] of Object.entries(values)) {
    const marker = `<!--@${name}@-->`
    if (!out.includes(marker)) throw new Error(`the template has no ${marker} placeholder`)
    out = out.split(marker).join(value)
  }
  const left = out.match(/<!--@[A-Z0-9_]+@-->/g)
  if (left) throw new Error(`placeholders without a value: ${[...new Set(left)].join(', ')}`)
  return out
}

// The Storybooks' share of the budget: what everything else leaves.
function storybookBudget(restBytes, { budgetBytes = DEFAULT_BUDGET_MIB * MIB, restLimitBytes = REST_LIMIT } = {}) {
  if (!Number.isFinite(budgetBytes) || budgetBytes <= 0) throw new Error(`the site budget must be positive, got ${budgetBytes}`)
  if (restBytes > restLimitBytes) {
    throw new Error(
      `everything except the Storybooks takes ${mib(restBytes)}, over the ${mib(restLimitBytes)} limit; ` +
        'find what grew in the step summary before raising the limit',
    )
  }
  if (restBytes >= budgetBytes) {
    throw new Error(`everything except the Storybooks takes ${mib(restBytes)}, the whole ${mib(budgetBytes)} budget`)
  }
  return budgetBytes - restBytes
}

// What goes where. `indexFiles` are the entries of sites/index. Returns the copies (site-relative
// `to`), the templates to fill, and whether docs/ is the docs site or the placeholder.
function layoutPlan({ indexFiles, landingDist, docsDist }) {
  const missing = REQUIRED_INDEX_FILES.filter((f) => !indexFiles.includes(f))
  if (missing.length) throw new Error(`sites/index lacks ${missing.join(', ')}`)
  const clash = indexFiles.filter((f) => SECTIONS.includes(f))
  if (clash.length) throw new Error(`sites/index holds ${clash.join(', ')}, the name of a section folder`)
  if (!landingDist) throw new Error('the landing build is required (--landing)')

  const copies = indexFiles
    .filter((f) => !f.toLowerCase().endsWith('.md') && !Object.hasOwn(TEMPLATES, f))
    .sort()
    .map((f) => ({ from: `index/${f}`, to: f }))
  copies.push({ from: 'landing', to: 'landing' })
  if (docsDist) copies.push({ from: 'docs', to: 'docs' })
  return { copies, templates: Object.keys(TEMPLATES), docs: docsDist ? 'site' : 'placeholder' }
}

// The <ul> lists for the navigation page. `href` is relative to the site root.
function linkList(items, empty) {
  if (items.length === 0) return `<ul><li>${html(empty)}</li></ul>`
  return `<ul>${items
    .map((i) => (i.href ? `<li><a href="${html(i.href)}">${html(i.label)}</a></li>` : `<li>${html(i.label)}</li>`))
    .join('')}</ul>`
}

function storybookComponents(components, published) {
  return linkList(
    components.filter((c) => published.includes(c)).map((c) => ({ label: c, href: `${STORYBOOK}/${c}/` })),
    'No Storybook is published yet',
  )
}

// `prefix` is the path from the page to erd/: `erd/` on the navigation page, empty on erd/index.html.
function erdBackends(backends, rendered, prefix = 'erd/') {
  return linkList(
    backends.map((b) => (rendered.includes(b) ? { label: b, href: `${prefix}${b}/` } : { label: `${b} (not rendered yet)` })),
    'No ERD is rendered yet',
  )
}

const short = (sha) => String(sha).slice(0, 7)

// The footer's "Built from ...": the ref and its commit, and the landing's when it differs.
function buildRef({ ref, commit, landingRef, landingCommit, repoUrl }) {
  const one = (r, c) =>
    `<a href="${html(`${repoUrl}/tree/${c}`)}"><code>${html(r)}</code> at <code>${html(short(c))}</code></a>`
  const site = one(ref, commit)
  if (!landingCommit || landingCommit === commit) return site
  return `${site}; the landing from ${one(landingRef || landingCommit, landingCommit)}`
}

function page({ title, depth, body }) {
  const up = '../'.repeat(depth)
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${html(title)} | Qubership APIHUB</title>
  <link rel="icon" href="${up}logo.png">
  <link rel="stylesheet" href="${up}style.css">
</head>
<body>
  <main class="page">
    <header class="hero">
      <a href="${up}"><img src="${up}logo.png" alt="Qubership APIHUB logo"></a>
      <h1>${html(title)}</h1>
    </header>
${body}
  </main>
</body>
</html>
`
}

// docs/index.html until sites/docs exists at the site's ref (step 10).
function docsPlaceholder({ repoUrl, commit }) {
  return page({
    title: 'Documentation',
    depth: 1,
    body: `    <p id="message">The documentation site is coming. Until it is published, read the guides in the
      <a href="${html(`${repoUrl}/tree/${commit}/docs`)}"><code>docs/</code> folder on GitHub</a>.</p>`,
  })
}

// erd/index.html when the ERD assembly failed and ERD_OPTIONAL allowed it.
function erdPlaceholder({ backends, rendered, reason }) {
  return page({
    title: 'Database ERD',
    depth: 1,
    body: `    <p id="message">Not every ERD is rendered yet (${html(reason)}). The ERD workflow renders them
      when the migrations change on <code>develop</code> or <code>main</code>.</p>
    ${erdBackends(backends, rendered, '')}`,
  })
}

// pages/erd/index.html: the legacy ERD's entry point. The 404 page redirects the other legacy
// ERD paths; this one has a file, so it also works without JavaScript.
function legacyErdStub() {
  const target = '../../erd/portal-backend/'
  return `<!doctype html>
<meta charset="utf-8">
<meta name="robots" content="noindex">
<title>Database ERD</title>
<link rel="canonical" href="${target}">
<script>location.replace(${JSON.stringify(target)} + location.search + location.hash)</script>
<noscript><meta http-equiv="refresh" content="0; url=${target}"></noscript>
<p>The ERD moved to <a href="${target}">erd/portal-backend/</a>.</p>
`
}

// ---- options ---------------------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = { flags: new Set() }
  const valued = new Set([
    '--landing', '--docs', '--ref', '--commit', '--landing-ref', '--landing-commit', '--index', '--repo-url',
    '--budget-mib', '--erd-script', '--storybook-script',
  ])
  const boolean = new Set(['--erd-optional'])
  const positional = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (valued.has(a)) {
      if (i + 1 >= argv.length) throw new Error(`${a} needs a value`)
      opts[a.slice(2)] = argv[++i]
    } else if (boolean.has(a)) opts.flags.add(a.slice(2))
    else if (a.startsWith('--')) throw new Error(`unknown option ${a}`)
    else positional.push(a)
  }
  if (positional.length !== 1) throw new Error('pass exactly one <site-dir>')
  opts.site = positional[0]
  for (const required of ['landing', 'ref', 'commit']) if (!opts[required]) throw new Error(`--${required} is required`)
  return opts
}

// ---- side effects ----------------------------------------------------------------------------------

function walkSize(dir) {
  let bytes = 0
  let files = 0
  if (!fs.existsSync(dir)) return { bytes, files }
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      const sub = walkSize(p)
      bytes += sub.bytes
      files += sub.files
    } else {
      bytes += fs.statSync(p).size
      files++
    }
  }
  return { bytes, files }
}

function node(script, args, { capture = false } = {}) {
  if (capture) return execFileSync(process.execPath, [script, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] })
  const r = spawnSync(process.execPath, [script, ...args], { stdio: 'inherit' })
  if (r.error) throw r.error
  return r.status
}

function erdSection({ site, commit, script, optional }) {
  const dir = path.join(site, 'erd')
  let backends = []
  let failure = null
  try {
    if (!fs.existsSync(script)) throw new Error(`${path.relative(REPO_ROOT, script) || script} does not exist`)
    backends = node(script, ['backends', commit], { capture: true }).split('\n').map((l) => l.trim()).filter(Boolean)
    const status = node(script, ['assemble', dir, commit])
    if (status !== 0) failure = `erd.js assemble exited with ${status}`
  } catch (e) {
    failure = String(e.message).split('\n')[0]
  }
  const rendered = backends.filter((b) => fs.existsSync(path.join(dir, b, 'index.html')))
  if (failure) {
    if (!optional) throw new Error(`the ERD assembly failed: ${failure}`)
    console.log(`::warning::the ERD assembly failed (${failure}); ERD_OPTIONAL is set, so erd/ gets a placeholder page`)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'index.html'), erdPlaceholder({ backends, rendered, reason: failure }))
  }
  return { backends, rendered, failure }
}

function main(argv) {
  const opts = parseArgs(argv)
  const site = path.resolve(opts.site)
  const indexDir = path.resolve(opts.index || path.join(REPO_ROOT, 'sites', 'index'))
  const landingDist = path.resolve(opts.landing)
  const docsDist = opts.docs && fs.existsSync(path.resolve(opts.docs)) ? path.resolve(opts.docs) : null
  const repoUrl =
    opts['repo-url'] ||
    (process.env.GITHUB_REPOSITORY
      ? `${process.env.GITHUB_SERVER_URL || 'https://github.com'}/${process.env.GITHUB_REPOSITORY}`
      : 'https://github.com/Netcracker/qubership-apihub')
  const budgetMib = Number(opts['budget-mib'] || DEFAULT_BUDGET_MIB)
  if (!Number.isFinite(budgetMib) || budgetMib <= 0) throw new Error(`--budget-mib must be a positive number, got '${opts['budget-mib']}'`)
  const budgetBytes = Math.min(Math.floor(budgetMib * MIB), SITE_LIMIT)
  const erdOptional = opts.flags.has('erd-optional') || process.env.ERD_OPTIONAL === 'true'
  const erdScript = path.resolve(opts['erd-script'] || path.join(__dirname, 'erd.js'))
  const storybookScript = path.resolve(opts['storybook-script'] || path.join(__dirname, 'storybook-site.js'))

  if (!fs.existsSync(path.join(landingDist, 'index.html'))) throw new Error(`the landing build ${landingDist} has no index.html`)
  if (opts.docs && !docsDist) console.log(`the docs build ${opts.docs} does not exist; docs/ gets the placeholder page`)

  const plan = layoutPlan({ indexFiles: fs.readdirSync(indexDir), landingDist, docsDist })
  const sources = { index: indexDir, landing: landingDist, docs: docsDist }

  fs.rmSync(site, { recursive: true, force: true })
  fs.mkdirSync(site, { recursive: true })

  // ---- 1. everything but the Storybooks ----
  for (const { from, to } of plan.copies) {
    const [kind, ...rest] = from.split('/')
    fs.cpSync(path.join(sources[kind], ...rest), path.join(site, to), { recursive: true })
  }
  if (plan.docs === 'placeholder') {
    fs.mkdirSync(path.join(site, 'docs'), { recursive: true })
    fs.writeFileSync(path.join(site, 'docs', 'index.html'), docsPlaceholder({ repoUrl, commit: opts.commit }))
  }
  fs.mkdirSync(path.join(site, 'pages', 'erd'), { recursive: true })
  fs.writeFileSync(path.join(site, 'pages', 'erd', 'index.html'), legacyErdStub())

  const erd = erdSection({ site, commit: opts.commit, script: erdScript, optional: erdOptional })

  const read = (f) => fs.readFileSync(path.join(indexDir, f), 'utf8')
  fs.writeFileSync(path.join(site, '404.html'), fillPlaceholders(read('404.html'), { STORYBOOK_404_TEXT: NOT_PUBLISHED_HTML }))
  const indexHtml = (published) =>
    fillPlaceholders(read('index.html'), {
      STORYBOOK_COMPONENTS: storybookComponents(COMPONENTS, published),
      ERD_BACKENDS: erdBackends(erd.backends, erd.rendered),
      BUILD_REF: buildRef({
        ref: opts.ref,
        commit: opts.commit,
        landingRef: opts['landing-ref'],
        landingCommit: opts['landing-commit'],
        repoUrl,
      }),
    })
  // Measured with every component listed, the longest the page gets; rewritten after step 2.
  fs.writeFileSync(path.join(site, 'index.html'), indexHtml(COMPONENTS))

  const sizes = Object.fromEntries(
    ['landing', 'docs', 'erd'].map((s) => [s, walkSize(path.join(site, s))]),
  )
  const rest = walkSize(site)
  sizes.root = {
    bytes: rest.bytes - Object.values(sizes).reduce((n, s) => n + s.bytes, 0),
    files: rest.files - Object.values(sizes).reduce((n, s) => n + s.files, 0),
  }

  // ---- 2. the Storybooks, in what is left ----
  const storybookBytes = storybookBudget(rest.bytes, { budgetBytes })
  console.log(`everything but the Storybooks: ${mib(rest.bytes)}; the Storybooks get ${mib(storybookBytes)}`)
  const status = node(storybookScript, ['assemble', site, '--budget-bytes', String(storybookBytes)])
  if (status !== 0) throw new Error(`storybook-site.js assemble exited with ${status}`)
  const published = COMPONENTS.filter((c) => fs.existsSync(path.join(site, STORYBOOK, c, 'index.html')))
  fs.writeFileSync(path.join(site, 'index.html'), indexHtml(published))

  // ---- 3. the whole site ----
  sizes[STORYBOOK] = walkSize(path.join(site, STORYBOOK))
  const total = walkSize(site)
  summarize({ sizes, total, budgetBytes, storybookBytes, opts, docs: plan.docs, erd, published })
  if (total.bytes > SITE_LIMIT) throw new Error(`the site is ${mib(total.bytes)}, over GitHub Pages' 1 GB limit`)
}

function summarize({ sizes, total, budgetBytes, storybookBytes, opts, docs, erd, published }) {
  const landingFrom =
    opts['landing-commit'] && opts['landing-commit'] !== opts.commit
      ? `\`${opts['landing-ref'] || ''}\` at \`${short(opts['landing-commit'])}\``
      : 'the same ref'
  const rows = [
    ['/', 'the navigation page, the 404 page, and the legacy ERD redirect', sizes.root],
    ['landing/', `the landing, from ${landingFrom}`, sizes.landing],
    ['docs/', docs === 'site' ? 'the docs site' : 'a placeholder: no docs site at the ref', sizes.docs],
    ['erd/', erd.failure ? `a placeholder: ${erd.failure}` : `${erd.rendered.length} ERDs`, sizes.erd],
    [`${STORYBOOK}/`, `${published.length} components, within ${mib(storybookBytes)}`, sizes[STORYBOOK]],
  ]
  const lines = [
    '### Pages site',
    '',
    `Ref \`${opts.ref}\` at \`${short(opts.commit)}\`. Site: **${mib(total.bytes)}**, ${total.files} files, ` +
      `${((total.bytes / budgetBytes) * 100).toFixed(1)}% of the ${mib(budgetBytes)} budget.`,
    '',
    '| path | content | size | files |',
    '|---|---|---:|---:|',
    ...rows.map(([p, what, s]) => `| \`${p}\` | ${what} | ${size(s.bytes)} | ${s.files} |`),
    '',
  ]
  const text = lines.join('\n') + '\n'
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, text)
  process.stdout.write(text)
}

module.exports = {
  fillPlaceholders,
  storybookBudget,
  layoutPlan,
  linkList,
  storybookComponents,
  erdBackends,
  buildRef,
  docsPlaceholder,
  erdPlaceholder,
  legacyErdStub,
  parseArgs,
  TEMPLATES,
  REST_LIMIT,
}

if (require.main === module) {
  try {
    main(process.argv.slice(2))
  } catch (e) {
    console.log(`::error::${e.message}`)
    process.exit(1)
  }
}
