'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { selectFindings, placeFindings, renderSummary, findingBody } = require('./review')

const finding = (id, severity, extra = {}) => ({
  id,
  file: 'src/a.go',
  line: 2,
  severity,
  category: 'correctness',
  title: `Title ${id}`,
  body: `Body ${id}`,
  ...extra,
})

test('selectFindings drops rejected findings and keeps confirmed and plausible ones', () => {
  const findings = [finding('f1', 'major'), finding('f2', 'major'), finding('f3', 'major')]
  const verdicts = [
    { id: 'f1', verdict: 'confirmed', reason: 'seen in the diff' },
    { id: 'f2', verdict: 'rejected', reason: 'handled upstream' },
    { id: 'f3', verdict: 'plausible', reason: 'cannot prove it' },
  ]
  const result = selectFindings(findings, verdicts)
  assert.deepEqual(result.map((f) => [f.id, f.verdict, f.verdictReason]), [
    ['f1', 'confirmed', 'seen in the diff'],
    ['f3', 'plausible', 'cannot prove it'],
  ])
})

test('selectFindings treats a finding without a verdict as plausible', () => {
  const result = selectFindings([finding('f1', 'minor')], [{ id: 'other', verdict: 'rejected', reason: 'x' }])
  assert.equal(result.length, 1)
  assert.equal(result[0].verdict, 'plausible')
  assert.equal(result[0].verdictReason, '')
  assert.equal(selectFindings([finding('f1', 'minor')], []).length, 1)
})

test('selectFindings sorts by severity: blocker, major, minor, nit', () => {
  const findings = [
    finding('n', 'nit'),
    finding('m', 'minor'),
    finding('b', 'blocker'),
    finding('j', 'major'),
    finding('m2', 'minor'),
  ]
  assert.deepEqual(selectFindings(findings, []).map((f) => f.id), ['b', 'j', 'm', 'm2', 'n'])
})

test('selectFindings keeps the finding fields and does not mutate its input', () => {
  const original = finding('f1', 'major')
  const copy = structuredClone(original)
  const [result] = selectFindings([original], [{ id: 'f1', verdict: 'confirmed', reason: 'ok' }])
  assert.deepEqual(original, copy)
  assert.equal(result.title, 'Title f1')
  assert.equal(result.line, 2)
})

test('selectFindings returns an empty list for no findings', () => {
  assert.deepEqual(selectFindings([], []), [])
  assert.deepEqual(selectFindings([finding('f1', 'nit')], [{ id: 'f1', verdict: 'rejected', reason: 'x' }]), [])
})

const PATCH = ['@@ -1,3 +1,4 @@', ' one', '+two', ' three', ' four'].join('\n')
const FILES = [
  { filename: 'src/a.go', patch: PATCH },
  { filename: 'bin/logo.png' },
]

test('placeFindings puts a finding on a line of the diff inline', () => {
  const { inline, other } = placeFindings([finding('f1', 'major', { line: 2 })], FILES)
  assert.deepEqual(inline.map((f) => f.id), ['f1'])
  assert.deepEqual(other, [])
})

test('placeFindings accepts context lines and the last line of a hunk', () => {
  const { inline } = placeFindings([finding('a', 'nit', { line: 1 }), finding('b', 'nit', { line: 4 })], FILES)
  assert.deepEqual(inline.map((f) => f.id), ['a', 'b'])
})

test('placeFindings sends a null line, an unknown file, and a line outside the hunks to other', () => {
  const findings = [
    finding('null-line', 'major', { line: null }),
    finding('unknown-file', 'major', { file: 'src/missing.go' }),
    finding('outside', 'major', { line: 99 }),
    finding('before', 'major', { line: 0 }),
    finding('binary', 'major', { file: 'bin/logo.png', line: 1 }),
    finding('ok', 'major', { line: 3 }),
  ]
  const { inline, other } = placeFindings(findings, FILES)
  assert.deepEqual(inline.map((f) => f.id), ['ok'])
  assert.deepEqual(other.map((f) => f.id), ['null-line', 'unknown-file', 'outside', 'before', 'binary'])
})

test('placeFindings keeps the order of the findings in both lists', () => {
  const findings = [
    finding('o1', 'major', { line: null }),
    finding('i1', 'major', { line: 1 }),
    finding('o2', 'major', { line: 50 }),
    finding('i2', 'major', { line: 2 }),
  ]
  const { inline, other } = placeFindings(findings, FILES)
  assert.deepEqual(inline.map((f) => f.id), ['i1', 'i2'])
  assert.deepEqual(other.map((f) => f.id), ['o1', 'o2'])
})

test('placeFindings with no files sends everything to other', () => {
  const { inline, other } = placeFindings([finding('f1', 'major')], [])
  assert.deepEqual(inline, [])
  assert.equal(other.length, 1)
})

test('findingBody shows severity, title, and body; plausible findings say so', () => {
  const confirmed = findingBody({ ...finding('f1', 'blocker'), verdict: 'confirmed' })
  assert.equal(confirmed, '🛑 **blocker**: Title f1\n\nBody f1')
  const plausible = findingBody({ ...finding('f2', 'minor'), verdict: 'plausible' })
  assert.equal(plausible, '🟡 **minor** (plausible, not confirmed): Title f2\n\nBody f2')
  assert.match(findingBody({ ...finding('f3', 'major'), verdict: 'confirmed' }), /^🔴 \*\*major\*\*/)
  assert.match(findingBody({ ...finding('f4', 'nit'), verdict: 'confirmed' }), /^⚪ \*\*nit\*\*/)
})

const reviewResult = (overrides = {}) => ({
  summary: 'Adds a search box.',
  risk: 'low',
  riskReason: 'UI only.',
  impact: {
    modules: ['ui'],
    images: ['portal-ui'],
    restApi: { changed: false, breaking: false, notes: 'No change.' },
    database: { changed: true, breaking: true, notes: 'Drops a column.' },
    deploy: { changed: false, notes: 'None.' },
    e2e: { collections: ['Auth'], notes: 'Run it.' },
  },
  findings: [],
  ...overrides,
})

const render = (overrides = {}) =>
  renderSummary({
    review: reviewResult(),
    other: [],
    inlineCount: 0,
    headSha: '3f2a9c1d5b7e8f40',
    runUrl: 'https://github.com/o/r/actions/runs/1',
    totalUsd: 0.5,
    ...overrides,
  })

test('renderSummary shows the header, risk, and impact table', () => {
  const text = render()
  assert.match(text, /^### AI review of 3f2a9c1\n/)
  assert.match(text, /\*\*Risk: low\.\*\* UI only\./)
  assert.match(text, /\| Modules \| ui \|/)
  assert.match(text, /\| Images \| portal-ui \|/)
  assert.match(text, /\| REST API \| changed: no, breaking: no\. No change\. \|/)
  assert.match(text, /\| Database \| changed: yes, breaking: yes\. Drops a column\. \|/)
  assert.match(text, /\| Deployment \| changed: no\. None\. \|/)
  assert.match(text, /\| E2E \| Auth\. Run it\. \|/)
})

test('renderSummary says "none" for empty lists', () => {
  const impact = reviewResult().impact
  impact.modules = []
  impact.images = []
  impact.e2e.collections = []
  const text = render({ review: reviewResult({ impact }) })
  assert.match(text, /\| Modules \| none \|/)
  assert.match(text, /\| Images \| none \|/)
  assert.match(text, /\| E2E \| none named\. Run it\. \|/)
})

test('renderSummary keeps model text in one valid table cell', () => {
  const impact = reviewResult().impact
  impact.restApi.notes = 'Line one\nline two | with a pipe'
  impact.modules = ['a|b']
  const text = render({ review: reviewResult({ impact }) })
  const row = text.split('\n').find((line) => line.startsWith('| REST API'))
  assert.equal(row, '| REST API | changed: no, breaking: no. Line one line two \\| with a pipe |')
  assert.ok(text.split('\n').some((line) => line === '| Modules | a\\|b |'))
  // Every table row has exactly the cells of the header: the pipes that are not escaped.
  for (const line of text.split('\n').filter((l) => l.startsWith('| '))) {
    assert.equal(line.replace(/\\\|/g, '').split('|').length, 4, line)
  }
})

test('renderSummary says "No findings." when both lists are empty', () => {
  assert.match(render(), /\nNo findings\.\n/)
})

test('renderSummary mentions inline findings and lists the other ones', () => {
  const other = [{ ...finding('f1', 'major', { line: null, file: 'docs/x.md' }), verdict: 'confirmed' }]
  const text = render({ other, inlineCount: 2 })
  assert.match(text, /2 finding\(s\) are inline comments on the diff\./)
  assert.match(text, /\*\*Findings outside the diff lines\*\*/)
  assert.match(text, /- `docs\/x\.md`: 🔴 \*\*major\*\*: Title f1 Body f1/)
  assert.doesNotMatch(text, /No findings\./)
})

test('renderSummary shows the line number of a finding outside the diff lines', () => {
  const other = [{ ...finding('f1', 'minor', { line: 99 }), verdict: 'plausible' }]
  const text = render({ other })
  assert.match(text, /- `src\/a\.go:99`: 🟡 \*\*minor\*\* \(plausible, not confirmed\): Title f1 Body f1/)
})

test('renderSummary with only inline findings does not say "No findings."', () => {
  const text = render({ inlineCount: 1 })
  assert.doesNotMatch(text, /No findings\./)
  assert.doesNotMatch(text, /outside the diff lines/)
})

test('renderSummary ends with the run link and the cost formatted by formatUsd', () => {
  assert.match(render({ totalUsd: 0.5 }), /\[Run\]\(https:\/\/github\.com\/o\/r\/actions\/runs\/1\) · .* \$0\.50 · /)
  assert.match(render({ totalUsd: 0.0012 }), /so far: \$0\.0012 ·/)
  assert.match(render({ totalUsd: 0 }), /so far: \$0\.0000 ·/)
  const last = render().trimEnd().split('\n').pop()
  assert.match(last, /^<sub>.*`\/agent review`.*`\/agent cost`.*<\/sub>$/)
})

test('verificationLine counts what the verifier did; a finding without a verdict counts as plausible', () => {
  const { verificationLine } = require('./review')
  const findings = [{ id: 'F1' }, { id: 'F2' }, { id: 'F3' }, { id: 'F4' }]
  const verdicts = [
    { id: 'F1', verdict: 'confirmed' },
    { id: 'F2', verdict: 'rejected' },
    { id: 'F3', verdict: 'plausible' },
  ]
  const line = verificationLine(findings, verdicts)
  assert.match(line, /4 finding\(s\): 1 confirmed, 2 plausible .* 1 rejected/)
  assert.equal(verificationLine([], []), '')
})
