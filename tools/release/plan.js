#!/usr/bin/env node
/**
 * Prints the release plan as Markdown for the job summary: every component that `nx release version`
 * would bump, with from, to, bump, and reason, followed by the product version.
 *
 * It first writes the version plan (tools/release/version-plan.js), then asks the Nx programmatic API
 * for the versions in dry-run mode, so nothing is written, committed, or tagged besides the plan file.
 * The reason is "own change" when the plan bumps the component, and "dependency" when Nx bumps it
 * because an in-repo dependency is released in the same run. A component whose Nx bump differs from
 * R6 (the plan's bump, or patch for a dependency-only release) is listed under a warning; that would
 * be a bug in the version plan setup.
 *
 * Usage: node tools/release/plan.js [--out <file>] [--mode <label>] [--keep-plan]
 *   The Markdown goes to <file>, else it is appended to $GITHUB_STEP_SUMMARY when that is set, else it
 *   is printed to stdout after the Nx log. <label> goes into the heading (default "dry run").
 *   --keep-plan leaves .nx/version-plans/release.md behind for the `nx release version` run that
 *   follows; without it the plan file is removed.
 */
const fs = require('node:fs')
const path = require('node:path')
const { bumpBetween, bumpFromCommits, commitTypes, listTags, readNxRelease } = require('./conventional')
const { PRODUCT_PATHS, latestProductTag, productVersion } = require('./product-version')
const { PLAN_FILE, writeVersionPlan } = require('./version-plan')

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

  const off = rows.filter((r) => r.bump !== expectedBump(r.ownBump))
  if (off.length) {
    out.push(
      '**Warning:** Nx bumps these components differently from R6, which gives the own commits\' bump,',
      'or patch for a dependency-only release:',
      '',
    )
    for (const r of off) out.push(`- ${r.component}: Nx ${r.bump}, R6 ${expectedBump(r.ownBump)}`)
    out.push('')
  }

  if (unchanged.length) out.push(`Not released: ${unchanged.join(', ')}.`, '')
  return out.join('\n')
}

/** Rows of the plan from the version plan bumps and the Nx version data. */
function planRows(bumps, projectsVersionData, groups) {
  const rows = []
  const unchanged = []
  for (const { component, bump: ownBump } of bumps) {
    const data = groups[component].projects.map((p) => projectsVersionData[p]).find(Boolean)
    if (!data?.newVersion) {
      unchanged.push(component)
      continue
    }
    rows.push({
      component,
      from: data.currentVersion,
      to: data.newVersion,
      bump: bumpBetween(data.currentVersion, data.newVersion),
      ownBump,
      reason: ownBump === 'none' ? 'dependency' : 'own change',
    })
  }
  return { rows, unchanged }
}

async function collectPlan() {
  const release = readNxRelease()
  const bumps = await writeVersionPlan()
  let projectsVersionData = {}
  if (bumps.some((b) => b.bump !== 'none')) {
    const { releaseVersion } = require('nx/release')
    ;({ projectsVersionData } = await releaseVersion({ dryRun: true, verbose: false }))
  }
  const { rows, unchanged } = planRows(bumps, projectsVersionData, release.groups)

  const previous = latestProductTag(listTags())
  if (!previous) throw new Error('no bare X.Y.Z product tag is reachable from HEAD')
  const product = productVersion({
    previous,
    componentBumps: Object.fromEntries(rows.map((r) => [r.component, r.bump])),
    deployBump: bumpFromCommits(previous, PRODUCT_PATHS, commitTypes(release)),
  })
  return { rows, unchanged, product }
}

async function main(argv) {
  const option = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined)
  const outFile = option('--out')
  try {
    const markdown = renderPlan({ mode: option('--mode') ?? 'dry run', ...(await collectPlan()) })
    if (outFile) fs.writeFileSync(outFile, markdown)
    else if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown)
    else process.stdout.write('\n' + markdown)
  } finally {
    if (!argv.includes('--keep-plan')) fs.rmSync(path.dirname(PLAN_FILE), { recursive: true, force: true })
  }
}

if (require.main === module) {
  main(process.argv.slice(2)).catch((e) => {
    process.stderr.write(`release plan: ${e.stack || e}\n`)
    process.exit(1)
  })
}

module.exports = { expectedBump, planRows, renderPlan }
