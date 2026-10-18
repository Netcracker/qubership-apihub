#!/usr/bin/env node
/**
 * Prints the release plan as Markdown for the job summary: every component that `nx release version`
 * would bump, with from, to, bump, and reason, followed by the product version.
 *
 * The versions come from the Nx programmatic API in dry-run mode, so nothing is written, committed, or
 * tagged. The reason is "own change" when a commit of a releasing type (R6) touched the component's
 * directories since its last tag, and "dependency" otherwise: Nx then bumped it because an in-repo
 * dependency is released in the same run.
 *
 * R6 gives a component released only because of a dependency a patch bump. Nx 23 can give it more,
 * because it also reads a dependency's commits as the dependent's own (see the R0 spike report); the
 * plan lists such components under a warning.
 *
 * Usage: node tools/release/plan.js [--out <file>]
 *   The Markdown goes to <file>, else it is appended to $GITHUB_STEP_SUMMARY when that is set, else it
 *   is printed to stdout after the Nx log.
 */
const fs = require('node:fs')
const { bumpBetween, bumpFromCommits, commitTypes, listTags, readNxRelease } = require('./conventional')
const { PRODUCT_PATHS, latestProductTag, productVersion } = require('./product-version')

/** Pathspecs of a component: its project roots, minus the roots of nested projects of other components. */
function componentPaths(groupProjects, allRoots) {
  const own = new Set(groupProjects)
  const roots = [...new Set(groupProjects.map((p) => allRoots[p]))].filter(
    (r, _, all) => !all.some((o) => o !== r && r.startsWith(o + '/')),
  )
  const excluded = Object.entries(allRoots)
    .filter(([p, r]) => !own.has(p) && roots.some((root) => r !== root && r.startsWith(root + '/')))
    .map(([, r]) => `:(exclude)${r}`)
  return [...roots, ...excluded]
}

/** The bump R6 expects: the component's own bump, or patch when only a dependency moved it. */
const expectedBump = (ownBump) => (ownBump === 'none' ? 'patch' : ownBump)

function renderPlan({ mode, rows, unchanged, product }) {
  const out = [`## Release plan (${mode})`, '']
  if (!rows.length) {
    out.push('**Nothing to release.** No component has a releasing commit since its last tag.', '')
  } else {
    out.push('| Component | From | To | Bump | Reason |', '|---|---|---|---|---|')
    for (const r of rows) out.push(`| ${r.component} | ${r.from} | ${r.to} | ${r.bump} | ${r.reason} |`)
    out.push('')
  }

  if (product.next) {
    const why = product.reasons.map((r) => `${r.source} ${r.bump}`).join(', ')
    out.push(`**Product:** ${product.previous} → ${product.next} (${product.bump}; ${why})`, '')
  } else {
    out.push(`**Product:** stays at ${product.previous}; no product component or deploy/ change moves it.`, '')
  }

  const above = rows.filter((r) => r.bump !== expectedBump(r.ownBump))
  if (above.length) {
    out.push(
      '**Warning:** Nx bumps these components differently from R6, which gives the own commits\' bump,',
      'or patch for a dependency-only release:',
      '',
    )
    for (const r of above) out.push(`- ${r.component}: Nx ${r.bump}, R6 ${expectedBump(r.ownBump)}`)
    out.push('')
  }

  if (unchanged.length) out.push(`Not released: ${unchanged.join(', ')}.`, '')
  return out.join('\n')
}

async function collectPlan() {
  const { releaseVersion } = require('nx/release')
  const { createProjectGraphAsync } = require('nx/src/devkit-exports')

  const release = readNxRelease()
  const types = commitTypes(release)
  const tags = new Set(listTags())
  const graph = await createProjectGraphAsync({ exitOnError: true })
  const roots = Object.fromEntries(Object.values(graph.nodes).map((n) => [n.name, n.data.root.replace(/\\/g, '/')]))

  const { projectsVersionData } = await releaseVersion({ dryRun: true, verbose: false })

  const rows = []
  const unchanged = []
  for (const [component, group] of Object.entries(release.groups)) {
    const data = group.projects.map((p) => projectsVersionData[p]).find(Boolean)
    if (!data?.newVersion) {
      unchanged.push(component)
      continue
    }
    const pattern = group.releaseTag?.pattern ?? release.releaseTag.pattern
    const lastTag = pattern.replace('{releaseGroupName}', component).replace('{version}', data.currentVersion)
    const ownBump = bumpFromCommits(tags.has(lastTag) ? lastTag : null, componentPaths(group.projects, roots), types)
    rows.push({
      component,
      from: data.currentVersion,
      to: data.newVersion,
      bump: bumpBetween(data.currentVersion, data.newVersion),
      ownBump,
      reason: ownBump === 'none' ? 'dependency' : 'own change',
    })
  }

  const previous = latestProductTag([...tags])
  if (!previous) throw new Error('no bare X.Y.Z product tag is reachable from HEAD')
  const product = productVersion({
    previous,
    componentBumps: Object.fromEntries(rows.map((r) => [r.component, r.bump])),
    deployBump: bumpFromCommits(previous, PRODUCT_PATHS, types),
  })
  return { mode: 'dry run', rows, unchanged, product }
}

async function main(argv) {
  const outIndex = argv.indexOf('--out')
  const markdown = renderPlan(await collectPlan())
  if (outIndex >= 0) fs.writeFileSync(argv[outIndex + 1], markdown)
  else if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown)
  else process.stdout.write('\n' + markdown)
}

if (require.main === module) {
  main(process.argv.slice(2)).catch((e) => {
    process.stderr.write(`release plan: ${e.stack || e}\n`)
    process.exit(1)
  })
}

module.exports = { componentPaths, expectedBump, renderPlan }
