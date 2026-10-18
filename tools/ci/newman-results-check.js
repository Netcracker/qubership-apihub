#!/usr/bin/env node
/*
 * The Newman verdict for the E2E job.
 *
 * The collections run with `newman run -x`, which suppresses newman's exit code so that every
 * collection runs after one fails. That also means the step that runs them succeeds whatever
 * the assertions did, and for as long as the Verdict read that step, no Newman failure could
 * fail the job: run 34756454533 went green with five failed assertions. The workflow this was
 * ported from compensated by counting failures out of the HTML reports, and the port dropped
 * that count.
 *
 * This reads newman's JSON report instead, and it FAILS CLOSED. The HTML count it replaces
 * summed a number grepped out of the markup, so a changed template made the grep empty and the
 * total zero. Here, anything this cannot positively read is a failure:
 *
 *   - no collections named at all                 an empty list is not a passing check
 *   - a named collection with no report           the run died, or never reached it
 *   - a report that does not parse, or is not a newman run report
 *   - run.error set                                newman aborted the run
 *   - zero requests executed                       a report of nothing
 *   - assertion failures that do not match run.stats.assertions.failed
 *   - a failure naming a request that is not in the report's own collection
 *
 * And ANY failure fails the job. There is no list of tolerated failures: a test that fails
 * for a reason the monorepo did not cause and cannot fix is skipped in the collection, where
 * the skip is visible and reviewed, not excused here.
 *
 * Skips are reported, never hidden. newman keeps two kinds apart, and only one of them leaves
 * a trace, so both are looked for:
 *
 *   pm.test.skip("...")          the assertion is in the report with `skipped: true`
 *   pm.execution.skipRequest()   the request is simply absent from run.executions
 *
 * The second is found by comparing the collection's requests with the ones that executed.
 *
 * The request path is rebuilt from the collection tree in the report, by item id, and is the
 * text newman prints after `inside` in its CLI output. `failure.parent` is not used: it is
 * absent for a top-level request and names only the nearest folder otherwise. A failure that is
 * not an assertion (a refused connection, a script error) has no test name, so it is shown as
 * `<where>: <error name>`, for example `request: Error`.
 *
 * Usage:  newman-results-check.js <reports dir> "<collection> [collection...]"
 */
const fs = require('node:fs')
const path = require('node:path')

const [reportsDir, collectionsRaw] = process.argv.slice(2)

const errors = []
const md = (s) => String(s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')

const collections = (collectionsRaw || '')
  .split(/[\s,]+/)
  .map((s) => s.trim())
  .filter(Boolean)

if (!reportsDir || collections.length === 0) {
  console.error('usage: newman-results-check.js <reports dir> "<collections>"')
  console.error('an empty collection list is not a passing check')
  process.exit(1)
}

const failures = []
const skippedAssertions = []
const notExecuted = []
const perCollection = []

for (const c of collections) {
  const file = path.join(reportsDir, `${c}.json`)
  let report
  try {
    report = JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (e) {
    errors.push(`${c}: ${e.code === 'ENOENT' ? `no report at ${file}` : `report does not parse: ${e.message}`}`)
    continue
  }

  const run = report && report.run
  const stats = run && run.stats
  if (
    !stats ||
    !stats.requests ||
    !stats.assertions ||
    !Array.isArray(run.failures) ||
    !Array.isArray(run.executions) ||
    !report.collection
  ) {
    errors.push(`${c}: ${file} is not a newman JSON run report`)
    continue
  }
  if (run.error) {
    errors.push(`${c}: newman aborted the run: ${run.error.message || JSON.stringify(run.error)}`)
  }
  if (!(stats.requests.total > 0)) {
    errors.push(`${c}: the report records ${stats.requests.total} requests; a run of nothing is not a pass`)
  }

  // id -> "folder / folder / request", the path newman prints after `inside`
  const paths = new Map()
  const requests = []
  const walk = (items, trail) => {
    for (const item of items || []) {
      const here = [...trail, item.name]
      paths.set(item.id, here.join(' / '))
      if (Array.isArray(item.item)) walk(item.item, here)
      else requests.push(item.id)
    }
  }
  walk(report.collection.item, [])

  let assertionFailures = 0
  for (const f of run.failures) {
    const where = String(f.at || '')
    if (where.startsWith('assertion')) assertionFailures++
    const id = f.source && f.source.id
    if (!paths.has(id)) {
      errors.push(`${c}: a failure names request id ${id}, which is not in this report's collection`)
      continue
    }
    const err = f.error || {}
    failures.push({
      collection: c,
      request: paths.get(id),
      assertion: typeof err.test === 'string' && err.test ? err.test : `${where || 'unknown'}: ${err.name || 'Error'}`,
      message: err.message || '',
    })
  }
  if (assertionFailures !== stats.assertions.failed) {
    errors.push(
      `${c}: ${assertionFailures} assertion failures listed but run.stats.assertions.failed is ${stats.assertions.failed}`,
    )
  }

  const executed = new Set()
  let skipped = 0
  for (const e of run.executions) {
    const id = e.item && e.item.id
    executed.add(id)
    for (const a of e.assertions || []) {
      if (a.skipped) {
        skipped++
        skippedAssertions.push({ collection: c, request: paths.get(id) || `(id ${id})`, assertion: a.assertion })
      }
    }
  }
  const missing = requests.filter((id) => !executed.has(id))
  for (const id of missing) notExecuted.push({ collection: c, request: paths.get(id) })

  perCollection.push({
    collection: c,
    requests: requests.length,
    executed: stats.requests.total,
    requestsFailed: stats.requests.failed,
    assertions: stats.assertions.total,
    assertionsFailed: stats.assertions.failed,
    skipped,
    notExecuted: missing.length,
  })
}

// ---- report --------------------------------------------------------------------------------
const out = ['### Newman results', '']
out.push(
  '| collection | requests | executed | failed | assertions | failed | skipped | not executed |',
  '|---|---:|---:|---:|---:|---:|---:|---:|',
)
for (const p of perCollection) {
  out.push(
    `| ${md(p.collection)} | ${p.requests} | ${p.executed} | ${p.requestsFailed} | ${p.assertions} | ${p.assertionsFailed} | ${p.skipped} | ${p.notExecuted} |`,
  )
}
const table = (title, rows, cols) => {
  out.push('', `**${title}: ${rows.length}**`)
  if (rows.length === 0) return
  out.push('', `| ${cols.join(' | ')} |`, `|${cols.map(() => '---|').join('')}`)
  for (const r of rows) out.push(`| ${cols.map((k) => md(r[k])).join(' | ')} |`)
}
table('Failed', failures, ['collection', 'request', 'assertion', 'message'])
table('Skipped assertions (pm.test.skip)', skippedAssertions, ['collection', 'request', 'assertion'])
table('Requests in the collection that did not execute', notExecuted, ['collection', 'request'])
if (errors.length > 0) {
  out.push('', `**Could not verify: ${errors.length}**`, '')
  for (const e of errors) out.push(`- ${md(e)}`)
}

const text = out.join('\n')
console.log(text)
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`)

for (const e of errors) console.log(`::error::${e}`)
for (const f of failures) console.log(`::error::newman failure in ${f.collection}: ${f.request} / ${f.assertion}`)

process.exit(errors.length > 0 || failures.length > 0 ? 1 : 0)
