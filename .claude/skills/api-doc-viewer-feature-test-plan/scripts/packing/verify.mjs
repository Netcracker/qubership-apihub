// Checks the generated packages against their cases. Usage, from the repository root, after pack.mjs:
//
//   node .agents/skills/api-doc-viewer-feature-test-plan/scripts/packing/verify.mjs --qa qa-<feature>
//
// The cases are read again from the fixtures (or built again, for a source with `build`), as pack.mjs reads them.
// Plain packages: every path item of a case equals the packed one under the case prefix, and every component of the
// case has the same value in the packed document. Diffs packages: apiDiff of a packed document pair finds exactly
// the diffs that apiDiff finds in the case pairs of the document, with the path prefixes removed. "files" packages:
// verify-files.mjs. "versions" packages: every copied file equals its source. Exits with 1 on any mismatch.
import fs from 'node:fs'
import path from 'node:path'
import { OUTPUT_ROOT, QA_ROOT, VERSIONS, diffsOf, loadConfig, packageCases, readYaml, stableStringify } from './lib.mjs'
import { checkFilesPackage } from './verify-files.mjs'

const { packages: PACKAGES } = await loadConfig()

// "/fsec-07/orders" -> "/orders" for the case prefixes of one document.
function stripPrefix(pathKey, prefixes) {
  const match = pathKey.match(/^\/([^/]+)(\/.*)$/)
  return match && prefixes.has(match[1]) ? match[2] : pathKey
}

// A fixture that adds or removes the whole "components" object (or a whole section of it) gets the same change one
// level deeper once another case of the document has components too. Both are split down to single components
// ("components.<section>.<name>"), so that they compare equal.
function splitComponentDiffs(diffs) {
  return diffs.flatMap(d => {
    const paths = d.action === 'add' ? d.afterDeclarationPaths : d.beforeDeclarationPaths
    const valueKey = d.action === 'add' ? 'afterValue' : 'beforeValue'
    const declarationKey = d.action === 'add' ? 'afterDeclarationPaths' : 'beforeDeclarationPaths'
    const [first] = paths ?? []
    if (!['add', 'remove'].includes(d.action) || !first || first[0] !== 'components' || first.length > 2 ||
      (paths ?? []).length !== 1 || typeof d[valueKey] !== 'object' || d[valueKey] === null) {
      return [d]
    }
    return splitComponentDiffs(Object.entries(d[valueKey]).map(([key, value]) =>
      ({ ...d, [valueKey]: value, [declarationKey]: [[...first, key]] })))
  })
}

function diffKeys(before, after, prefixes) {
  const strip = declarationPaths => (declarationPaths ?? []).map(p =>
    (p[0] === 'paths' && typeof p[1] === 'string' ? ['paths', stripPrefix(p[1], prefixes), ...p.slice(2)] : p))
  return splitComponentDiffs(diffsOf(before, after)).map(d => stableStringify({
    action: d.action,
    type: d.type,
    before: strip(d.beforeDeclarationPaths),
    after: strip(d.afterDeclarationPaths),
    beforeValue: d.beforeValue,
    afterValue: d.afterValue,
  }))
}

const manifest = JSON.parse(fs.readFileSync(path.join(OUTPUT_ROOT, 'manifest.json'), 'utf8'))
let failures = 0
let documentCount = 0
let diffCount = 0
const fail = message => {
  failures++
  console.error(`FAIL ${message}`)
}

for (const definition of PACKAGES) {
  // Copied samples: every file equals its source, byte for byte, and nothing else is in the package.
  if (definition.format === 'versions') {
    const expected = new Set(['README.md'])
    for (const version of definition.versions) {
      for (const file of version.files) {
        const written = path.join(OUTPUT_ROOT, definition.name, version.name, file.as)
        expected.add(path.join(version.name, file.as))
        documentCount++
        if (!fs.existsSync(written) ||
          !fs.readFileSync(written).equals(fs.readFileSync(path.join(QA_ROOT, file.from)))) {
          fail(`${definition.name}: ${version.name}/${file.as} differs from ${file.from}`)
        }
      }
    }
    const written = fs.readdirSync(path.join(OUTPUT_ROOT, definition.name), { recursive: true })
      .filter(entry => fs.statSync(path.join(OUTPUT_ROOT, definition.name, entry)).isFile())
    for (const entry of written) if (!expected.has(entry)) fail(`${definition.name}: unexpected file ${entry}`)
    continue
  }
  const cases = new Map(packageCases(definition).map(c => [c.id, c]))
  const entries = manifest.filter(c => c.package === definition.name)
  if (entries.length !== cases.size) {
    fail(`${definition.name}: ${entries.length} cases in the manifest, ${cases.size} expected`)
  }
  if (definition.format === 'files') {
    documentCount += await checkFilesPackage(definition, [...cases.values()], fail)
    continue
  }
  const byDocument = new Map()
  for (const entry of entries) {
    if (!byDocument.has(entry.document)) byDocument.set(entry.document, [])
    byDocument.get(entry.document).push(cases.get(entry.id))
  }
  for (const [fileName, documentCases] of byDocument) {
    documentCount++
    const packed = VERSIONS[definition.layout].map(v => readYaml(path.join(OUTPUT_ROOT, definition.name, v, fileName)))
    if (definition.layout === 'plain') {
      for (const c of documentCases) {
        const [source] = c.sides
        for (const [p, item] of Object.entries(source.paths)) {
          if (stableStringify(packed[0].paths[`/${c.id}${p}`]) !== stableStringify(item)) {
            fail(`${definition.name} ${c.id}: path ${p} differs from the case`)
          }
        }
        for (const [section, items] of Object.entries(source.components ?? {})) {
          for (const [name, value] of Object.entries(items)) {
            if (stableStringify(packed[0].components?.[section]?.[name]) !== stableStringify(value)) {
              fail(`${definition.name} ${c.id}: components.${section}.${name} differs from the case`)
            }
          }
        }
      }
    } else {
      const prefixes = new Set(documentCases.map(c => c.id))
      const actual = new Set(diffKeys(packed[0], packed[1], prefixes))
      const expected = new Set(documentCases.flatMap(c => diffKeys(c.sides[0], c.sides[1], prefixes)))
      diffCount += expected.size
      for (const d of expected) if (!actual.has(d)) fail(`${definition.name}/${fileName}: missing ${d}`)
      for (const d of actual) if (!expected.has(d)) fail(`${definition.name}/${fileName}: unexpected ${d}`)
    }
  }
}

console.log(`${documentCount} documents, ${manifest.length} cases, ${diffCount} diffs checked, ${failures} failures`)
process.exit(failures ? 1 : 0)
