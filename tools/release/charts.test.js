const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { CHARTS } = require('./artifacts')
const { REVISION, pinValues, releaseChartYaml, stageChart } = require('./charts')

const ROOT = path.join(__dirname, '..', '..')

const values = `# Section with the backend
backend:
  image:
    repository: 'ghcr.io/netcracker/qubership-apihub-backend'
    # Pin tags from the latest product release
    tag: 'dev'
  version: ''
  replicas: 1
other:
  image:
    tag: "dev" # double-quoted
`

test('pinValues writes each pin over its string and keeps every other byte', () => {
  const out = pinValues(values, [
    { path: 'backend.image.tag', version: '1.22.0' },
    { path: 'backend.version', version: '1.22.0' },
    { path: 'other.image.tag', version: '2.0.1' },
  ])
  assert.equal(
    out,
    values
      .replace("tag: 'dev'", "tag: '1.22.0'")
      .replace("version: ''", "version: '1.22.0'")
      .replace('tag: "dev"', "tag: '2.0.1'"),
  )
})

test('pinValues fails on a missing path, a non-string value, or a value that is not a version', () => {
  assert.throws(() => pinValues(values, [{ path: 'backend.image.digest', version: '1.0.0' }]), /backend\.image\.digest is not a string/)
  assert.throws(() => pinValues(values, [{ path: 'backend.replicas', version: '1.0.0' }]), /backend\.replicas is not a string/)
  assert.throws(() => pinValues(values, [{ path: 'backend.image', version: '1.0.0' }]), /backend\.image is not a string/)
  assert.throws(() => pinValues(values, [{ path: 'backend.image.tag', version: "1' x" }]), /is not a version/)
})

test('releaseChartYaml sets version, appVersion, and the revision, and checks the name', () => {
  const text = 'apiVersion: v2\nappVersion: "1.0"\nname: qubership-apihub\n# The comment\nversion: 0.0.1\n'
  const out = releaseChartYaml(text, { name: 'qubership-apihub', version: '2.16.0', revision: 'abc123' })
  assert.match(out, /^appVersion: "2\.16\.0"$/m)
  assert.match(out, /^version: 2\.16\.0$/m)
  assert.match(out, new RegExp(`^annotations:\\n  ${REVISION.replace(/\./g, '\\.')}: abc123$`, 'm'))
  assert.throws(() => releaseChartYaml(text, { name: 'other', version: '1.0.0', revision: 'x' }), /names qubership-apihub/)
})

test('stageChart pins the real charts: only the pinned lines of values.yaml change', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'charts-'))
  try {
    for (const chart of Object.values(CHARTS)) {
      const pins = Object.entries(chart.pins).flatMap(([component, paths]) =>
        paths.map((p) => ({ path: p, component, version: '9.8.7' })),
      )
      const dest = stageChart({ ...chart, version: '1.2.3', pins }, { root: ROOT, out, revision: 'f00' })
      const source = fs.readFileSync(path.join(ROOT, chart.dir, 'values.yaml'), 'utf8').split(/\r?\n/)
      const staged = fs.readFileSync(path.join(dest, 'values.yaml'), 'utf8').split(/\r?\n/)
      assert.equal(staged.length, source.length)
      const changed = staged.filter((line, i) => line !== source[i])
      assert.equal(changed.length, pins.length, chart.name)
      for (const line of changed) assert.match(line, /: '9\.8\.7'$/)
      assert.match(fs.readFileSync(path.join(dest, 'Chart.yaml'), 'utf8'), /^version: 1\.2\.3$/m)
      assert.ok(fs.existsSync(path.join(dest, 'templates')))
    }
  } finally {
    fs.rmSync(out, { recursive: true, force: true })
  }
})
