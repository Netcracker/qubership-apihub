'use strict'
/**
 * Facts about a pull request that a script can compute without a model.
 *
 * The reviewer model gets these facts as input, so it does not have to guess which modules a change touches or
 * whether it edits an OpenAPI file, a migration, or a deployment asset. The module list comes from the same
 * `.github/labeler.yml` that labels pull requests, so both always agree.
 *
 * Input of `computeFacts`: `files` (changed paths, forward slashes), `labelerYaml` (the text of the labeler
 * config), `title` and `body` of the pull request, and `affected` (Nx project names, or `null` when not computed).
 * Output: a plain object, see the return value of `computeFacts`. Pure: no I/O.
 */

/**
 * CI installs `yaml` next to the tools (no repository node_modules), so a plain `require` comes first. In a
 * repository checkout `yaml` is only a transitive dependency of Nx, so fall back to resolving it through Nx.
 */
function loadYaml() {
  try {
    return require('yaml')
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error
    return require(require.resolve('yaml', { paths: [require.resolve('nx/package.json')] }))
  }
}

const YAML = loadYaml()

const MODULE_PREFIX = 'module:'

/**
 * Converts a labeler glob into an anchored RegExp.
 *
 * Supported: `**` (any path, `/` included), `*` (anything except `/`), `?` (one character except `/`), and
 * `{a,b}` alternatives, which may nest. A `**` followed by `/` also matches zero directories, so the glob
 * `**` + `/go.mod` matches a top-level `go.mod`. Dotfiles match like any other file, the same as `dot: true` in
 * actions/labeler.
 */
function globToRegExp(glob) {
  if (typeof glob !== 'string') throw new TypeError(`glob must be a string, got ${typeof glob}`)
  let source = ''
  let depth = 0
  for (let i = 0; i < glob.length; i += 1) {
    const ch = glob[i]
    if (ch === '*') {
      if (glob[i + 1] === '*') {
        // Swallow the whole run of stars; `**/` also covers the case of no directory at all.
        while (glob[i + 1] === '*') i += 1
        if (glob[i + 1] === '/') {
          i += 1
          source += '(?:.*/)?'
        } else {
          source += '.*'
        }
      } else {
        source += '[^/]*'
      }
    } else if (ch === '?') {
      source += '[^/]'
    } else if (ch === '{') {
      depth += 1
      source += '(?:'
    } else if (ch === '}' && depth > 0) {
      depth -= 1
      source += ')'
    } else if (ch === ',' && depth > 0) {
      source += '|'
    } else {
      source += ch.replace(/[.+^$()|[\]\\{}]/g, '\\$&')
    }
  }
  if (depth !== 0) throw new Error(`Unbalanced '{' in glob '${glob}'`)
  return new RegExp(`^${source}$`)
}

/**
 * Reads `.github/labeler.yml` into `[{ module, matchers }]` for the `module:<name>` labels. Only
 * `any-glob-to-any-file` conditions are understood; other conditions are ignored, so a label that uses only
 * them never matches.
 */
function readModuleRules(labelerYaml) {
  const doc = YAML.parse(labelerYaml)
  if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
    throw new Error('The labeler config must be a YAML mapping of label to rules')
  }
  const rules = []
  for (const [label, entries] of Object.entries(doc)) {
    if (!label.startsWith(MODULE_PREFIX)) continue
    const matchers = []
    for (const entry of Array.isArray(entries) ? entries : []) {
      for (const condition of entry?.['changed-files'] ?? []) {
        const globs = condition?.['any-glob-to-any-file']
        if (globs === undefined || globs === null) continue
        for (const glob of [].concat(globs)) matchers.push(globToRegExp(String(glob)))
      }
    }
    rules.push({ module: label.slice(MODULE_PREFIX.length), matchers })
  }
  return rules
}

const basename = (file) => file.slice(file.lastIndexOf('/') + 1)
const DEPENDENCY_FILES = new Set(['go.mod', 'go.sum', 'package.json', 'pnpm-lock.yaml', 'pom.xml'])

const FLAG_TESTS = {
  openapi: (file) => /(?:^|\/)docs\/api\/.+\.(?:ya?ml|json)$/.test(file),
  migrations: (file) => /(?:^|\/)migrations\/.+\.sql$/.test(file),
  deploy: (file) =>
    file.startsWith('deploy/') ||
    file === 'docs/configuration-reference.md' ||
    basename(file) === 'config.template.yaml',
  workflows: (file) => /^\.github\/(?:workflows|actions)\//.test(file),
  dependencies: (file) => DEPENDENCY_FILES.has(basename(file)),
}

/** A Conventional Commits breaking marker: `type!:` or `type(scope)!:` in the title, or a footer in the body. */
function hasBreakingMarker(title, body) {
  return /^[A-Za-z]+(?:\([^)]*\))?!:/.test(title) || /^BREAKING CHANGE:/m.test(body)
}

/** Computes the facts object. Throws when `files` is not an array of strings or the labeler config is invalid. */
function computeFacts({ files, labelerYaml, title, body, affected = null }) {
  if (!Array.isArray(files) || files.some((file) => typeof file !== 'string')) {
    throw new TypeError('files must be an array of strings')
  }
  const changedFiles = [...files].sort()
  const modules = readModuleRules(labelerYaml)
    .filter((rule) => changedFiles.some((file) => rule.matchers.some((re) => re.test(file))))
    .map((rule) => rule.module)
  const flags = {}
  for (const [name, test] of Object.entries(FLAG_TESTS)) flags[name] = changedFiles.some(test)
  flags.breakingMarker = hasBreakingMarker(title ?? '', body ?? '')
  return {
    changedFiles,
    modules: [...new Set(modules)].sort(),
    affectedProjects: Array.isArray(affected) ? [...affected].sort() : null,
    flags,
  }
}

module.exports = { computeFacts, globToRegExp }
