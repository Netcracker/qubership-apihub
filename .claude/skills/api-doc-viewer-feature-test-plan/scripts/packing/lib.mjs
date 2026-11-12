// Shared code of the packing generator, its check, and the results sheet: the QA plan folder, paths, YAML, the
// feature's config, and reading the fixture cases of a package.
//
// Every script takes the QA plan folder with `--qa <folder>` (or the QA_PLAN_DIR environment variable), normally
// `qa-<feature>` at the repository root. The folder holds `config/test-plan.config.mjs`; see loadConfig().
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
// apiDiff is loaded from frontend/api-diff/dist/ on first use (loadApiDiff).

function argValue(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

const qaArgument = argValue('--qa') ?? process.env.QA_PLAN_DIR
if (!qaArgument) {
  console.error('Pass the QA plan folder: --qa qa-<feature> (run from the repository root)')
  process.exit(2)
}

// The repository root: the nearest folder above the QA folder that holds pnpm-workspace.yaml.
function findRepoRoot(start) {
  for (let dir = start; ; dir = path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir
    if (path.dirname(dir) === dir) throw new Error(`No pnpm-workspace.yaml above ${start}`)
  }
}

export const QA_ROOT = path.resolve(qaArgument)
export const REPO_ROOT = findRepoRoot(QA_ROOT)
export const CONFIG_FILE = path.join(QA_ROOT, 'config', 'test-plan.config.mjs')

// The feature's config: `config/test-plan.config.mjs` default-exports an async function that receives
// `{ load, lib }` and returns `{ packages, caseLists, nfCases }`. `load('<builder>')` imports a builder module of
// scripts/packing/builders/ (json-schema, regression, compatibility, openapi-hiding-and-arrows, copied); `lib` is
// this module.
export async function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) throw new Error(`${CONFIG_FILE} does not exist`)
  const factory = (await import(pathToFileURL(CONFIG_FILE).href)).default
  const load = name => import(new URL(`./builders/${name}.mjs`, import.meta.url).href)
  const config = await factory({ load, lib: await import(import.meta.url) })
  return { packages: [], caseLists: [], nfCases: /^$/, ...config }
}

export const VIEWER_PACKAGE = path.join(REPO_ROOT, 'frontend', 'api-doc-viewer', 'packages', 'api-doc-viewer')
export const SAMPLES_ROOT = path.join(REPO_ROOT, 'frontend', 'api-doc-viewer', 'packages', 'samples')
export const OUTPUT_ROOT = path.join(QA_ROOT, 'samples', 'packages')

// The yaml library of api-doc-viewer: this folder has no package.json and no dependencies of its own.
export const YAML = createRequire(path.join(VIEWER_PACKAGE, 'package.json'))('yaml')

export const HTTP_METHODS = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'])
export const VERSIONS = { plain: ['1.0'], diffs: ['1.0', '2.0'] }

export const toPosix = p => p.split(path.sep).join('/')
export const readYaml = file => YAML.parse(fs.readFileSync(file, 'utf8'))
export const readSample = relativePath => readYaml(path.join(SAMPLES_ROOT, relativePath))
export const isObject = value => typeof value === 'object' && value !== null

// JSON with sorted keys, for comparing values. apiDiff resolves a cyclic $ref into a cyclic object, so a value
// that is one of its own ancestors is written as "[Circular]".
export function stableStringify(value, ancestors = new Set()) {
  if (!isObject(value)) return JSON.stringify(value)
  if (ancestors.has(value)) return '"[Circular]"'
  ancestors.add(value)
  const text = Array.isArray(value)
    ? `[${value.map(item => stableStringify(item, ancestors)).join(',')}]`
    : `{${Object.keys(value).sort()
      .map(k => `${JSON.stringify(k)}:${stableStringify(value[k], ancestors)}`).join(',')}}`
  ancestors.delete(value)
  return text
}

const CASE_FILE = /^(sample|before|document)\.(yaml|json|sql)$/

// Case folders hold sample.* (plain), before.* and after.* (diffs), or document.yaml, as YAML, JSON, or SQL; they may
// be nested (fields/responses/2xx/01-status-only).
export function findCaseDirs(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
  if (entries.some(e => e.isFile() && CASE_FILE.test(e.name))) return [dir]
  return entries.filter(e => e.isDirectory()).flatMap(e => findCaseDirs(path.join(dir, e.name)))
}

// The file of a case folder with the given base name and any of the case extensions: "before" -> before.json.
export function caseFile(caseDir, baseName) {
  const name = fs.readdirSync(caseDir).find(file => new RegExp(`^${baseName}\\.(yaml|json|sql)$`).test(file))
  if (!name) throw new Error(`${caseDir} has no ${baseName} file`)
  return path.join(caseDir, name)
}

// "2xx/01-status-only" -> "2xx-01"; "001-pair--summary--operation-id" -> "001"; "3.1-oneof-added" -> "3.1".
export function caseNumber(relativeDir) {
  return relativeDir.split('/').map(segment => segment.match(/^(\d+(?:\.\d+)?)-/)?.[1] ?? segment).join('-')
}

// The case folders under `root` with their case IDs "<code>-<number>". Dots become underscores (the IDs also name
// files, schemas, and GraphQL fields). Two folders with the same number (async-api-diffs/channel-server has two
// "2.3-" folders) get a letter: "2_3", then "2_3b".
export function numberedCaseDirs(root, code) {
  const seen = new Map()
  return findCaseDirs(root).map(caseDir => {
    const relative = toPosix(path.relative(root, caseDir))
    const base = `${code}-${caseNumber(relative).replace(/\./g, '_')}`
    const count = (seen.get(base) ?? 0) + 1
    seen.set(base, count)
    const letter = String.fromCharCode('a'.charCodeAt(0) + count - 1)
    return { caseDir, relative, id: count === 1 ? base : `${base}${letter}` }
  })
}

// The method template has one operation; serve it as another method, as the stories do.
function withOnlyMethod(document, method) {
  const copy = structuredClone(document)
  for (const pathItem of Object.values(copy.paths)) {
    const [current] = Object.keys(pathItem).filter(k => HTTP_METHODS.has(k))
    if (current && current !== method) {
      pathItem[method] = pathItem[current]
      delete pathItem[current]
    }
  }
  return copy
}

// Cases of one source: `{ id, fixture, sides }`, where `sides` holds one OpenAPI document (plain) or two (diffs).
// A source either names a folder of OpenAPI fixtures (`dir`) or builds its cases in code (`build`).
export function sourceCases(source, layout) {
  if (source.build) return source.build()
  const root = path.join(SAMPLES_ROOT, source.dir)
  const cases = []
  for (const caseDir of findCaseDirs(root)) {
    const fixture = toPosix(path.relative(SAMPLES_ROOT, caseDir))
    const relative = toPosix(path.relative(root, caseDir))
    if (layout === 'plain') {
      const document = readYaml(path.join(caseDir, 'sample.yaml'))
      if (source.methods) {
        source.methods.forEach((method, index) => {
          // The stories name each method case "<NN>-<method>"; the baseline lookup needs that name.
          const number = String(index + 1).padStart(2, '0')
          const baselineHint = `${path.posix.dirname(fixture)}/http-methods/${number}-${method}`
          const sides = [withOnlyMethod(document, method)]
          cases.push({ id: `${source.code}-${method}`, fixture, baselineHint, sides })
        })
      } else {
        cases.push({ id: `${source.code}-${caseNumber(relative)}`, fixture, sides: [document] })
      }
    } else {
      const before = readYaml(path.join(caseDir, 'before.yaml'))
      const after = readYaml(path.join(caseDir, 'after.yaml'))
      cases.push({ id: `${source.code}-${caseNumber(relative)}`, fixture, sides: [before, after] })
    }
  }
  return cases
}

// The file of one case side in a "files" package: an object as YAML or JSON, a string (SQL, GraphQL) as it is.
export function caseFileContent(item, side) {
  const content = item.sides[side]
  if (typeof content === 'string') return content.endsWith('\n') ? content : `${content}\n`
  return item.extension === 'json'
    ? `${JSON.stringify(content, null, 2)}\n`
    : YAML.stringify(content, { lineWidth: 0, aliasDuplicateObjects: false })
}

let apiDiff
function loadApiDiff() {
  const dist = path.join(REPO_ROOT, 'frontend', 'api-diff', 'dist', 'index.cjs.js')
  if (!fs.existsSync(dist)) throw new Error(`${dist} does not exist: run "pnpm exec nx run api-diff:build" first`)
  apiDiff ??= createRequire(import.meta.url)(dist).apiDiff
  return apiDiff
}

export const diffsOf = (before, after) => loadApiDiff()(before, after).diffs

export const MARKER_DESCRIPTION = 'QA marker: this description is new in version 2.0, so that the comparison lists ' +
  'the operation.'

// A version comparison in the portal lists only changed operations. A diffs case that apiDiff finds no change in
// (an unchanged security card, a change apiDiff does not report) gets the marker description on every operation of
// its after side, so that QA can open it; the rest of the operation stays as the fixture has it.
function addMarkerWhereUnchanged(item) {
  if (diffsOf(item.sides[0], item.sides[1]).length) return item
  const after = structuredClone(item.sides[1])
  for (const pathItem of Object.values(after.paths ?? {})) {
    for (const [method, operation] of Object.entries(pathItem ?? {})) {
      if (!HTTP_METHODS.has(method)) continue
      operation.description = operation.description
        ? `${operation.description}\n\n${MARKER_DESCRIPTION}`
        : MARKER_DESCRIPTION
    }
  }
  return { ...item, sides: [item.sides[0], after], marker: true }
}

export function packageCases(definition) {
  let cases = definition.sources.flatMap(source => sourceCases(source, definition.layout))
  // OpenAPI packages only: the marker is an OpenAPI operation description.
  if (definition.layout === 'diffs' && definition.format !== 'files') cases = cases.map(addMarkerWhereUnchanged)
  const ids = new Set()
  for (const { id, sides } of cases) {
    if (ids.has(id)) throw new Error(`${definition.name}: duplicate case id ${id}`)
    if (sides.length !== VERSIONS[definition.layout].length) {
      throw new Error(`${definition.name}: case ${id} has ${sides.length} sides`)
    }
    ids.add(id)
  }
  return cases
}
