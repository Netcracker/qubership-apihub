// Cases of QA-COMPAT-SAMPLE and of the GraphQL regression: a sample of the compatibility suites
// (frontend/compatibility-suites), read through the package API that the story generator of api-doc-viewer uses.
// Needs the built package: pnpm exec nx run compatibility-suites:build.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { REPO_ROOT, YAML } from '../lib.mjs'

const DIST = path.join(REPO_ROOT, 'frontend', 'compatibility-suites', 'dist', 'index.es.js')
if (!fs.existsSync(DIST)) throw new Error(`${DIST} does not exist: run "pnpm exec nx run compatibility-suites:build"`)
const suites = await import(pathToFileURL(DIST).href)

// Suites that the operation viewers do not render (the story generator excludes them too).
const EXCLUDED_OPENAPI_SUITES = new Set(['human-readable'])
const PAIR_GROUPS = ['3.0-3.0', '3.0-3.1', '3.1-3.0', '3.1-3.1']
const pairGroup = pair => pair.map(version => (version.startsWith('3.1') ? '3.1' : '3.0')).join('-')

// The first case of each OpenAPI suite in each OAS version pair: "cmp3031-07" is suite 7 in the 3.0 -> 3.1 group.
export function compatibilitySampleCases() {
  const { getCompatibilitySuites, getCompatibilitySuiteSpecificationVersionPairs, getCompatibilitySuite } = suites
  const OPEN_API = suites.TEST_SPEC_TYPE_OPEN_API
  const cases = []
  const suiteIds = [...getCompatibilitySuites(OPEN_API).keys()].filter(id => !EXCLUDED_OPENAPI_SUITES.has(id)).sort()
  for (const group of PAIR_GROUPS) {
    suiteIds.forEach((suiteId, index) => {
      for (const testId of getCompatibilitySuites(OPEN_API).get(suiteId)) {
        const pair = getCompatibilitySuiteSpecificationVersionPairs(OPEN_API, suiteId, testId)
          .find(candidate => pairGroup(candidate) === group)
        if (!pair) continue
        const [before, after] = getCompatibilitySuite(OPEN_API, suiteId, testId, pair).map(text => YAML.parse(text))
        cases.push({
          id: `cmp${group.replace(/\D/g, '')}-${String(index + 1).padStart(2, '0')}`,
          fixture: `compatibility-suites ${suiteId}/${testId} (${pair.join(' -> ')})`,
          title: `${suiteId}: ${testId}`,
          sides: [before, after],
        })
        break
      }
    })
  }
  return cases
}

// GraphQL compatibility cases: [{ suiteId, testId, before, after }] (SDL strings).
export function graphqlCompatibilityPairs() {
  const GRAPH_QL = suites.TEST_SPEC_TYPE_GRAPH_QL
  const pairs = []
  for (const [suiteId, testIds] of [...suites.getCompatibilitySuites(GRAPH_QL).entries()].sort()) {
    for (const testId of testIds) {
      const [before, after] = suites.getCompatibilitySuite(GRAPH_QL, suiteId, testId)
      pairs.push({ suiteId, testId, before, after })
    }
  }
  return pairs
}
