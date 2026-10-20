#!/usr/bin/env node
/**
 * The release artifacts of a release commit, for the release-artifacts job of ci.yml: which images get a
 * version tag, which npm packages are published, and the GitHub Releases with their notes, modules first
 * and the product last (Latest).
 *
 * The release is read from the tags at the commit that release-finish.yml pushed: `<component>/<version>`
 * per released component and the bare product `X.Y.Z`, whose annotation carries the sprint.
 *
 * The notes (tools/release/notes/) read GitHub: GH_TOKEN for the pull requests and issues of the
 * component changes, PROJECT_READ_TOKEN for the sprint's work items on Project 9. Without
 * PROJECT_READ_TOKEN, or when the sprint has no work item, the plan reports a problem, which stops a real
 * run in `publish-artifacts.sh check` before anything is published.
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
const { PRODUCT_COMPONENTS } = require('./product-version')
const { groupChanges } = require('./notes/changes')
const { dependencyChanges } = require('./notes/dependencies')
const { createClient, parseRepoUrl } = require('./notes/github')
const { moduleNotes } = require('./notes/module')
const { productNotes } = require('./notes/product')
const { WORK_SECTIONS, fetchItems, workItemRows } = require('./notes/project')
const { createResolver } = require('./notes/pull-requests')

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

/** Component -> its Helm chart directory, linked from its notes. */
const CHARTS = { agent: 'backend/agent/helm-templates/qubership-apihub-agent' }

const isProductTag = (tag) => parseSemver(tag)?.pre === ''

// GitHub refuses a release body over 125,000 characters; the releases step runs after images and npm.
const MAX_BODY = 120000

function cut(lines, keep, marker) {
  return lines.length > keep ? [...lines.slice(0, keep), marker(lines.length - keep)] : lines
}

/** The render data with every list cut to `keep` entries and a line that says how many were left out. */
function shorten(data, keep) {
  const more = (n) => `- … and ${n} more; see the full changelog.`
  const out = { ...data }
  if (data.changes) {
    out.changes = Object.fromEntries(Object.entries(data.changes).map(([k, lines]) => [k, cut(lines, keep, more)]))
  }
  if (data.dependencies?.length > keep) {
    out.dependencies = [...data.dependencies.slice(0, keep), { more: data.dependencies.length - keep }]
  }
  if (data.breaking) out.breaking = data.breaking.map((b) => ({ ...b, lines: cut(b.lines, keep, more) }))
  if (data.workItems) {
    out.workItems = { ...data.workItems }
    for (const s of WORK_SECTIONS) {
      if (data.workItems[s]) out.workItems[s] = cut(data.workItems[s], keep, (n) => `| … and ${n} more | | | |`)
    }
  }
  return out
}

/** Renders the notes, shortening the lists until the body fits; a body that never fits is a plan problem. */
function fitNotes(render, problems, tag, data) {
  let notes = render(data)
  for (const keep of [200, 100, 50, 20, 5]) {
    if (notes.length <= MAX_BODY) return notes
    notes = render(shorten(data, keep))
  }
  if (notes.length > MAX_BODY) problems.push(`The notes of ${tag} have ${notes.length} characters, over ${MAX_BODY}.`)
  return notes
}

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

const stableVersions = (prefix, tags) =>
  tags
    .filter((t) => t.startsWith(prefix))
    .map((t) => t.slice(prefix.length))
    .filter((v) => parseSemver(v)?.pre === '')
    .sort(compareSemver)

/** The highest stable tag of the same component (or bare product tag) below `version`, or null. */
function previousTag(prefix, version, tags) {
  const below = stableVersions(prefix, tags).filter((v) => compareSemver(v, version) < 0)
  return below.length ? `${prefix}${below.at(-1)}` : null
}

/** The highest stable version of a component among `tags`, or null. */
const latestVersion = (component, tags) => stableVersions(`${component}/`, tags).at(-1) ?? null

/** `{ component: [components it depends on] }` from the project graph's dependencies between projects. */
function componentDependencies(groups, graphDependencies) {
  const groupOf = {}
  for (const [component, group] of Object.entries(groups)) for (const p of group.projects) groupOf[p] = component
  const out = {}
  for (const [component, group] of Object.entries(groups)) {
    const deps = new Set()
    for (const p of group.projects) {
      for (const d of graphDependencies[p] ?? []) {
        const target = groupOf[d.target]
        if (target && target !== component) deps.add(target)
      }
    }
    out[component] = [...deps]
  }
  return out
}

/**
 * The plan. `packages[project]` is `{ name, version, private }` from the project's package.json, absent
 * for projects without one. The notes come from injected readers, so tests need neither git nor GitHub:
 *   commitsFor(previousTag, paths)          the commits of a component since its previous tag
 *   resolveChanges(commits)                 pull-requests.js `resolve()`
 *   dependencyChangesFor({ from, roots })   dependencies.js `dependencyChanges()` up to the commit
 *   tagsMergedInto(ref)                     the tags merged into a ref, for the product's components table
 *   workItemsFor(sprint)                    project.js `workItemRows()`, or null when it cannot be read
 */
async function buildPlan({
  release,
  roots,
  packages,
  dependsOn,
  tagsAtCommit,
  mergedTags,
  commitsFor,
  resolveChanges,
  dependencyChangesFor,
  tagsMergedInto,
  workItemsFor,
  sprint,
  owner,
  repoUrl,
}) {
  const { modules, product } = releaseTags(tagsAtCommit, release.groups)
  const registry = `ghcr.io/${owner.toLowerCase()}`
  const plan = { images: [], npm: [], releases: [], problems: [] }
  const breaking = []

  for (const m of modules) {
    const projects = release.groups[m.component].projects
    m.previousTag = previousTag(`${m.component}/`, m.version, mergedTags)
    const artifacts = { packages: [], chart: CHARTS[m.component] }
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
    const paths = componentPaths(projects, roots)
    const changes = groupChanges(await resolveChanges(commitsFor(m.previousTag, paths)), repoUrl)
    breaking.push({ component: m.component, version: m.version, lines: changes.breaking })
    const released = modules
      .filter((d) => (dependsOn[m.component] ?? []).includes(d.component))
      .map((d) => ({
        component: d.component,
        from: previousTag(`${d.component}/`, d.version, mergedTags)?.slice(d.component.length + 1) ?? null,
        to: d.version,
      }))
    const projectRoots = [...new Set(projects.map((p) => roots[p]))]
    plan.releases.push({
      tag: m.tag,
      title: `${m.component} ${m.version}`,
      latest: false,
      notes: fitNotes(moduleNotes, plan.problems, m.tag, {
        ...m,
        root: paths[0],
        artifacts,
        changes,
        dependencies: dependencyChangesFor({ from: m.previousTag, roots: projectRoots }),
        released,
        repoUrl,
      }),
    })
  }

  if (product) {
    const previous = previousTag('', product.version, mergedTags.filter(isProductTag))
    const before = previous ? tagsMergedInto(previous) : []
    const releasedNow = new Set(modules.map((m) => m.component))
    const components = Object.keys(release.groups).map((component) => ({
      component,
      version: latestVersion(component, mergedTags),
      previous: latestVersion(component, before),
      released: releasedNow.has(component),
    }))
    const image = (component) => ({
      component,
      image: `${registry}/${IMAGES[component]}`,
      version: latestVersion(component, mergedTags),
    })

    let workItems = null
    let workItemsNote
    if (!sprint) {
      workItemsNote = `The product tag ${product.tag} names no sprint, so its work items are not listed.`
      plan.problems.push(workItemsNote)
    } else {
      workItems = await workItemsFor(sprint)
      if (!workItems) {
        workItemsNote = `PROJECT_READ_TOKEN is not set, so the work items of sprint ${sprint} are not listed.`
        plan.problems.push(workItemsNote)
      } else if (workItems.hidden) {
        plan.problems.push(
          `PROJECT_READ_TOKEN cannot read ${workItems.hidden} Project 9 card(s) of sprint ${sprint}; ` +
            'give it access to their repositories.',
        )
      } else if (!WORK_SECTIONS.some((s) => workItems[s].length)) {
        plan.problems.push(`No Project 9 card of sprint ${sprint} is Done or In Test; check the sprint name.`)
      }
    }

    plan.releases.push({
      tag: product.tag,
      title: `APIHUB ${product.version}`,
      latest: true,
      notes: fitNotes(productNotes, plan.problems, product.tag, {
        ...product,
        previousTag: previous,
        sprint,
        images: PRODUCT_COMPONENTS.map(image),
        components,
        agent: { ...image('agent'), chart: CHARTS.agent },
        workItems,
        workItemsNote,
        breaking,
        repoUrl,
      }),
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
  const tagsMergedInto = (ref) => git(['tag', '--merged', ref]).split(/\r?\n/).filter(Boolean)
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
  const inRepo = new Set(Object.values(packages).map((p) => p.name))

  const repoUrl = process.env.REPO_URL || 'https://github.com/Netcracker/qubership-apihub'
  const tagsAtCommit = tagsAt(commit)
  const product = tagsAtCommit.find(isProductTag)
  const sprint = product
    ? git(['tag', '-l', '--format=%(contents)', product]).match(/^Sprint: (.+)$/m)?.[1]?.trim()
    : undefined
  // Clients are created on first use: a commit without release tags needs no token.
  let resolver
  const resolveChanges = async (commits) => {
    if (!commits.length) return []
    resolver ??= createResolver(createClient({ token: process.env.GH_TOKEN }), parseRepoUrl(repoUrl))
    return resolver.resolve(commits)
  }
  const workItemsFor = async (name) => {
    if (!process.env.PROJECT_READ_TOKEN) return null
    return workItemRows(await fetchItems(createClient({ token: process.env.PROJECT_READ_TOKEN })), name)
  }

  const plan = await buildPlan({
    release,
    roots,
    packages,
    dependsOn: componentDependencies(release.groups, graph.dependencies),
    tagsAtCommit,
    mergedTags: tagsMergedInto(commit),
    commitsFor: (from, paths) => commitsTouching(from, paths, WORKSPACE_ROOT, commit),
    resolveChanges,
    dependencyChangesFor: ({ from, roots: projectRoots }) =>
      dependencyChanges({ git: (args) => git(args), from, to: commit, roots: projectRoots, inRepo: (n) => inRepo.has(n) }),
    tagsMergedInto,
    workItemsFor,
    sprint,
    owner: process.env.OWNER || 'netcracker',
    repoUrl,
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

module.exports = { CHARTS, IMAGES, MAX_BODY, buildPlan, componentDependencies, latestVersion, previousTag, releaseTags, renderSummary }
