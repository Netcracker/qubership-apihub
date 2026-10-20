#!/usr/bin/env node
/**
 * Stages the Helm charts of a release plan (artifacts.js) for `helm package`: copies each chart, writes
 * the release version, appVersion, and the release commit into its Chart.yaml, and pins its values.yaml
 * to the image versions of the plan. The chart sources in git keep their development defaults.
 *
 * The values are replaced in place, at each scalar's position in the text, so the packaged values.yaml
 * keeps every comment and quote of the source and differs only in the pinned values. A pin whose path is
 * missing or is not a string fails: a renamed values section must not ship an unpinned chart.
 *
 * The commit goes into the Chart.yaml annotation `org.opencontainers.image.revision`, which
 * publish-artifacts.sh reads back from the registry to tell an earlier attempt of this release from a
 * version that is already taken.
 *
 * Usage: node tools/release/charts.js --plan <plan.json> --out <dir>
 *   Prints one tab-separated line per chart: name, version, staged directory.
 */
const fs = require('node:fs')
const path = require('node:path')
const { WORKSPACE_ROOT } = require('./conventional')

// The yaml package that Nx depends on, as in tools/ci/ci-verdict.test.js: no dependency of our own.
const YAML = require(require.resolve('yaml', { paths: [require.resolve('nx/package.json')] }))

const REVISION = 'org.opencontainers.image.revision'
const VERSION = /^[0-9A-Za-z.+-]+$/

/** values.yaml text with each `{ path, version }` pin written over the string at its dotted path. */
function pinValues(text, pins) {
  const doc = YAML.parseDocument(text)
  if (doc.errors.length) throw new Error(`values.yaml does not parse: ${doc.errors[0].message}`)
  const edits = []
  for (const pin of pins) {
    if (!VERSION.test(pin.version)) throw new Error(`${pin.path}: ${JSON.stringify(pin.version)} is not a version`)
    const node = doc.getIn(pin.path.split('.'), true)
    if (!YAML.isScalar(node) || typeof node.value !== 'string') {
      throw new Error(`${pin.path} is not a string in values.yaml; update CHARTS in tools/release/artifacts.js`)
    }
    edits.push({ start: node.range[0], end: node.range[1], text: `'${pin.version}'` })
  }
  edits.sort((a, b) => b.start - a.start)
  let out = text
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end)

  const check = YAML.parse(out)
  for (const pin of pins) {
    const got = pin.path.split('.').reduce((o, k) => o?.[k], check)
    if (got !== pin.version) throw new Error(`${pin.path} is ${JSON.stringify(got)} after pinning, not ${pin.version}`)
  }
  return out
}

/** Chart.yaml text with the release version as `version` and `appVersion`, and the commit. */
function releaseChartYaml(text, { name, version, revision }) {
  const doc = YAML.parseDocument(text)
  if (doc.get('name') !== name) throw new Error(`Chart.yaml names ${doc.get('name')}, not ${name}`)
  doc.set('version', version)
  doc.set('appVersion', version)
  doc.setIn(['annotations', REVISION], revision)
  return doc.toString({ lineWidth: 0 })
}

/** Copies `chart.dir` to `<out>/<name>` and writes the release into the copy; returns the copy. */
function stageChart(chart, { root, out, revision }) {
  const dest = path.join(out, chart.name)
  fs.rmSync(dest, { recursive: true, force: true })
  fs.cpSync(path.join(root, chart.dir), dest, { recursive: true })
  const chartFile = path.join(dest, 'Chart.yaml')
  fs.writeFileSync(chartFile, releaseChartYaml(fs.readFileSync(chartFile, 'utf8'), { ...chart, revision }))
  const valuesFile = path.join(dest, 'values.yaml')
  fs.writeFileSync(valuesFile, pinValues(fs.readFileSync(valuesFile, 'utf8'), chart.pins))
  return dest
}

function main(argv) {
  const option = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined)
  const planFile = option('--plan')
  const out = option('--out')
  if (!planFile || !out) throw new Error('usage: charts.js --plan <plan.json> --out <dir>')
  const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'))
  fs.mkdirSync(out, { recursive: true })
  for (const chart of plan.charts ?? []) {
    const dest = stageChart(chart, { root: WORKSPACE_ROOT, out, revision: plan.commit })
    process.stdout.write(`${chart.name}\t${chart.version}\t${dest}\n`)
  }
}

if (require.main === module) {
  try {
    main(process.argv.slice(2))
  } catch (e) {
    process.stderr.write(`charts: ${e.message}\n`)
    process.exit(1)
  }
}

module.exports = { REVISION, pinValues, releaseChartYaml, stageChart }
