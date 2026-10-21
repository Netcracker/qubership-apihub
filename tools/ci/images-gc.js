#!/usr/bin/env node
// Deletes the versions of the ci.yml images in ghcr that no live ref needs any more.
//
// THE PACKAGES. Every image but java-task-consumer is linked to a legacy component repository
// (qubership-apihub-backend and so on) that still pushes to it, and tags the same way: develop ->
// dev, a branch or a git tag by its name. Nothing in a tag says which repository wrote it, so each
// tag is weighed against the refs of both: the monorepo and the repository the package links to.
//
// A TAG IS DEAD when no ref of either repository maps to it. Never dead: `latest`, `next`, `dev`,
// `pull-N-merge` (closing a pull request deletes nothing), and `src-<hash>`, which is content and
// is judged by what uses it. A git tag maps to its name and to its last path segment, so a release
// image (`1.21.0`, or the monorepo's `<version>` for the tag `<component>/<version>`) stays for as
// long as its git tag does.
//
// A VERSION IS DELETED when nothing kept reaches it. The roots are the versions with a live tag,
// and an index keeps every manifest it lists: a multi-arch image is an index whose platform
// manifests are untagged versions of their own. A `src-<hash>` version stays while a kept index
// lists it (one platform) or lists its platform manifests (images.yml wraps the content in a new
// index per branch tag). An untagged or content version under 24h old stays with what it lists: a
// CI leg pushes the content first and the tag that names it after. So a deleted branch's tags go at
// once; a superseded index, and content nothing points at, a day after their last change. Deleting
// a version removes every tag on it, so a version with a live tag is never deleted.
//
// ORDER. The versions are listed before the refs: a branch created in between then has no tag in
// the listing yet, rather than a tag the refs cannot explain.
//
// THE BUDGET. A GITHUB_TOKEN on a plan without enterprise limits makes 1,000 API calls an hour per
// repository, shared with every other workflow, and the first runs face tens of thousands of
// legacy versions. A run deletes at most MAX_DELETES (default 2000) versions and never takes the
// rate limit below half; the oldest go first, and the schedule works off the rest.
//
// A RACE this accepts: CI can retag content over a day old that nothing uses (a revert) while a
// run deletes it. The branch tag then names manifests that are gone; the next push to that branch
// finds no content tag and builds the image again.
//
// Environment: OWNER (the ghcr namespace), GITHUB_REPOSITORY (the monorepo), GH_TOKEN,
// REGISTRY_USER, DRY_RUN=true to delete nothing, MAX_DELETES, GITHUB_STEP_SUMMARY (optional).
'use strict'

const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const GC_MIN_AGE_MS = 24 * 60 * 60 * 1000
const CONTENT_TAG = /^src-[0-9a-f]{16}$/
const PULL_TAG = /^pull-\d+-merge$/
const FLOATING = ['latest', 'next', 'dev']
const MANIFEST_TYPES = [
  'application/vnd.oci.image.index.v1+json',
  'application/vnd.docker.distribution.manifest.list.v2+json',
  'application/vnd.oci.image.manifest.v1+json',
  'application/vnd.docker.distribution.manifest.v2+json',
].join(', ')
// The summary lists tagged deletions one by one, up to this many; untagged ones only as counts.
const LISTED_TAGS = 300

// ---- naming -----------------------------------------------------------------------------------

// The images of ci.yml's js-images, go-images and java-images jobs: their `"image":"…"` fields.
function images(ciYml) {
  return [...new Set([...ciYml.matchAll(/"image":"([^"]+)"/g)].map((m) => m[1]))].sort()
}

// tools/ci/branch-tag.sh for one ref, byte for byte as tr and cut see it; the test runs both.
function branchTag(ref) {
  const named = ref
    .replace('refs/tags/', '')
    .replace('refs/heads/', '')
    .replace('refs/pull/', 'pull/')
    .replace(/^main$/, 'latest')
    .replace(/^develop$/, 'dev')
    .replace(/^release$/, 'next')
    .replace(/\//g, '-')
  const safe = Array.from(Buffer.from(named, 'utf8'), (b) => {
    const c = String.fromCharCode(b)
    return /[A-Za-z0-9_.-]/.test(c) ? c : '-'
  })
  return safe.join('').slice(0, 128).replace(/^[.-]/, '_')
}

// The tag of the legacy repositories' CI (docker-ci.yml in qubership-apihub-ci): no `main` ->
// `latest`, and no character replacement.
function legacyTag(ref) {
  return ref
    .replace('refs/tags/', '')
    .replace('refs/heads/', '')
    .replace('refs/pull/', 'pull/')
    .replace(/^develop$/, 'dev')
    .replace(/^release$/, 'next')
    .replace(/\//g, '-')
}

// Every tag name some ref can have produced, from full ref names (`refs/heads/…`, `refs/tags/…`).
function liveTags(refs) {
  const live = new Set(FLOATING)
  for (const ref of refs) {
    live.add(branchTag(ref))
    live.add(legacyTag(ref))
    if (ref.startsWith('refs/tags/')) live.add(ref.slice(ref.lastIndexOf('/') + 1))
  }
  return live
}

const isDead = (tag, live) => !CONTENT_TAG.test(tag) && !PULL_TAG.test(tag) && !live.has(tag)

// ---- the plan ---------------------------------------------------------------------------------

// versions: [{ id, name (the digest), updated_at, tags }]. childrenOf(digest) resolves to the
// digests an index lists, or [] for an image manifest. Returns the versions to delete, each with
// `why`.
async function plan(versions, live, childrenOf, now) {
  const reached = new Set()
  const reach = async (digest) => {
    if (reached.has(digest)) return
    reached.add(digest)
    for (const child of await childrenOf(digest)) await reach(child)
  }

  for (const v of versions) {
    const rooted = v.tags.some((t) => !CONTENT_TAG.test(t) && !isDead(t, live))
    const fresh = now - Date.parse(v.updated_at) < GC_MIN_AGE_MS && !v.tags.some((t) => isDead(t, live))
    if (rooted || fresh) await reach(v.name)
  }
  for (const v of versions) {
    if (reached.has(v.name) || !v.tags.some((t) => CONTENT_TAG.test(t))) continue
    if ((await childrenOf(v.name)).some((c) => reached.has(c))) await reach(v.name)
  }

  return versions.filter((v) => !reached.has(v.name)).map((v) => ({ ...v, why: reason(v, live) }))
}

function reason(v, live) {
  const dead = v.tags.filter((t) => isDead(t, live))
  if (dead.length) return `no branch or git tag maps to ${dead.map((t) => `\`${t}\``).join(' ')}`
  if (v.tags.length) return 'content no kept tag uses, over 24h old'
  return 'untagged and listed by no kept index, over 24h old'
}

// ---- processes --------------------------------------------------------------------------------

function run(cmd, args) {
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 256 * 1024 * 1024 })
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Retried, then fatal. A failed read is never taken for an empty answer: an empty ref list would
// make every tag dead.
async function retried(what, fn) {
  let last
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await fn()
    } catch (e) {
      last = e
      await sleep(2000 * attempt)
    }
  }
  throw new Error(`${what}: ${String(last.stderr || last.message).trim()}`)
}

function required(name) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set`)
  return value
}

const owner = () => required('OWNER').toLowerCase()
const packagePath = (pkg) => `users/${owner()}/packages/container/${pkg}`

function listVersions(pkg) {
  return retried(`list the versions of ${pkg}`, () =>
    run('gh', [
      'api', '--paginate', `${packagePath(pkg)}/versions?per_page=100`,
      '--jq', '.[] | {id, name, updated_at, tags: .metadata.container.tags}',
    ])
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l)),
  )
}

async function linkedRepository(pkg) {
  return (await retried(`read the repository of ${pkg}`, () =>
    run('gh', ['api', packagePath(pkg), '--jq', '.repository.full_name // ""']),
  )).trim()
}

// Full names of every branch and tag. A repository always has a branch, so none is a failed read.
async function remoteRefs(remote) {
  const out = await retried(`list the refs of ${remote}`, () => run('git', ['ls-remote', '--heads', '--tags', remote]))
  const refs = [...new Set(out.split('\n').map((l) => l.split('\t')[1]).filter(Boolean).map((r) => r.replace(/\^\{\}$/, '')))]
  if (!refs.some((r) => r.startsWith('refs/heads/'))) throw new Error(`git ls-remote ${remote} returned no branches; refusing to treat that as none`)
  return refs
}

// childrenOf for one package, cached. ghcr's pull tokens expire, so a 401 fetches a new one.
function manifestReader(pkg) {
  const credentials = Buffer.from(`${required('REGISTRY_USER')}:${required('GH_TOKEN')}`).toString('base64')
  let token = null
  const newToken = async () => {
    const res = await fetch(`https://ghcr.io/token?service=ghcr.io&scope=repository:${owner()}/${pkg}:pull`, {
      headers: { Authorization: `Basic ${credentials}` },
    })
    if (!res.ok) throw new Error(`ghcr token for ${pkg}: HTTP ${res.status}`)
    token = (await res.json()).token
  }
  const fetchChildren = (digest) =>
    retried(`read the manifest ${pkg}@${digest}`, async () => {
      if (!token) await newToken()
      const url = `https://ghcr.io/v2/${owner()}/${pkg}/manifests/${digest}`
      let res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: MANIFEST_TYPES } })
      if (res.status === 401) {
        await newToken()
        res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: MANIFEST_TYPES } })
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const listed = (await res.json()).manifests || []
      // An index names its children's media types, so an image manifest is known to list
      // nothing without fetching it.
      for (const m of listed) if (!/index|list/.test(m.mediaType || '') && !cache.has(m.digest)) cache.set(m.digest, Promise.resolve([]))
      return listed.map((m) => m.digest)
    })
  const cache = new Map()
  return (digest) => {
    if (!cache.has(digest)) cache.set(digest, fetchChildren(digest))
    return cache.get(digest)
  }
}

// fn over every item, `size` at a time.
async function pool(items, size, fn) {
  let next = 0
  await Promise.all(Array.from({ length: size }, async () => {
    while (next < items.length) await fn(items[next++])
  }))
}

// At most MAX_DELETES, and never below half of the hour's rate limit.
function deleteBudget() {
  const { limit, remaining } = JSON.parse(run('gh', ['api', 'rate_limit', '--jq', '.resources.core']))
  const max = Number(process.env.MAX_DELETES || 2000)
  return { budget: Math.max(0, Math.min(max, remaining - Math.ceil(limit / 2))), limit, remaining }
}

// 'refused' when ghcr will never delete this version, 'denied' when this token may not delete in
// this package; anything else is an ordinary failure.
function deleteVersion(pkg, id) {
  try {
    run('gh', ['api', '-X', 'DELETE', `${packagePath(pkg)}/versions/${id}`])
    return { result: 'deleted' }
  } catch (e) {
    const message = String(e.stderr || e.message).trim().split('\n')[0].slice(0, 200)
    if (/5000 downloads/i.test(message)) return { result: 'refused', message }
    if (/HTTP 40[13]/.test(message)) return { result: 'denied', message }
    return { result: 'failed', message }
  }
}

function write(lines) {
  const text = lines.join('\n') + '\n'
  process.stdout.write(text)
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, text)
}

// ---- gc ---------------------------------------------------------------------------------------

async function gc() {
  const dry = process.env.DRY_RUN === 'true'
  const monorepo = required('GITHUB_REPOSITORY')
  const ciYml = fs.readFileSync(path.join(__dirname, '..', '..', '.github', 'workflows', 'ci.yml'), 'utf8')
  const packages = images(ciYml)
  if (packages.length === 0) throw new Error('found no "image" in ci.yml; refusing to treat that as no images')
  const now = Date.now()

  const rows = new Map()
  const doomed = []
  let failures = 0
  for (const pkg of packages) {
    const row = { repos: [], versions: 0, gone: 0, deleted: 0, refused: 0, failed: 0, note: '' }
    rows.set(pkg, row)
    try {
      console.log(`${pkg}: listing the versions`)
      const versions = await listVersions(pkg)
      const linked = await linkedRepository(pkg)
      row.repos = [...new Set([monorepo, linked].filter(Boolean))]
      const refs = []
      for (const repo of row.repos) refs.push(...(await remoteRefs(repo === monorepo ? 'origin' : `https://github.com/${repo}.git`)))
      const live = liveTags(refs)
      console.log(`${pkg}: ${versions.length} versions, ${refs.length} refs of ${row.repos.join(', ')}`)

      // The plan reads manifests one at a time; read the ones it may need in parallel first.
      const childrenOf = manifestReader(pkg)
      const wanted = versions.filter((v) => v.tags.some((t) => !isDead(t, live)) || now - Date.parse(v.updated_at) < GC_MIN_AGE_MS)
      await pool(wanted, 16, (v) => childrenOf(v.name))
      const gone = (await plan(versions, live, childrenOf, now)).sort((a, b) => Date.parse(a.updated_at) - Date.parse(b.updated_at))
      console.log(`${pkg}: read ${wanted.length} manifests, ${gone.length} versions to delete`)
      // ghcr refuses to delete a package's last version.
      if (gone.length === versions.length) gone.pop()
      row.versions = versions.length
      row.gone = gone.length
      doomed.push(...gone.map((v) => ({ pkg, ...v })))
    } catch (e) {
      failures++
      row.note = `**FAILED**, nothing deleted: ${String(e.message).split('\n')[0].slice(0, 200)}`
    }
  }

  doomed.sort((a, b) => Date.parse(a.updated_at) - Date.parse(b.updated_at))
  const { budget, limit, remaining } = dry ? { budget: 0 } : deleteBudget()
  const listed = []
  let attempts = 0
  if (!dry) {
    for (const d of doomed) {
      const row = rows.get(d.pkg)
      if (attempts >= budget) break
      if (row.note) continue
      attempts++
      const { result, message } = deleteVersion(d.pkg, d.id)
      if (result === 'deleted') {
        row.deleted++
        if (d.tags.length && listed.length < LISTED_TAGS) listed.push(`- \`${d.pkg}\` ${d.tags.map((t) => `\`${t}\``).join(' ')}: ${d.why}`)
        console.log(`deleted ${d.pkg} ${d.id} [${d.tags.join(' ')}]: ${d.why}`)
      } else if (result === 'refused') {
        row.refused++
        console.log(`::notice::ghcr keeps ${d.pkg} ${d.id} [${d.tags.join(' ')}]: ${message}`)
      } else if (result === 'denied') {
        failures++
        row.failed++
        row.note = `**DENIED**, stopped: ${message}. Give ${monorepo} the Admin role under Manage Actions access in the package settings.`
      } else {
        failures++
        row.failed++
        console.log(`::error::could not delete ${d.pkg} ${d.id} [${d.tags.join(' ')}]: ${message}`)
      }
    }
  }

  const lines = [
    `### Image cleanup${dry ? ' (dry run)' : ''}`,
    '',
    '| image | refs from | versions | to delete | deleted | ghcr keeps | failed | note |',
    '|---|---|---|---|---|---|---|---|',
  ]
  for (const [pkg, r] of rows) {
    lines.push(`| ${pkg} | ${r.repos.join(', ')} | ${r.versions} | ${r.gone} | ${r.deleted} | ${r.refused} | ${r.failed} | ${r.note} |`)
  }
  lines.push('')
  if (dry) {
    const tagged = doomed.filter((d) => d.tags.length)
    lines.push(`Would delete ${doomed.length} versions, ${tagged.length} of them tagged:`, '')
    for (const d of tagged.slice(0, LISTED_TAGS)) lines.push(`- \`${d.pkg}\` ${d.tags.map((t) => `\`${t}\``).join(' ')}: ${d.why}`)
    if (tagged.length > LISTED_TAGS) lines.push(`- and ${tagged.length - LISTED_TAGS} more`)
  } else {
    lines.push(`Budget ${budget} deletions (rate limit ${remaining} of ${limit} left at the start); ${attempts} attempted.`)
    if (attempts < doomed.length) lines.push(`${doomed.length - attempts} versions wait for the next run.`)
    if (listed.length) lines.push('', 'Deleted tags:', '', ...listed)
  }
  write(lines)
  if (failures) process.exit(1)
}

// ---- main -------------------------------------------------------------------------------------

module.exports = { images, branchTag, legacyTag, liveTags, plan }

if (require.main === module) {
  gc().catch((e) => {
    console.error(`::error::${e.message}`)
    process.exit(1)
  })
}
