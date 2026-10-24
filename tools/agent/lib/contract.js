'use strict'
/**
 * The JSON contract between the agent and the model.
 *
 * The model ends its answer with one fenced JSON block. `extractJson` finds it, and `validate` checks it
 * against a schema before any other code trusts a field. A broken answer raises `ContractError`, whose
 * message lists every problem with its path, so it can be sent back to the model as a repair prompt.
 *
 * The validator covers only the subset of JSON Schema that the schemas below use: `type` (one name or an
 * array), `enum`, `required`, `properties`, `additionalProperties: false`, `items`, `minLength`, `maxLength`,
 * `maxItems`.
 */

class ContractError extends Error {
  /** @param {string} message @param {string[]} [problems] one entry per problem, with its path */
  constructor(message, problems = []) {
    super(message)
    this.name = 'ContractError'
    this.problems = problems
  }
}

const FENCE_OPEN = /^\s*```json\s*$/i
const FENCE_CLOSE = /^\s*```\s*$/

/**
 * The parsed object of the LAST ```json block of `text`; without such a block, of the whole trimmed text.
 * Fences are matched line by line: a JSON string cannot hold a raw newline, so a fence inside a finding body
 * (a code suggestion, for example) never ends the block early.
 */
function extractJson(text) {
  if (typeof text !== 'string') throw new ContractError('The model answer is not a string')
  const lines = text.split(/\r?\n/)
  let block = null
  for (let i = 0; i < lines.length; i++) {
    if (!FENCE_OPEN.test(lines[i])) continue
    const close = lines.findIndex((line, j) => j > i && FENCE_CLOSE.test(line))
    if (close === -1) throw new ContractError('The last ```json block of the answer is not closed')
    block = lines.slice(i + 1, close).join('\n')
    i = close
  }
  const source = block ?? text.trim()
  if (source.trim() === '') throw new ContractError('The model answer holds no JSON: expected a ```json block')

  let value
  try {
    value = JSON.parse(source)
  } catch (error) {
    const where =
      block === null ? 'The answer has no ```json block and is not JSON' : 'The ```json block is not valid JSON'
    throw new ContractError(`${where}: ${error.message}`)
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new ContractError('The JSON in the answer must be an object')
  }
  return value
}

function typeOf(value) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

function matchesType(value, type) {
  switch (type) {
    case 'integer':
      return Number.isInteger(value)
    case 'number':
      return typeof value === 'number' && Number.isFinite(value)
    default:
      return typeOf(value) === type
  }
}

/** Appends the problems of `value` against `schema` to `problems`; `path` is empty for the root. */
function check(schema, value, path, problems) {
  const label = path === '' ? '(root)' : path
  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type]
    if (!types.some((type) => matchesType(value, type))) {
      problems.push(`${label}: expected ${types.join(' or ')}`)
      return
    }
  }
  if (schema.enum !== undefined && !schema.enum.includes(value)) {
    problems.push(`${label}: expected one of ${schema.enum.map((item) => JSON.stringify(item)).join(', ')}`)
  }
  if (typeof value === 'string' && schema.minLength !== undefined && value.length < schema.minLength) {
    problems.push(`${label}: expected at least ${schema.minLength} character(s)`)
  }
  if (typeof value === 'string' && schema.maxLength !== undefined && value.length > schema.maxLength) {
    problems.push(`${label}: expected at most ${schema.maxLength} character(s), got ${value.length}`)
  }
  if (Array.isArray(value)) {
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      problems.push(`${label}: expected at most ${schema.maxItems} item(s), got ${value.length}`)
    }
    if (schema.items !== undefined) {
      value.forEach((item, index) => check(schema.items, item, `${path}[${index}]`, problems))
    }
  }
  if (typeOf(value) === 'object') {
    const child = (key) => (path === '' ? key : `${path}.${key}`)
    for (const key of schema.required ?? []) {
      if (value[key] === undefined) problems.push(`${child(key)}: missing required property`)
    }
    for (const [key, propertySchema] of Object.entries(schema.properties ?? {})) {
      if (value[key] !== undefined) check(propertySchema, value[key], child(key), problems)
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!(key in (schema.properties ?? {}))) problems.push(`${child(key)}: unexpected property`)
      }
    }
  }
}

/** An object schema where every listed property is required and no other property is allowed. */
function strictObject(properties) {
  return { type: 'object', required: Object.keys(properties), properties, additionalProperties: false }
}

const str = { type: 'string' }
const bool = { type: 'boolean' }
const strings = { type: 'array', items: str }

const SCHEMAS = {
  review: strictObject({
    summary: { type: 'string', minLength: 1 },
    risk: { type: 'string', enum: ['low', 'medium', 'high'] },
    riskReason: str,
    impact: strictObject({
      modules: strings,
      images: strings,
      restApi: strictObject({ changed: bool, breaking: bool, notes: str }),
      database: strictObject({ changed: bool, breaking: bool, notes: str }),
      // Helm, Compose, and the configuration reference.
      deploy: strictObject({ changed: bool, notes: str }),
      e2e: strictObject({ collections: strings, notes: str }),
    }),
    findings: {
      type: 'array',
      maxItems: 30,
      items: strictObject({
        id: str,
        file: str,
        line: { type: ['integer', 'null'] },
        severity: { type: 'string', enum: ['blocker', 'major', 'minor', 'nit'] },
        category: str,
        title: { type: 'string', minLength: 1 },
        body: { type: 'string', minLength: 1 },
      }),
    },
  }),
  verification: strictObject({
    verdicts: {
      type: 'array',
      items: strictObject({
        id: str,
        verdict: { type: 'string', enum: ['confirmed', 'plausible', 'rejected'] },
        reason: str,
      }),
    },
  }),
  // Output of the analyst (Flow B). Which fields must be filled for which verdict is checked in analyze.js.
  analysis: strictObject({
    verdict: { type: 'string', enum: ['suitable', 'unsuitable', 'needs-info'] },
    reason: { type: 'string', minLength: 1 },
    // Only for needs-info; empty otherwise.
    questions: { type: 'array', maxItems: 10, items: str },
    // Only for suitable; null otherwise.
    plan: {
      type: ['object', 'null'],
      required: ['modules', 'approach', 'tests', 'risk'],
      properties: {
        modules: strings,
        approach: { type: 'string', minLength: 1 },
        tests: str,
        risk: { type: 'string', enum: ['low', 'medium', 'high'] },
      },
      additionalProperties: false,
    },
  }),
  // Output of the assistant (Flow D): the Markdown answer to a question in a comment.
  chatAnswer: strictObject({
    answer: { type: 'string', minLength: 1, maxLength: 6000 },
  }),
  // Output of the implementer (Flow C). Which fields must be filled for which status is checked in implement.js.
  implementation: strictObject({
    status: { type: 'string', enum: ['done', 'blocked', 'unrelated'] },
    summary: { type: 'string', minLength: 1 },
    commitType: {
      type: 'string',
      enum: ['fix', 'feat', 'perf', 'refactor', 'revert', 'build', 'chore', 'style', 'docs', 'test', 'ci'],
    },
    // The module name, or an empty string when the change spans several modules.
    scope: str,
    title: { type: 'string', minLength: 1, maxLength: 72 },
    verification: str,
    notes: str,
    // The explanation for `blocked` and for `unrelated`; empty otherwise.
    blockedReason: str,
  }),
  // Output of the self-reviewer (Flow C).
  selfReview: strictObject({
    verdict: { type: 'string', enum: ['approve', 'changes'] },
    findings: {
      type: 'array',
      maxItems: 20,
      items: strictObject({
        severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
        file: str,
        line: { type: ['integer', 'null'] },
        body: { type: 'string', minLength: 1 },
      }),
    },
  }),
}

/** Returns `value` when it fits the schema `schemaName`; else throws `ContractError` listing every problem. */
function validate(schemaName, value) {
  const schema = Object.hasOwn(SCHEMAS, schemaName) ? SCHEMAS[schemaName] : undefined
  if (schema === undefined) throw new Error(`Unknown contract schema '${schemaName}'`)
  const problems = []
  check(schema, value, '', problems)
  if (problems.length > 0) {
    throw new ContractError(`The ${schemaName} output is invalid: ${problems.join('; ')}`, problems)
  }
  return value
}

module.exports = { ContractError, extractJson, validate, SCHEMAS }
