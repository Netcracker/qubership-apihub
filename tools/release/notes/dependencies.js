/**
 * Dependency changes of a component between two refs, read from the manifests in its project roots:
 * the `require` lines of go.mod, `dependencies` and `peerDependencies` of package.json, and the parent
 * and dependency versions of pom.xml (with `${property}` resolved from the same file).
 *
 * In-repo packages are left out: their specifiers are `workspace:^` now and `dev` or `next` before the
 * migration, which says nothing; the notes list the in-repo dependencies released with the component.
 */
const MANIFESTS = ['go.mod', 'package.json', 'pom.xml']

function goRequires(text) {
  const out = new Map()
  let block = false
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\/\/.*$/, '').trim()
    if (/^require\s*\($/.test(line)) block = true
    else if (block && line === ')') block = false
    else {
      const parts = (block ? line : line.match(/^require\s+(.+)$/)?.[1] ?? '').split(/\s+/)
      if (parts.length >= 2 && parts[0]) out.set(parts[0], parts[1])
    }
  }
  return out
}

function npmDependencies(text, inRepo = () => false) {
  const pkg = JSON.parse(text)
  const out = new Map()
  for (const field of ['dependencies', 'peerDependencies']) {
    for (const [name, spec] of Object.entries(pkg[field] ?? {})) {
      if (!spec.startsWith('workspace:') && !inRepo(name)) out.set(name, spec)
    }
  }
  return out
}

const tagValue = (xml, tag) => xml.match(new RegExp(`<${tag}>\\s*([^<]*?)\\s*</${tag}>`))?.[1]

function mavenDependencies(text) {
  const xml = text.replace(/<!--[\s\S]*?-->/g, '')
  const props = {}
  for (const m of (xml.match(/<properties>([\s\S]*?)<\/properties>/)?.[1] ?? '').matchAll(/<([\w.-]+)>([^<]*)<\/\1>/g)) {
    props[m[1]] = m[2].trim()
  }
  const resolve = (v) => v.replace(/\$\{([^}]+)\}/g, (all, key) => props[key] ?? all)
  const out = new Map()
  const add = (block) => {
    const group = tagValue(block, 'groupId')
    const artifact = tagValue(block, 'artifactId')
    const version = tagValue(block, 'version')
    // No version: managed by the parent. An unresolved property such as ${project.version}: an in-repo module.
    if (!group || !artifact || !version || resolve(version).includes('${')) return
    out.set(`${group}:${artifact}`, resolve(version))
  }
  const parent = xml.match(/<parent>([\s\S]*?)<\/parent>/)
  if (parent) add(parent[1])
  for (const m of xml.matchAll(/<dependency>([\s\S]*?)<\/dependency>/g)) add(m[1])
  return out
}

/** `[{ name, from, to }]` for every dependency added, removed, or moved, sorted by name. */
function diffDependencies(before, after) {
  const names = [...new Set([...before.keys(), ...after.keys()])].sort()
  return names
    .map((name) => ({ name, from: before.get(name) ?? null, to: after.get(name) ?? null }))
    .filter((d) => d.from !== d.to)
}

/**
 * The manifests of the project roots at `ref`, as `[{ kind, text }]`. A root with no manifest of its own
 * takes the shallowest go.mod below it: before the migration the Go modules sat one directory deeper.
 */
function manifestsAt(git, ref, roots) {
  const out = []
  for (const root of roots) {
    const files = git(['ls-tree', '-r', '--name-only', ref, '--', root]).split(/\r?\n/).filter(Boolean)
    const ownManifest = MANIFESTS.some((kind) => files.includes(`${root}/${kind}`))
    for (const kind of MANIFESTS) {
      const own = `${root}/${kind}`
      let file = files.includes(own) ? own : null
      if (!file && !ownManifest && kind === 'go.mod') {
        file = files
          .filter((f) => f.endsWith('/go.mod') && !/\/(testdata|vendor)\//.test(f))
          .sort((a, b) => a.split('/').length - b.split('/').length)[0]
      }
      if (file) out.push({ kind, text: git(['show', `${ref}:${file}`]) })
    }
  }
  return out
}

/** One map for all manifests; a dependency at different versions in different manifests lists them all. */
function collect(manifests, inRepo) {
  const versions = new Map()
  for (const { kind, text } of manifests) {
    const deps =
      kind === 'go.mod' ? goRequires(text) : kind === 'package.json' ? npmDependencies(text, inRepo) : mavenDependencies(text)
    for (const [name, version] of deps) {
      if (!versions.has(name)) versions.set(name, new Set())
      versions.get(name).add(version)
    }
  }
  return new Map([...versions].map(([name, set]) => [name, [...set].sort().join(', ')]))
}

/** The dependency changes of the projects at `roots` from `from` to `to`; none when there is no `from`. */
function dependencyChanges({ git, from, to, roots, inRepo }) {
  if (!from) return []
  return diffDependencies(collect(manifestsAt(git, from, roots), inRepo), collect(manifestsAt(git, to, roots), inRepo))
}

module.exports = { dependencyChanges, diffDependencies, goRequires, manifestsAt, mavenDependencies, npmDependencies }
