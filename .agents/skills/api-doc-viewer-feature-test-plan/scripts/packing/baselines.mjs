// Finds the screenshot baseline of a case: the PNG that the screenshot tests of api-doc-viewer captured for the same
// fixture. QA compares the portal with it (content, not pixels: the portal is narrower).
// Baselines are named after the Storybook story: "<suite>-it-test-ts-…-<group>-<case folder>-1.png", in kebab case.
import fs from 'node:fs'
import path from 'node:path'
import { REPO_ROOT, VIEWER_PACKAGE, toPosix } from './lib.mjs'

const IT_ROOT = path.join(VIEWER_PACKAGE, 'src', 'it')

function listPngs(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return listPngs(full)
    return entry.name.endsWith('.png') ? [full] : []
  })
}

let index
function baselineIndex() {
  index ??= listPngs(IT_ROOT).map(file => ({ file, name: path.basename(file) }))
  return index
}

// Storybook-like kebab case: "3.1-oneOf" -> "3-1-one-of", "e2e" -> "e-2-e", "int4" -> "int-4".
export function kebab(text) {
  return text
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([A-Za-z])(\d)/g, '$1-$2')
    .replace(/(\d)([A-Za-z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// The leaf (case folder or case ID) and its parent group of a manifest fixture string.
function fixtureParts(fixture) {
  const compat = fixture.match(/^compatibility-suites (?:graphql\/)?([^/ ]+)\/(\S+)(?: \((\S+) -> (\S+)\))?/)
  if (compat) {
    const [, suite, test, before, after] = compat
    const pair = before ? `${before.slice(0, 3)}-${after.slice(0, 3)}`.replace(/\./g, '') : undefined
    return { leaf: test, parent: suite, extra: pair }
  }
  if (fixture.includes(', ')) {
    // Programmatic: "<module>.ts, <kind> <case id>" or "…, case <case id>" or "…, <case id> (OAS 3.1)".
    const tail = fixture.split(', ').pop().replace(/\s*\(OAS 3\.1\)$/, '').split(' ')
    return { leaf: tail.pop(), parent: tail.filter(word => word !== 'case').pop() }
  }
  const segments = fixture.replace(/^new, with the schema of /, '').split('/')
  return { leaf: segments.pop(), parent: segments.pop() }
}

// The best baseline of a fixture, as a path from the repository root, or undefined.
export function findBaseline(fixture) {
  if (!fixture || fixture === 'new') return undefined
  const { leaf, parent, extra } = fixtureParts(fixture)
  const leafSlug = kebab(leaf)
  if (!leafSlug) return undefined
  const candidates = baselineIndex().filter(({ name }) => name.endsWith(`-${leafSlug}-1.png`))
  if (!candidates.length) return undefined
  const score = ({ name, file }) =>
    (parent && name.includes(`-${kebab(parent)}-`) ? 4 : 0) +
    (extra && toPosix(file).includes(extra) ? 4 : 0) -
    (name.includes('display-mode') ? 3 : 0) -
    (name.includes('revealed') ? 1 : 0)
  const [best] = candidates.sort((a, b) => score(b) - score(a) || a.name.length - b.name.length)
  return toPosix(path.relative(REPO_ROOT, best.file))
}
