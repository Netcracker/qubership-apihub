#!/usr/bin/env node
/**
 * Computes the product version: the previous bare `X.Y.Z` tag, bumped by the highest bump among the
 * product's components in this release and the commits that touched `deploy/` since that tag. This is
 * the rule of `app-apihub-rns-generator.py`; library bumps reach the product through ui and
 * build-task-consumer. The agent has its own chart and version and does not move the product version.
 *
 * Run it after `nx release version` has tagged HEAD; the component bumps are read from the
 * `<component>/<version>` tags at HEAD. The dry-run plan (plan.js) calls productVersion() with the bumps
 * of the planned release instead.
 *
 * Usage:
 *   node tools/release/product-version.js          prints the next version, or nothing if the product does not move
 *   node tools/release/product-version.js --json   prints { previous, next, bump, reasons }
 */
const {
  bumpBetween,
  bumpFromCommits,
  bumpVersion,
  commitTypes,
  compareSemver,
  git,
  highest,
  listTags,
  parseSemver,
} = require('./conventional')

const PRODUCT_COMPONENTS = [
  'portal-backend',
  'ui',
  'build-task-consumer',
  'api-linter-service',
  'agents-backend',
  'java-task-consumer',
]
const PRODUCT_PATHS = ['deploy']

const isStable = (version) => parseSemver(version)?.pre === ''

/** The highest stable bare `X.Y.Z` tag, or null. */
function latestProductTag(tags) {
  const bare = tags.filter((t) => !t.includes('/') && isStable(t))
  return bare.sort(compareSemver).at(-1) ?? null
}

/**
 * `{ component: bump }` for the product components tagged at HEAD, each against its previous tag.
 * A component without an earlier tag is measured from 0.0.0.
 */
function componentBumpsAtHead(tagsAtHead, allTags, components = PRODUCT_COMPONENTS) {
  const bumps = {}
  for (const component of components) {
    const prefix = `${component}/`
    const versions = (list) =>
      list
        .filter((t) => t.startsWith(prefix) && isStable(t.slice(prefix.length)))
        .map((t) => t.slice(prefix.length))
    const current = versions(tagsAtHead).sort(compareSemver).at(-1)
    if (!current) continue
    const previous = versions(allTags)
      .filter((v) => compareSemver(v, current) < 0)
      .sort(compareSemver)
      .at(-1)
    bumps[component] = bumpBetween(previous ?? '0.0.0', current)
  }
  return bumps
}

/**
 * @param previous        the previous product version, such as 2.15.0
 * @param componentBumps  `{ component: bump }` of this release; components outside PRODUCT_COMPONENTS are ignored
 * @param deployBump      the highest bump among the commits that touched deploy/ since `previous`
 */
function productVersion({ previous, componentBumps, deployBump }) {
  if (!parseSemver(previous)) throw new Error(`previous product version is not semver: ${previous}`)
  const reasons = []
  for (const component of PRODUCT_COMPONENTS) {
    const bump = componentBumps[component] ?? 'none'
    if (bump !== 'none') reasons.push({ source: component, bump })
  }
  if (deployBump && deployBump !== 'none') reasons.push({ source: 'deploy', bump: deployBump })
  const bump = highest(reasons.map((r) => r.bump))
  return { previous, next: bump === 'none' ? null : bumpVersion(previous, bump), bump, reasons }
}

function main(argv) {
  const tags = listTags()
  const previous = latestProductTag(tags)
  if (!previous) throw new Error('no bare X.Y.Z product tag is reachable from HEAD')
  const tagsAtHead = git(['tag', '--points-at', 'HEAD']).split(/\r?\n/).filter(Boolean)
  const productTagAtHead = latestProductTag(tagsAtHead)
  if (productTagAtHead) throw new Error(`HEAD already carries the product tag ${productTagAtHead}`)
  const result = productVersion({
    previous,
    componentBumps: componentBumpsAtHead(tagsAtHead, tags),
    deployBump: bumpFromCommits(previous, PRODUCT_PATHS, commitTypes()),
  })
  if (argv.includes('--json')) process.stdout.write(JSON.stringify(result, null, 2) + '\n')
  else if (result.next) process.stdout.write(result.next + '\n')
}

if (require.main === module) {
  try {
    main(process.argv.slice(2))
  } catch (e) {
    process.stderr.write(`product-version: ${e.message}\n`)
    process.exit(1)
  }
}

module.exports = { PRODUCT_COMPONENTS, PRODUCT_PATHS, componentBumpsAtHead, latestProductTag, productVersion }
