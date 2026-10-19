#!/usr/bin/env node
/**
 * The release artifacts of a release commit, for the release-artifacts job of ci.yml: which images get a
 * version tag, which npm packages are published, and the GitHub Releases with their notes, modules first
 * and the product last (Latest).
 *
 * The release is read from the tags at the commit that release-finish.yml pushed: `<component>/<version>`
 * per released component and the bare product `X.Y.Z`, whose annotation carries the sprint.
 *
 * Usage: node tools/release/artifacts.js --out <dir> [--ref <commit>] [--nearest]
 *   Writes <dir>/plan.json and <dir>/notes/*.md, and prints the plan as Markdown. --nearest (dry runs):
 *   when <commit> carries no release tag, use the nearest ancestor that carries a product tag instead.
 */
const fs = require('node:fs')
const path = require('node:path')
const { WORKSPACE_ROOT, commitsTouching, compareSemver, git, parseSemver, readNxRelease } =
  require('./conventional')
const { componentPaths } = require('./version-plan')
const { moduleNotes, productNotes } = require('./notes/minimal')

/** Component -> image name under ghcr.io/<owner>/, as built by the image jobs of ci.yml. */
const IMAGES = {
  ui: 'qubership-apihub-ui',
  'build-task-consumer': 'qubership-apihub-build-task-consumer',
  'portal-backend': 'qubership-apihub-backend',
  'api-linter-service': 'qubership-api-linter-service',
  'agents-backend': 'qubership-apihub-agents-backend',
  agent: 'qubership-apihub-agent',
  'test-service': 'qubership-apihub-test-service',
  'java-task-consumer': 'qubership-apihub-java-task-consumer',
}

const isProductTag = (tag) => parseSemver(tag)?.pre === ''

/** The release tags at a commit: `{ modules: [{ component, version, tag }], product: { version, tag } | null }`. */
function releaseTags(tags, groups) {
  const modules = []
  let product = null
  for (const tag of tags) {
    if (isProductTag(tag)) {
      product = { version: tag, tag }
      continue
    }
    const slash = tag.lastIndexOf('/')
    const component = tag.slice(0, slash)
    const version = tag.slice(slash + 1)
    if (slash > 0 && Object.hasOwn(groups, component) && parseSemver(version)?.pre === '') {
      modules.push({ component, version, tag })
    }
  }
  const order = Object.keys(groups)
  modules.sort((a, b) => order.indexOf(a.component) - order.indexOf(b.component))
  return { modules, product }
}

/** The highest stable tag of the same component (or bare product tag) below `version`, or null. */
function previousTag(prefix, version, tags) {
  const below = tags
    .filter((t) => t.startsWith(prefix))
    .map((t) => t.slice(prefix.length))
    .filter((v) => parseSemver(v)?.pre === '' && compareSemver(v, version) < 0)
    .sort(compareSemver)
  return below.length ? `${prefix}${below.at(-1)}` : null
}

/**
 * The plan. `packages[project]` is `{ name, version, private }` from the project's package.json, absent
 * for projects without one. `commitsFor(previousTag, paths)` lists the commits for the notes.
 */
function buildPlan({ release, roots, packages, tagsAtCommit, mergedTags, commitsFor, sprint, owner, repoUrl }) {
  const { modules, product } = releaseTags(tagsAtCommit, release.groups)
  const registry = `ghcr.io/${owner.toLowerCase()}`
  const plan = { images: [], npm: [], releases: [], problems: [] }

  for (const m of modules) {
    const projects = release.groups[m.component].projects
    m.previousTag = previousTag(`${m.component}/`, m.version, mergedTags)
    const artifacts = { packages: [] }
    if (IMAGES[m.component]) {
      artifacts.image = `${registry}/${IMAGES[m.component]}:${m.version}`
      plan.images.push({ component: m.component, version: m.version, image: `${registry}/${IMAGES[m.component]}` })
    }
    for (const project of projects) {
      const pkg = packages[project]
      if (!pkg || pkg.private) continue
      if (pkg.version !== m.version) {
        plan.problems.push(`${pkg.name} is at ${pkg.version} in package.json, but the tag ${m.tag} says ${m.version}`)
      }
      plan.npm.push({ component: m.component, project, root: roots[project], name: pkg.name, version: pkg.version })
      artifacts.packages.push(`${pkg.name}@${pkg.version}`)
    }
    const commits = commitsFor(m.previousTag, componentPaths(projects, roots))
    plan.releases.push({
      tag: m.tag,
      title: `${m.component} ${m.version}`,
      latest: false,
      notes: moduleNotes({ ...m, commits, artifacts, repoUrl }),
    })
  }

  if (product) {
    const previous = previousTag('', product.version, mergedTags.filter(isProductTag))
    plan.releases.push({
      tag: product.tag,
      title: `APIHUB ${product.version}`,
      latest: true,
      notes: productNotes({ ...product, previousTag: previous, sprint, components: modules, repoUrl }),
    })
  }
  return plan
}

function renderSummary(plan, commit) {
  const out = [`### Release artifacts of \`${commit.slice(0, 9)}\``, '']
  if (!plan.releases.length) return [...out, 'No release tag at this commit; nothing to publish.', ''].join('\n')
  out.push('| Release | Latest | Image | npm |', '|---|---|---|---|')
  for (const r of plan.releases) {
    const component = r.tag.includes('/') ? r.tag.slice(0, r.tag.lastIndexOf('/')) : null
    const image = plan.images.find((i) => i.component === component)
    const npm = plan.npm.filter((n) => n.component === component).map((n) => `\`${n.name}\``)
    const imageRef = image ? `\`${image.image}:${image.version}\`` : ''
    out.push(`| ${r.title} | ${r.latest ? 'yes' : 'no'} | ${imageRef} | ${npm.join(', ')} |`)
  }
  out.push('')
  for (const p of plan.problems) out.push(`- **Problem:** ${p}`)
  return out.join('\n')
}

function nearestReleaseCommit(ref) {
  try {
    const tag = git(['describe', '--tags', '--abbrev=0', '--match', '[0-9]*.[0-9]*.[0-9]*', ref]).trim()
    return git(['rev-list', '-n', '1', tag]).trim()
  } catch {
    return null
  }
}

async function main(argv) {
  const option = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined)
  const outDir = option('--out')
  if (!outDir) throw new Error('usage: artifacts.js --out <dir> [--ref <commit>] [--nearest]')
  let commit = git(['rev-parse', option('--ref') ?? 'HEAD']).trim()
  const tagsAt = (c) => git(['tag', '--points-at', c]).split(/\r?\n/).filter(Boolean)
  const release = readNxRelease()
  const found = releaseTags(tagsAt(commit), release.groups)
  if (argv.includes('--nearest') && !found.modules.length && !found.product) {
    commit = nearestReleaseCommit(commit) ?? commit
  }

  const { createProjectGraphAsync } = require('nx/src/devkit-exports')
  const graph = await createProjectGraphAsync({ exitOnError: true })
  const roots = Object.fromEntries(Object.values(graph.nodes).map((n) => [n.name, n.data.root.replace(/\\/g, '/')]))
  const packages = {}
  for (const [project, root] of Object.entries(roots)) {
    const file = path.join(WORKSPACE_ROOT, root, 'package.json')
    if (root !== '.' && fs.existsSync(file)) packages[project] = JSON.parse(fs.readFileSync(file, 'utf8'))
  }

  const tagsAtCommit = tagsAt(commit)
  const product = tagsAtCommit.find(isProductTag)
  const sprint = product
    ? git(['tag', '-l', '--format=%(contents)', product]).match(/^Sprint: (.+)$/m)?.[1]?.trim()
    : undefined
  const plan = buildPlan({
    release,
    roots,
    packages,
    tagsAtCommit,
    mergedTags: git(['tag', '--merged', commit]).split(/\r?\n/).filter(Boolean),
    commitsFor: (from, paths) => commitsTouching(from, paths, WORKSPACE_ROOT, commit),
    sprint,
    owner: process.env.OWNER || 'netcracker',
    repoUrl: process.env.REPO_URL || 'https://github.com/Netcracker/qubership-apihub',
  })

  fs.mkdirSync(path.join(outDir, 'notes'), { recursive: true })
  plan.releases.forEach((r, i) => {
    r.notesFile = path.join(outDir, 'notes', `${String(i).padStart(2, '0')}.md`)
    fs.writeFileSync(r.notesFile, r.notes)
    delete r.notes
  })
  fs.writeFileSync(path.join(outDir, 'plan.json'), JSON.stringify({ commit, tags: tagsAtCommit, ...plan }, null, 2))
  process.stdout.write(renderSummary(plan, commit) + '\n')
}

if (require.main === module) {
  main(process.argv.slice(2)).catch((e) => {
    process.stderr.write(`release artifacts: ${e.stack || e}\n`)
    process.exit(1)
  })
}

module.exports = { IMAGES, buildPlan, previousTag, releaseTags, renderSummary }
