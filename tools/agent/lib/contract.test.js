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
  assert.deepEqual(Object.keys(SCHEMAS).sort(), ['review', 'verification'])
  for (const [name, schema] of Object.entries(SCHEMAS)) walk(schema, name)
})
