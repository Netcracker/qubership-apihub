#!/usr/bin/env node
// The published Storybooks, assembled from the store in ghcr, and the store's cleanup.
//
//   storybook-site.js slug <branch>        the folder and pointer name for a branch
//   storybook-site.js outhash <dir>        the identity of a built Storybook, from its files
//   storybook-site.js assemble <site-dir> [--budget-bytes <n> | --budget-mib <n>]
//                                          lay out <site-dir>/storybook/ from the live branches'
//                                          pointers, within the budget (900 MiB without a flag)
//   storybook-site.js gc                   delete what no live branch needs any more
//
// The Storybooks are one section of the Pages site. tools/ci/pages-site.js lays out the other
// sections first and passes the budget they leave. The root 404.html belongs to the whole site, so
// this script only exports the Storybook text for it (NOT_PUBLISHED_HTML).
//
// A GitHub Pages deploy REPLACES THE WHOLE SITE. So a deploy never works from the files of the
// run that triggered it: it reads every live branch's pointer and rebuilds the full layout, which
// is what makes two branches deploying at once safe once pages.yml queues them.
//
// THE STORE, per component, in `ghcr.io/<owner>/storybook-<component>`:
//
//   out-<hash>     a built Storybook, keyed by its OUTPUT: a hash of its files (outHash below)
//   in-<hash>      an index, keyed by the build's INPUTS, naming the out- content they produced
//   branch-<slug>  a pointer, naming the content a branch publishes
//   src-<hash>     a built Storybook keyed by its inputs: the layout before out-/in-, still read
//
// Environment: OWNER (the ghcr namespace), GITHUB_STEP_SUMMARY (optional), DRY_RUN=true for gc.
'use strict'

const { execFileSync } = require('child_process')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const COMPONENTS = JSON.parse(fs.readFileSync(path.join(__dirname, 'storybooks.json'), 'utf8')).map(
  (c) => c.component,
)
const CONTENT_KEY = 'org.netcracker.apihub.storybook.content'
const CONTENT_TAG = /^(out|src)-[0-9a-f]{16}$/

// Always published whatever the budget, and the canonical copy of any content they share with
// another branch lives in the first of these that has it. Stable names first, so a link to a
// feature branch's folder keeps working when the feature branch goes.
const PREFERRED = ['develop', 'main', 'release']

// GitHub Pages: "Published GitHub Pages sites may be no larger than 1 GB." The budget sits below it
// so the index pages, and the protected branches growing between two deploys, have room.
const SITE_LIMIT = 1024 ** 3
const DEFAULT_BUDGET_MIB = 900

// The section's folder in the Pages site.
const SECTION = 'storybook'

// Content, indexes and untagged versions are only collected once they are this old. A CI leg
// pushes content, then an index, then a pointer, so there is a window in which fresh content is
// referenced by nothing. A cleanup inside that window would delete what a pointer is about to name.
const GC_MIN_AGE_MS = 24 * 60 * 60 * 1000

// ---- naming -----------------------------------------------------------------------------------

// ci.yml's image tags map `/` to `-`, and the folders follow the same rule so a folder name and a
// tag name agree. Anything else an OCI tag cannot hold also becomes `-`: git allows `+`, `@`, `&`
// and more in a branch name. The pointer tag is `branch-<slug>` and a tag is at most 128
// characters, so a slug longer than 120 keeps a readable prefix and a hash of the full name.
function slug(branch) {
  const s = branch.replace(/[^A-Za-z0-9._-]/g, '-')
  if (s.length <= 120) return s
  return `${s.slice(0, 103)}-${crypto.createHash('sha256').update(branch).digest('hex').slice(0, 16)}`
}

const html = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

// ---- the identity of a built Storybook ---------------------------------------------------------

// Storybook writes `project.json` with a `generatedAt` build timestamp and nothing loads it. It is
// the only file that differed between two builds of api-doc-viewer, and of ui, whose INPUT hashes
// had moved because graphapi, deep in both closures, changed a story title. Measured 2026-09-14:
// every other file byte-identical. Excluding it is what lets those two share one copy.
const VOLATILE = new Set(['project.json'])

function walk(dir, base = dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, base, out)
    else out.push(path.relative(base, p).split(path.sep).join('/'))
  }
  return out
}

// A hash of every file's path and content. Paths are included: a chunk renamed is a different
// Storybook, because the HTML names its chunks.
function outHash(dir) {
  const h = crypto.createHash('sha256')
  for (const rel of walk(dir).filter((r) => !VOLATILE.has(r)).sort()) {
    const fileHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, rel))).digest('hex')
    h.update(`${rel}\0${fileHash}\n`)
  }
  return h.digest('hex').slice(0, 16)
}

function measure(dir) {
  let bytes = 0
  const files = walk(dir)
  for (const rel of files) bytes += fs.statSync(path.join(dir, rel)).size
  return { bytes, files: files.length }
}

const mib = (n) => `${(n / 1024 / 1024).toFixed(1)} MiB`

// ---- the budget -------------------------------------------------------------------------------

// Which branches fit. Pure, so it can be tested without a registry.
//
//   order           slugs, most important first: protected branches, then most recent push
//   protectedSlugs  published whatever they cost
//   costs           slug -> [{ key, bytes }], one per component the branch has a build for; `key`
//                   is the component and output hash, so content two branches share counts once
//   budget          bytes
//
// A branch is published WHOLE or not at all: half a branch's Storybooks would be a folder list
// that looks complete and is not. A branch that does not fit is skipped and later ones still get
// their chance, so one branch that rebuilt everything cannot keep smaller, older ones off the site.
//
// A branch that adds NOTHING always fits, even once the protected branches alone are over the
// budget: every build it points at is already published, so it costs only redirect pages. Found
// by a test, where the check `bytes + 0 <= budget` left such a branch off.
function planSite({ order, protectedSlugs, costs, budget }) {
  const seen = new Set()
  const included = []
  const excluded = []
  let bytes = 0
  for (const s of order) {
    const fresh = new Map()
    for (const { key, bytes: b } of costs.get(s) || []) if (!seen.has(key)) fresh.set(key, b)
    const cost = [...fresh.values()].reduce((n, b) => n + b, 0)
    if (protectedSlugs.has(s) || cost === 0 || bytes + cost <= budget) {
      included.push(s)
      bytes += cost
      for (const k of fresh.keys()) seen.add(k)
    } else {
      excluded.push({ slug: s, cost })
    }
  }
  return { included, excluded, bytes }
}

// ---- processes --------------------------------------------------------------------------------

function run(cmd, args) {
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 256 * 1024 * 1024 })
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

// A registry answer of "does not exist" is a result. Any other failure is not, and is retried
// and then fatal: reading a transient error as "this component has no pointers" would deploy a
// site with that component's folders silently gone.
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

function owner() {
  const o = (process.env.OWNER || '').toLowerCase()
  if (!o) throw new Error('OWNER is not set')
  return o
}

const repoOf = (component) => `ghcr.io/${owner()}/storybook-${component}`

// Every branch on the remote. Never empty in a real repository, so empty is treated as a failed
// read rather than as "delete everything".
function liveBranches() {
  const out = run('git', ['ls-remote', '--heads', 'origin'])
  const branches = out
    .split('\n')
    .map((l) => l.match(/\trefs\/heads\/(.+)$/))
    .filter(Boolean)
    .map((m) => m[1])
  if (branches.length === 0) throw new Error('git ls-remote --heads returned no branches; refusing to treat that as none')
  return branches.sort()
}

// branch -> committer time of its head, the "most recent push" the budget orders by. Fetched
// commits only (`--filter=tree:0`), and shallow only where the checkout already is: deepening a
// full clone would be harmless, making one shallow would not. A failure orders by name instead,
// and says so, rather than failing the deploy over a tiebreak.
function branchDates() {
  const dates = new Map()
  try {
    const shallow = run('git', ['rev-parse', '--is-shallow-repository']).trim() === 'true'
    run('git', [
      'fetch', '--no-tags', '--filter=tree:0', ...(shallow ? ['--depth=1'] : []),
      'origin', '+refs/heads/*:refs/storybook-dates/*',
    ])
    for (const line of run('git', ['for-each-ref', '--format=%(committerdate:unix) %(refname)', 'refs/storybook-dates']).split('\n')) {
      const m = line.match(/^(\d+) refs\/storybook-dates\/(.+)$/)
      if (m) dates.set(m[2], Number(m[1]))
    }
  } catch (e) {
    console.log(`::warning::could not read branch dates, ordering feature branches by name: ${String(e.message).split('\n')[0]}`)
  }
  return dates
}

// slug -> branch for branches whose slug is unique, and the collisions, which publish nothing.
// `feature/a-b` and `feature-a/b` both map to `feature-a-b`; choosing one would publish a folder
// whose content depends on which branch pushed last, so neither is published and both are named.
function bySlug(branches) {
  const groups = new Map()
  for (const b of branches) groups.set(slug(b), [...(groups.get(slug(b)) || []), b])
  const live = new Map()
  const collisions = []
  for (const [s, bs] of groups) {
    if (bs.length === 1) live.set(s, bs[0])
    else collisions.push({ slug: s, branches: bs })
  }
  return { live, collisions, allSlugs: new Set(groups.keys()) }
}

function annotation(component, tag, key) {
  const manifest = JSON.parse(registry('oras', ['manifest', 'fetch', `${repoOf(component)}:${tag}`]))
  return (manifest.annotations || {})[key] || ''
}

function readPointer(component, s) {
  const content = annotation(component, `branch-${s}`, CONTENT_KEY)
  if (!CONTENT_TAG.test(content)) {
    throw new Error(`${repoOf(component)}:branch-${s} carries no valid ${CONTENT_KEY} (read '${content}')`)
  }
  return content
}

function listTags(component) {
  try {
    return registry('oras', ['repo', 'tags', repoOf(component)]).split('\n').filter(Boolean)
  } catch (e) {
    if (e.notFound) return []
    throw e
  }
}

// ---- assemble ---------------------------------------------------------------------------------

function pull(component, tag, dir) {
  const tmp = path.join(path.dirname(dir), `${path.basename(dir)}.pull`)
  fs.rmSync(tmp, { recursive: true, force: true })
  try {
    registry('oras', ['pull', `${repoOf(component)}:${tag}`, '-o', tmp])
    const tarball = path.join(tmp, 'storybook.tar.gz')
    if (!fs.existsSync(tarball)) throw new Error(`${component}:${tag} pulled without storybook.tar.gz`)
    fs.mkdirSync(dir, { recursive: true })
    run('tar', ['xzf', tarball, '-C', dir])
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
  // Validate what was unpacked, not that tar exited 0.
  for (const f of ['index.html', 'iframe.html', 'index.json']) {
    const p = path.join(dir, f)
    if (!fs.existsSync(p) || fs.statSync(p).size === 0) throw new Error(`${component}:${tag}: ${f} missing or empty`)
  }
}

// A branch whose content is identical to another branch's gets a redirect, not a copy. That is
// what keeps the site small: its size follows the number of DISTINCT builds, not branches. The
// redirect is rebuilt on every deploy, so it only ever exists while the two really are the same
// content. It keeps the query and fragment, which is where Storybook keeps the story.
function stub(dir, component, canonical) {
  fs.mkdirSync(dir, { recursive: true })
  for (const file of ['index.html', 'iframe.html']) {
    const target = `../${canonical}/${file}`
    fs.writeFileSync(
      path.join(dir, file),
      `<!doctype html>
<meta charset="utf-8">
<meta name="robots" content="noindex">
<title>${html(component)} Storybook</title>
<script>location.replace(${JSON.stringify(target)} + location.search + location.hash)</script>
<noscript><meta http-equiv="refresh" content="0; url=${html(target)}"></noscript>
<p>This branch's ${html(component)} Storybook is identical to <a href="${html(target)}">${html(canonical)}</a>'s.</p>
`,
    )
  }
}

function page(title, body) {
  return `<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${html(title)}</title>
<style>
  :root { color-scheme: light dark; font: 15px/1.5 system-ui, sans-serif; }
  body { max-width: 60rem; margin: 2rem auto; padding: 0 1rem; }
  table { border-collapse: collapse; width: 100%; }
  th, td { text-align: left; padding: .35rem .6rem; border-bottom: 1px solid #8884; }
  .muted { opacity: .65; }
</style>
<h1>${html(title)}</h1>
${body}
`
}

// The budget from the command line: `--budget-bytes <n>` (what pages-site.js passes) or
// `--budget-mib <n>`; 900 MiB without either. Never above the Pages limit.
function budgetFromArgs(args) {
  const flag = (name) => {
    const i = args.indexOf(name)
    if (i === -1) return undefined
    if (i + 1 >= args.length) throw new Error(`${name} needs a value`)
    return args[i + 1]
  }
  const bytes = flag('--budget-bytes')
  const mibs = flag('--budget-mib')
  if (bytes !== undefined && mibs !== undefined) throw new Error('pass --budget-bytes or --budget-mib, not both')
  const [name, raw, unit] =
    bytes !== undefined ? ['--budget-bytes', bytes, 1] : ['--budget-mib', mibs ?? String(DEFAULT_BUDGET_MIB), 1024 ** 2]
  const n = Number(raw)
  if (raw === '' || !Number.isFinite(n) || n <= 0) throw new Error(`${name} must be a positive number, got '${raw}'`)
  return Math.min(Math.floor(n * unit), SITE_LIMIT)
}

// What the root 404.html says about a missing path under storybook/: a branch that was deleted or
// left off by the budget. pages-site.js puts it into the page, and the page's script
// (sites/index/404-map.js) shows it and points the `storybook-home` link at storybookHome() of the
// failing path. The href here is the fallback for a browser without JavaScript.
const NOT_PUBLISHED_HTML = `<p>This branch or component is not published. Branches leave the site when they are deleted, and a branch
can be left off while the site is over its size budget.</p>
<p><a id="storybook-home" href="/qubership-apihub/${SECTION}/">See every published Storybook</a></p>`

// The Storybook index for a path of the site. The first path segment is the repository, which a
// project site always has, and the section's folder follows it. 404-map.js computes the same.
function storybookHome(pathname) {
  return `/${String(pathname).split('/')[1]}/${SECTION}/`
}

function assemble(siteDir, budget) {
  const outDir = path.join(siteDir, SECTION)
  fs.rmSync(outDir, { recursive: true, force: true })
  fs.mkdirSync(outDir, { recursive: true })
  // Next to the site, not in the OS temp directory: a build is renamed into place from here, and a
  // rename across filesystems fails. Not inside the site, which pages-site.js measures.
  const cache = path.join(path.dirname(siteDir), `${path.basename(siteDir)}-${SECTION}-cache`)
  fs.rmSync(cache, { recursive: true, force: true })

  const branches = liveBranches()
  const { live, collisions } = bySlug(branches)
  const dates = branchDates()

  // ---- 1. what every live branch points at, and what each distinct build is ----
  const pointers = new Map() // component -> slug -> content tag
  const builds = new Map() // `${component}:${tag}` -> { dir, key, out, bytes, files }
  const firstDir = new Map() // key -> dir of the first build with that output
  for (const component of COMPONENTS) {
    const tags = new Set(listTags(component))
    const mine = new Map()
    for (const s of live.keys()) if (tags.has(`branch-${s}`)) mine.set(s, readPointer(component, s))
    pointers.set(component, mine)
    for (const tag of new Set(mine.values())) {
      const dir = path.join(cache, component, tag)
      pull(component, tag, dir)
      // Grouped by what the files ARE, recomputed here rather than read off the tag, so builds
      // stored under the older src- layout redirect too when they are identical.
      const out = outHash(dir)
      const key = `${component}:${out}`
      if (!firstDir.has(key)) firstDir.set(key, dir)
      builds.set(`${component}:${tag}`, { dir, key, out, ...measure(dir) })
    }
  }

  // ---- 2. who fits ----
  const protectedSlugs = new Set([...live].filter(([, b]) => PREFERRED.includes(b)).map(([s]) => s))
  const rank = (s) => {
    const i = PREFERRED.indexOf(live.get(s))
    return i === -1 ? PREFERRED.length : i
  }
  const order = [...live.keys()].sort(
    (a, b) => rank(a) - rank(b) || (dates.get(live.get(b)) || 0) - (dates.get(live.get(a)) || 0) || a.localeCompare(b),
  )
  const costs = new Map(
    order.map((s) => [
      s,
      COMPONENTS.filter((c) => pointers.get(c).has(s)).map((c) => {
        const b = builds.get(`${c}:${pointers.get(c).get(s)}`)
        return { key: b.key, bytes: b.bytes }
      }),
    ]),
  )
  const plan = planSite({ order, protectedSlugs, costs, budget })
  const excludedCost = new Map(plan.excluded.map((e) => [e.slug, e.cost]))

  // ---- 3. lay it out ----
  const rows = []
  const canonicalOf = new Map() // key -> slug
  for (const s of order) {
    const branch = live.get(s)
    const date = dates.get(branch)
    for (const component of COMPONENTS) {
      const tag = pointers.get(component).get(s)
      if (!tag) {
        rows.push({ component, slug: s, branch, state: 'missing' })
        continue
      }
      const b = builds.get(`${component}:${tag}`)
      const common = { component, slug: s, branch, tag, out: b.out, date }
      if (excludedCost.has(s)) {
        rows.push({ ...common, state: 'budget', bytes: b.bytes })
        continue
      }
      if (canonicalOf.has(b.key)) {
        stub(path.join(outDir, component, s), component, canonicalOf.get(b.key))
        rows.push({ ...common, state: 'redirect', canonical: canonicalOf.get(b.key) })
        continue
      }
      canonicalOf.set(b.key, s)
      const target = path.join(outDir, component, s)
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.renameSync(firstDir.get(b.key), target)
      rows.push({ ...common, state: 'built', bytes: b.bytes, files: b.files })
    }
  }
  fs.rmSync(cache, { recursive: true, force: true })

  // ---- 4. the pages around it ----
  function cell(r, prefix) {
    if (r.state === 'missing') return '<span class="muted">not built yet</span>'
    if (r.state === 'budget') return '<span class="muted">not published: over the size budget</span>'
    const link = `<a href="${html(prefix)}${html(r.slug)}/">${html(r.slug)}/</a>`
    return r.state === 'redirect' ? `${link} <span class="muted">same as ${html(r.canonical)}</span>` : link
  }

  for (const component of COMPONENTS) {
    const mine = rows.filter((r) => r.component === component).sort((a, b) => a.slug.localeCompare(b.slug))
    if (!mine.some((r) => r.state === 'built' || r.state === 'redirect')) continue
    fs.writeFileSync(
      path.join(outDir, component, 'index.html'),
      page(
        `${component} Storybooks`,
        `<p><a href="../">All components</a></p><table><tr><th>branch</th><th>Storybook</th></tr>${mine
          .map((r) => `<tr><td>${html(r.branch)}</td><td>${cell(r, '')}</td></tr>`)
          .join('')}</table>`,
      ),
    )
  }

  const index = COMPONENTS.map((component) => {
    const mine = rows.filter((r) => r.component === component && (r.state === 'built' || r.state === 'redirect'))
    return `<h2><a href="${html(component)}/">${html(component)}</a></h2><ul>${mine
      .sort((a, b) => a.slug.localeCompare(b.slug))
      .map((r) => `<li>${html(r.branch)}: ${cell(r, `${component}/`)}</li>`)
      .join('')}</ul>`
  }).join('')
  const overBudget = plan.excluded.length
    ? `<h2>Not published: over the size budget</h2><p>The site keeps to ${html(mib(budget))}. The most recently pushed
branches are published first; these did not fit, and are published again when there is room.</p><ul>${plan.excluded
        .map((e) => `<li>${html(live.get(e.slug))}: ${html(mib(e.cost))} of Storybooks no published branch shares</li>`)
        .join('')}</ul>`
    : ''
  const clash = collisions.length
    ? `<h2>Not published: folder name collision</h2><p>These branches map to the same folder, so neither is published:</p><ul>${collisions
        .map((c) => `<li><code>${html(c.slug)}</code>: ${c.branches.map(html).join(', ')}</li>`)
        .join('')}</ul>`
    : ''
  fs.writeFileSync(path.join(outDir, 'index.html'), page('Storybooks', index + overBudget + clash))

  // No 404.html here: Pages serves only the one at the site root. pages-site.js writes it with
  // NOT_PUBLISHED_HTML, so a link to a deleted branch's folder still says what happened.

  const total = measure(outDir)
  summarize({ branches, collisions, rows, total, budget, plan, live })

  // Only the protected branches can put the Storybooks over their budget, because they are
  // published whatever they cost. Over the hard limit that is a problem nothing here can solve.
  // pages-site.js checks the whole site against the limit again.
  if (total.bytes > SITE_LIMIT) {
    console.log(`::error::the Storybooks are ${mib(total.bytes)}, over GitHub Pages' 1 GB limit even with every feature branch left off; not deploying them`)
    process.exit(1)
  }
  if (total.bytes > budget) console.log(`::warning::the protected branches alone put the Storybooks at ${mib(total.bytes)}, over their ${mib(budget)} budget`)
  if (plan.excluded.length) console.log(`::warning::${plan.excluded.length} branch(es) left off the site to keep it within ${mib(budget)}`)
}

function summarize({ branches, collisions, rows, total, budget, plan, live }) {
  const count = (state) => rows.filter((r) => r.state === state).length
  const when = (d) => (d ? new Date(d * 1000).toISOString().slice(0, 16).replace('T', ' ') : '')
  const out = [
    '### Storybook site',
    '',
    `${branches.length} live branches, ${count('built')} distinct builds, ${count('redirect')} redirects, ` +
      `${count('missing')} not built yet, ${plan.excluded.length} branches over the budget. ` +
      `Site: **${mib(total.bytes)}**, ${total.files} files: ${((total.bytes / budget) * 100).toFixed(1)}% of the ` +
      `${mib(budget)} budget, ${((total.bytes / SITE_LIMIT) * 100).toFixed(1)}% of the 1 GB limit.`,
    '',
    '| component | folder | branch | head committed | state | stored as | output | size | files |',
    '|---|---|---|---|---|---|---|---:|---:|',
    ...rows
      .sort((a, b) => a.component.localeCompare(b.component) || a.slug.localeCompare(b.slug))
      .map((r) => {
        const state = { redirect: `redirect → \`${r.canonical}/\``, budget: '**over budget**' }[r.state] || r.state
        return (
          `| ${r.component} | \`${r.slug}/\` | \`${r.branch}\` | ${when(r.date)} | ${state} | ${r.tag ? `\`${r.tag}\`` : ''} | ` +
          `${r.out ? `\`${r.out}\`` : ''} | ${r.bytes ? mib(r.bytes) : ''} | ${r.files || ''} |`
        )
      }),
  ]
  if (plan.excluded.length) {
    out.push('', `**Not published, over the ${mib(budget)} budget:**`, '')
    for (const e of plan.excluded) out.push(`- \`${live.get(e.slug)}\`: ${mib(e.cost)} of builds no published branch shares`)
  }
  if (collisions.length) {
    out.push('', '**Not published, folder name collision:**', '')
    for (const c of collisions) out.push(`- \`${c.slug}\`: ${c.branches.map((b) => `\`${b}\``).join(', ')}`)
  }
  write(out)
}

function write(lines) {
  const text = lines.join('\n') + '\n'
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, text)
  process.stdout.write(text)
}

// ---- gc ---------------------------------------------------------------------------------------

// Four kinds of version are deleted, and nothing else:
//
//   a pointer whose branch no longer exists          what makes a deleted branch leave the store
//   content no live pointer names, over 24h old      builds no branch publishes any more
//   an index whose content no live pointer names,    the lookup for those builds; while its content
//     over 24h old                                   is live it is what saves a rebuild
//   an untagged version, over 24h old                superseded pointers and indexes: re-pointing
//                                                    moves the tag and orphans the old manifest
//
// A branch left off the site by the budget still has a live pointer, so its builds are kept.
//
// ghcr refuses to delete a package's LAST version, with a message about "more than 5000
// downloads" that has nothing to do with downloads; storybook-probe.yml measured it. So the last
// version is always kept, and reported rather than attempted.
function gc() {
  const dry = process.env.DRY_RUN === 'true'
  const { allSlugs } = bySlug(liveBranches())
  const now = Date.now()
  const lines = [`### Storybook store cleanup${dry ? ' (dry run)' : ''}`, '', '| component | version | tags | action |', '|---|---|---|---|']
  let failures = 0

  for (const component of COMPONENTS) {
    const pkg = `storybook-${component}`
    let versions
    try {
      versions = registry('gh', [
        'api',
        '--paginate',
        `users/${owner()}/packages/container/${pkg}/versions`,
        '--jq',
        '.[] | {id, created_at, tags: .metadata.container.tags}',
      ])
        .split('\n')
        .filter(Boolean)
        .map((l) => JSON.parse(l))
    } catch (e) {
      if (e.notFound) continue
      throw e
    }

    // Content still named by the pointer of a branch that exists. Colliding branches count as
    // live here: their folder is unpublished, but their builds are not garbage.
    const referenced = new Set()
    for (const v of versions) {
      for (const t of v.tags) {
        if (t.startsWith('branch-') && allSlugs.has(t.slice('branch-'.length))) referenced.add(readPointer(component, t.slice('branch-'.length)))
      }
    }

    const every = (tags, prefix) => tags.length > 0 && tags.every((t) => t.startsWith(prefix))
    let remaining = versions.length
    for (const v of versions) {
      const old = now - Date.parse(v.created_at) > GC_MIN_AGE_MS
      let why = null
      if (v.tags.length === 0) {
        if (old) why = 'untagged, over 24h old'
      } else if (every(v.tags, 'branch-') && v.tags.every((t) => !allSlugs.has(t.slice('branch-'.length)))) {
        why = 'pointer for a branch that no longer exists'
      } else if (v.tags.every((t) => CONTENT_TAG.test(t)) && v.tags.every((t) => !referenced.has(t)) && old) {
        why = 'content no live branch points at, over 24h old'
      } else if (every(v.tags, 'in-') && old) {
        let target = ''
        try {
          target = annotation(component, v.tags[0], CONTENT_KEY)
        } catch (e) {
          if (!e.notFound) throw e
        }
        if (!referenced.has(target)) why = `index for content no live branch points at (${target || 'unreadable'}), over 24h old`
      }
      if (!why) continue

      const tags = v.tags.length ? v.tags.map((t) => `\`${t}\``).join(' ') : '_none_'
      if (remaining === 1) {
        lines.push(`| ${component} | ${v.id} | ${tags} | kept: the package's last version cannot be deleted (${why}) |`)
        continue
      }
      if (dry) {
        remaining--
        lines.push(`| ${component} | ${v.id} | ${tags} | would delete: ${why} |`)
        continue
      }
      try {
        registry('gh', ['api', '-X', 'DELETE', `users/${owner()}/packages/container/${pkg}/versions/${v.id}`])
        remaining--
        lines.push(`| ${component} | ${v.id} | ${tags} | deleted: ${why} |`)
      } catch (e) {
        failures++
        lines.push(`| ${component} | ${v.id} | ${tags} | **FAILED** to delete (${why}): ${String(e.message).split('\n')[0].slice(0, 160)} |`)
      }
    }
  }

  if (lines.length === 4) lines.push('| | | | nothing to delete |')
  write(lines)
  if (failures) process.exit(1)
}

// ---- main -------------------------------------------------------------------------------------

module.exports = { slug, bySlug, outHash, planSite, budgetFromArgs, storybookHome, NOT_PUBLISHED_HTML, SECTION, SITE_LIMIT }

if (require.main === module) {
  const [mode, arg, ...flags] = process.argv.slice(2)
  if (mode === 'slug' && arg) console.log(slug(arg))
  else if (mode === 'outhash' && arg) console.log(outHash(path.resolve(arg)))
  else if (mode === 'assemble' && arg) assemble(path.resolve(arg), budgetFromArgs(flags))
  else if (mode === 'gc') gc()
  else {
    console.error(
      'usage: storybook-site.js slug <branch> | outhash <dir> | assemble <site-dir> [--budget-bytes <n> | --budget-mib <n>] | gc',
    )
    process.exit(2)
  }
}
