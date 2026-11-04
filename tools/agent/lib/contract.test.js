'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { ContractError, extractJson, validate, SCHEMAS } = require('./contract')

const FENCE = '```'

function goodReview() {
  return {
    summary: 'Adds a retry to the publisher.',
    risk: 'low',
    riskReason: 'Small change behind a flag.',
    impact: {
      modules: ['portal-backend'],
      images: ['portal-backend'],
      restApi: { changed: false, breaking: false, notes: '' },
      database: { changed: false, breaking: false, notes: '' },
      deploy: { changed: false, notes: '' },
      e2e: { collections: [], notes: '' },
    },
    findings: [
      {
        id: 'F1',
        file: 'backend/portal-backend/service/x.go',
        line: 42,
        severity: 'minor',
        category: 'correctness',
        title: 'Retry loop ignores context',
        body: 'The loop keeps going after the request is canceled.',
      },
    ],
  }
}

function problemsOf(schema, value) {
  try {
    validate(schema, value)
  } catch (error) {
    assert.ok(error instanceof ContractError, `expected ContractError, got ${error}`)
    return error.problems
  }
  assert.fail('expected validate to throw')
}

test('extractJson takes the last json block', () => {
  const text = `Draft:\n${FENCE}json\n{"a":1}\n${FENCE}\nFinal:\n${FENCE}json\n{"a":2}\n${FENCE}\nbye`
  assert.deepEqual(extractJson(text), { a: 2 })
})

test('extractJson ignores blocks with another tag and handles CRLF', () => {
  const text = `${FENCE}js\nnot json\n${FENCE}\r\n${FENCE}json\r\n{"ok":true}\r\n${FENCE}\r\n`
  assert.deepEqual(extractJson(text), { ok: true })
})

test('extractJson survives a fence inside a JSON string', () => {
  const body = `Use this:\n${FENCE}suggestion\nfoo\n${FENCE}`
  const text = `Done.\n${FENCE}json\n${JSON.stringify({ body }, null, 2)}\n${FENCE}`
  assert.deepEqual(extractJson(text), { body })
})

test('extractJson falls back to the whole trimmed text', () => {
  assert.deepEqual(extractJson('  \n{"a": [1, 2]}\n'), { a: [1, 2] })
})

test('extractJson throws ContractError with a clear message', () => {
  assert.throws(
    () => extractJson('no json here'),
    (e) => e instanceof ContractError && /no ```json block/.test(e.message),
  )
  assert.throws(() => extractJson(''), ContractError)
  assert.throws(() => extractJson(undefined), ContractError)
  assert.throws(() => extractJson(`${FENCE}json\n{ broken\n${FENCE}`), /not valid JSON/)
  assert.throws(() => extractJson(`${FENCE}json\n{"a":1}\n`), /not closed/)
  assert.throws(() => extractJson(`${FENCE}json\n[1]\n${FENCE}`), /must be an object/)
  assert.throws(() => extractJson(`${FENCE}json\nnull\n${FENCE}`), /must be an object/)
})

test('a broken last block is an error even when an earlier block is fine', () => {
  const text = `${FENCE}json\n{"a":1}\n${FENCE}\n${FENCE}json\n{oops\n${FENCE}`
  assert.throws(() => extractJson(text), /not valid JSON/)
})

test('a good review and a good verification validate and are returned as they are', () => {
  const review = goodReview()
  assert.equal(validate('review', review), review)
  review.findings[0].line = null
  assert.equal(validate('review', review), review)
  const verification = { verdicts: [{ id: 'F1', verdict: 'confirmed', reason: 'Reproduced.' }] }
  assert.equal(validate('verification', verification), verification)
  assert.equal(validate('verification', { verdicts: [] }).verdicts.length, 0)
})

test('validate lists every problem with its path', () => {
  const review = goodReview()
  review.findings[0].line = 'forty'
  review.findings.push({ ...review.findings[0], line: 1.5, severity: 'critical', title: '' })
  review.risk = 'extreme'
  delete review.riskReason
  review.impact.restApi.breaking = 'no'
  review.extra = true
  const problems = problemsOf('review', review)
  assert.deepEqual(problems.sort(), [
    'extra: unexpected property',
    'findings[0].line: expected integer or null',
    'findings[1].line: expected integer or null',
    'findings[1].severity: expected one of "blocker", "major", "minor", "nit"',
    'findings[1].title: expected at least 1 character(s)',
    'impact.restApi.breaking: expected boolean',
    'risk: expected one of "low", "medium", "high"',
    'riskReason: missing required property',
  ])
})

test('the error message carries the schema name and all problems', () => {
  assert.throws(
    () => validate('verification', { verdicts: [{ id: 'F1', verdict: 'maybe' }], more: 1 }),
    (e) =>
      e instanceof ContractError &&
      e.name === 'ContractError' &&
      /^The verification output is invalid: /.test(e.message) &&
      e.message.includes('verdicts[0].verdict: expected one of "confirmed", "plausible", "rejected"') &&
      e.message.includes('verdicts[0].reason: missing required property') &&
      e.message.includes('more: unexpected property'),
  )
})

test('validate rejects a non-object root and wrong container types', () => {
  assert.deepEqual(problemsOf('review', null), ['(root): expected object'])
  assert.deepEqual(problemsOf('review', []), ['(root): expected object'])
  assert.deepEqual(problemsOf('verification', { verdicts: 'none' }), ['verdicts: expected array'])
  const review = goodReview()
  review.impact.modules = ['ok', 3]
  review.findings = {}
  assert.deepEqual(problemsOf('review', review).sort(), [
    'findings: expected array',
    'impact.modules[1]: expected string',
  ])
})

test('validate enforces maxItems on findings', () => {
  const review = goodReview()
  review.findings = Array.from({ length: 31 }, (_, i) => ({ ...goodReview().findings[0], id: `F${i}` }))
  assert.deepEqual(problemsOf('review', review), ['findings: expected at most 30 item(s), got 31'])
  review.findings.pop()
  assert.equal(validate('review', review), review)
})

test('the summary must not be empty', () => {
  const review = goodReview()
  review.summary = ''
  assert.deepEqual(problemsOf('review', review), ['summary: expected at least 1 character(s)'])
})

test('an undefined property counts as missing, an explicit null is a wrong type', () => {
  const review = goodReview()
  review.summary = undefined
  review.impact.deploy.notes = null
  assert.deepEqual(problemsOf('review', review).sort(), [
    'impact.deploy.notes: expected string',
    'summary: missing required property',
  ])
})

test('integer and number types differ', () => {
  const review = goodReview()
  review.findings[0].line = 3.0
  assert.equal(validate('review', review), review)
  review.findings[0].line = Infinity
  assert.deepEqual(problemsOf('review', review), ['findings[0].line: expected integer or null'])
})

test('an unknown schema name is a programming error, not a ContractError', () => {
  assert.throws(
    () => validate('nope', {}),
    (e) => !(e instanceof ContractError) && /Unknown contract schema 'nope'/.test(e.message),
  )
  assert.throws(() => validate('__proto__', {}), /Unknown contract schema/)
})

test('every object in the schemas requires all its properties and forbids extras', () => {
  const walk = (schema, where) => {
    if (schema.type === 'object') {
      assert.deepEqual(schema.required, Object.keys(schema.properties), where)
      assert.equal(schema.additionalProperties, false, where)
      for (const [key, child] of Object.entries(schema.properties)) walk(child, `${where}.${key}`)
    } else if (schema.type === 'array') {
      walk(schema.items, `${where}[]`)
    }
  }
  assert.deepEqual(Object.keys(SCHEMAS).sort(), [
    'analysis', 'chatAnswer', 'ciTriage', 'implementation', 'review', 'selfReview', 'verification',
  ])
  for (const [name, schema] of Object.entries(SCHEMAS)) walk(schema, name)
})

function goodAnalysis(extra = {}) {
  return {
    verdict: 'suitable',
    reason: 'The bug is located and one test shows the fix.',
    questions: [],
    plan: {
      modules: ['portal-backend'],
      approach: 'Guard the nil changelog in the builder.',
      tests: 'Add a unit test; run the portal-backend tests.',
      risk: 'low',
    },
    ...extra,
  }
}

test('good analyses validate: suitable with a plan, needs-info and unsuitable without one', () => {
  const suitable = goodAnalysis()
  assert.equal(validate('analysis', suitable), suitable)
  const needsInfo = goodAnalysis({ verdict: 'needs-info', questions: ['Which version?'], plan: null })
  assert.equal(validate('analysis', needsInfo), needsInfo)
  const unsuitable = goodAnalysis({ verdict: 'unsuitable', plan: null })
  assert.equal(validate('analysis', unsuitable), unsuitable)
})

test('analysis problems are listed with their paths', () => {
  const analysis = goodAnalysis({ verdict: 'maybe', reason: '', questions: ['ok', 3] })
  analysis.plan.risk = 'extreme'
  analysis.plan.approach = ''
  delete analysis.plan.tests
  analysis.plan.extra = 1
  analysis.extra = true
  assert.deepEqual(problemsOf('analysis', analysis).sort(), [
    'extra: unexpected property',
    'plan.approach: expected at least 1 character(s)',
    'plan.extra: unexpected property',
    'plan.risk: expected one of "low", "medium", "high"',
    'plan.tests: missing required property',
    'questions[1]: expected string',
    'reason: expected at least 1 character(s)',
    'verdict: expected one of "suitable", "unsuitable", "needs-info"',
  ])
})

test('analysis allows at most 10 questions and rejects a plan of the wrong type', () => {
  const many = goodAnalysis({ verdict: 'needs-info', plan: null, questions: Array.from({ length: 11 }, () => 'q') })
  assert.deepEqual(problemsOf('analysis', many), ['questions: expected at most 10 item(s), got 11'])
  assert.deepEqual(problemsOf('analysis', goodAnalysis({ plan: 'later' })), ['plan: expected object or null'])
  assert.deepEqual(problemsOf('analysis', goodAnalysis({ plan: undefined })), ['plan: missing required property'])
})

test('chatAnswer needs a non-empty answer of at most 6000 characters and nothing else', () => {
  assert.doesNotThrow(() => validate('chatAnswer', { answer: 'The state lives in one comment.' }))
  assert.doesNotThrow(() => validate('chatAnswer', { answer: 'x'.repeat(6000) }))
  assert.deepEqual(problemsOf('chatAnswer', { answer: '' }), ['answer: expected at least 1 character(s)'])
  assert.deepEqual(problemsOf('chatAnswer', { answer: 'x'.repeat(6001) }), [
    'answer: expected at most 6000 character(s), got 6001',
  ])
  assert.deepEqual(problemsOf('chatAnswer', { answer: 'ok', extra: 1 }), ['extra: unexpected property'])
  assert.deepEqual(problemsOf('chatAnswer', {}), ['answer: missing required property'])
})

function goodTriage(extra = {}) {
  return {
    verdict: 'change',
    confidence: 'high',
    rootCause: 'The change renames the field, and the test still reads the old name.',
    fixes: [{ file: 'backend/portal-backend/service/x_test.go', line: 42, what: 'Read the new field name.' }],
    evidence: ['--- FAIL: TestBuild (0.00s)'],
    ...extra,
  }
}

test('ciTriage accepts a full answer, a fix without a line, and empty lists', () => {
  assert.doesNotThrow(() => validate('ciTriage', goodTriage()))
  assert.doesNotThrow(() => validate('ciTriage', goodTriage({ fixes: [{ file: 'a.go', line: null, what: 'x' }] })))
  assert.doesNotThrow(() => validate('ciTriage', goodTriage({ verdict: 'unknown', fixes: [], evidence: [] })))
})

test('ciTriage checks the enums, the lengths, and the list sizes', () => {
  assert.deepEqual(problemsOf('ciTriage', goodTriage({ verdict: 'maybe' })), [
    'verdict: expected one of "change", "flaky", "infra", "unknown"',
  ])
  assert.deepEqual(problemsOf('ciTriage', goodTriage({ confidence: 'certain' })), [
    'confidence: expected one of "low", "medium", "high"',
  ])
  assert.deepEqual(problemsOf('ciTriage', goodTriage({ rootCause: '' })), [
    'rootCause: expected at least 1 character(s)',
  ])
  assert.deepEqual(problemsOf('ciTriage', goodTriage({ rootCause: 'x'.repeat(2001) })), [
    'rootCause: expected at most 2000 character(s), got 2001',
  ])
  assert.doesNotThrow(() => validate('ciTriage', goodTriage({ rootCause: 'x'.repeat(2000) })))
  const fix = { file: 'a.go', line: 1, what: 'x' }
  assert.deepEqual(problemsOf('ciTriage', goodTriage({ fixes: Array(11).fill(fix) })), [
    'fixes: expected at most 10 item(s), got 11',
  ])
  assert.deepEqual(problemsOf('ciTriage', goodTriage({ evidence: Array(11).fill('x') })), [
    'evidence: expected at most 10 item(s), got 11',
  ])
  assert.deepEqual(problemsOf('ciTriage', goodTriage({ evidence: ['x'.repeat(301)] })), [
    'evidence[0]: expected at most 300 character(s), got 301',
  ])
})

test('ciTriage fixes need a file, an integer or null line, and a non-empty what; nothing else is allowed', () => {
  assert.deepEqual(problemsOf('ciTriage', goodTriage({ fixes: [{ file: 'a.go', line: 1.5, what: '' }] })), [
    'fixes[0].line: expected integer or null',
    'fixes[0].what: expected at least 1 character(s)',
  ])
  assert.deepEqual(problemsOf('ciTriage', goodTriage({ fixes: [{ file: 'a.go', what: 'x' }] })), [
    'fixes[0].line: missing required property',
  ])
  assert.deepEqual(problemsOf('ciTriage', goodTriage({ extra: 1 })), ['extra: unexpected property'])
})

function goodImplementation(extra = {}) {
  return {
    status: 'done',
    summary: 'Guards the nil changelog in the builder.',
    commitType: 'fix',
    scope: 'portal-backend',
    title: 'guard the nil changelog',
    verification: 'Added TestBuildNilChangelog; go test ./... passes.',
    notes: 'The nil came from an empty package.',
    blockedReason: '',
    ...extra,
  }
}

test('implementation accepts a done, a blocked, and an unrelated answer', () => {
  assert.doesNotThrow(() => validate('implementation', goodImplementation()))
  const unrelated = goodImplementation({ status: 'unrelated', blockedReason: 'Flaky E2E; the change touches no auth.' })
  assert.doesNotThrow(() => validate('implementation', unrelated))
  const blocked = goodImplementation({ status: 'blocked', blockedReason: 'The issue does not say which API.' })
  assert.doesNotThrow(() => validate('implementation', blocked))
})

test('implementation lists every problem with its path, including the title length', () => {
  const bad = goodImplementation({
    status: 'finished',
    commitType: 'oops',
    title: 'x'.repeat(73),
    summary: '',
    extra: 1,
  })
  delete bad.notes
  assert.deepEqual(problemsOf('implementation', bad).sort(), [
    'commitType: expected one of "fix", "feat", "perf", "refactor", "revert", "build", "chore", "style", "docs", ' +
      '"test", "ci"',
    'extra: unexpected property',
    'notes: missing required property',
    'status: expected one of "done", "blocked", "unrelated"',
    'summary: expected at least 1 character(s)',
    'title: expected at most 72 character(s), got 73',
  ])
  assert.deepEqual(problemsOf('implementation', goodImplementation({ title: '' })), [
    'title: expected at least 1 character(s)',
  ])
  assert.doesNotThrow(() => validate('implementation', goodImplementation({ title: 'x'.repeat(72) })))
})

test('selfReview accepts an approval without findings and findings with a null line', () => {
  assert.doesNotThrow(() => validate('selfReview', { verdict: 'approve', findings: [] }))
  const changes = {
    verdict: 'changes',
    findings: [{ severity: 'major', file: 'a/b.go', line: null, body: 'The error is swallowed.' }],
  }
  assert.doesNotThrow(() => validate('selfReview', changes))
})

test('selfReview lists the problems of a finding and limits the findings to 20', () => {
  const bad = { verdict: 'maybe', findings: [{ severity: 'nit', file: 'a', line: 1.5, body: '' }] }
  assert.deepEqual(problemsOf('selfReview', bad).sort(), [
    'findings[0].body: expected at least 1 character(s)',
    'findings[0].line: expected integer or null',
    'findings[0].severity: expected one of "blocker", "major", "minor"',
    'verdict: expected one of "approve", "changes"',
  ])
  const finding = { severity: 'minor', file: 'a', line: 1, body: 'b' }
  const many = { verdict: 'approve', findings: Array.from({ length: 21 }, () => finding) }
  assert.deepEqual(problemsOf('selfReview', many), ['findings: expected at most 20 item(s), got 21'])
})
