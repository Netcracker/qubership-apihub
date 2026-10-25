'use strict'
/**
 * Configuration of the AI Autonomous agent, read from the environment.
 *
 * Every knob has a safe default: the agent is disabled and runs in dry-run mode until the repository variables
 * say otherwise. A bad value fails fast with an Error that names the variable, so a typo in a repository
 * variable stops the workflow instead of silently falling back to a default.
 *
 * Environment (all optional):
 *   AGENT_ENABLED             `true` turns the agent on
 *   AGENT_DRY_RUN             `false` lets the agent write to GitHub; anything else keeps dry-run
 *   AGENT_ALLOWED_ACTORS      comma-separated logins; unset or empty means no restriction
 *   AGENT_MODEL_IMPLEMENT     `provider/model[:variant]`, default `openai/gpt-6.1-sol:high`
 *   AGENT_MODEL_REVIEW        default `openai/gpt-6-luna:max`
 *   AGENT_MODEL_VERIFY        default `openai/gpt-6.1-sol:medium`
 *   AGENT_MODEL_LIGHT         default `openai/gpt-6-luna:medium`
 *   AGENT_MODEL_TRIAGE        default `openai/gpt-6.1-sol:medium`
 *   AGENT_MAX_ATTEMPTS        positive integer, default 3
 *   AGENT_MAX_REVIEW_ROUNDS   positive integer, default 2
 *   AGENT_MAX_ANALYSES        positive integer, default 5
 */

const DEFAULT_MODELS = {
  implement: 'openai/gpt-6.1-sol:high',
  review: 'openai/gpt-6-luna:max',
  verify: 'openai/gpt-6.1-sol:medium',
  light: 'openai/gpt-6-luna:medium',
  triage: 'openai/gpt-6.1-sol:medium',
}

const DEFAULT_LIMITS = {
  maxAttempts: 3,
  maxReviewRounds: 2,
  maxAnalyses: 5,
}

const MODEL_VARIABLES = {
  implement: 'AGENT_MODEL_IMPLEMENT',
  review: 'AGENT_MODEL_REVIEW',
  verify: 'AGENT_MODEL_VERIFY',
  light: 'AGENT_MODEL_LIGHT',
  triage: 'AGENT_MODEL_TRIAGE',
}

const LIMIT_VARIABLES = {
  maxAttempts: 'AGENT_MAX_ATTEMPTS',
  maxReviewRounds: 'AGENT_MAX_REVIEW_ROUNDS',
  maxAnalyses: 'AGENT_MAX_ANALYSES',
}

/** A variable that is unset or blank counts as not provided. */
function readVariable(env, name) {
  const value = env[name]
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

/**
 * Splits `provider/model[:variant]` into `{ id, variant }`. The variant is whatever follows the last colon;
 * without a colon it is `null`. `name` is the variable to blame in the error message.
 */
function parseModel(value, name = 'model') {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${name}: expected provider/model[:variant], got an empty value`)
  }
  const text = value.trim()
  const colon = text.lastIndexOf(':')
  const id = colon === -1 ? text : text.slice(0, colon)
  const variant = colon === -1 ? null : text.slice(colon + 1)
  if (!/^[^\s/:]+\/\S+$/.test(id)) {
    throw new Error(`${name}: expected provider/model[:variant], got '${text}'`)
  }
  if (variant !== null && !/^\S+$/.test(variant)) {
    throw new Error(`${name}: the variant after ':' must not be empty or contain spaces, got '${text}'`)
  }
  return { id, variant }
}

/** A positive integer written in plain digits; `1.5`, `-1`, `0`, `1e3`, and `abc` are rejected. */
function parsePositiveInt(value, name) {
  if (!/^[0-9]+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) {
    throw new Error(`${name}: expected a positive integer, got '${value}'`)
  }
  return Number(value)
}

/** Lowercased, trimmed logins without empty items; `null` when nothing is left (no restriction). */
function parseActors(value) {
  if (value === undefined) return null
  const logins = value
    .split(',')
    .map((login) => login.trim().toLowerCase())
    .filter((login) => login !== '')
  return logins.length === 0 ? null : logins
}

/** Builds the configuration object from `env`. Throws when a value is invalid or the reviewer equals the author. */
function loadConfig(env = process.env) {
  const models = {}
  for (const [role, name] of Object.entries(MODEL_VARIABLES)) {
    models[role] = parseModel(readVariable(env, name) ?? DEFAULT_MODELS[role], name)
  }
  // The design requires a different reviewer than the author, so one model cannot play both roles.
  if (models.implement.id === models.review.id) {
    throw new Error(
      `${MODEL_VARIABLES.implement} and ${MODEL_VARIABLES.review} must name different models, ` +
        `both are '${models.implement.id}'`,
    )
  }

  const limits = {}
  for (const [key, name] of Object.entries(LIMIT_VARIABLES)) {
    const value = readVariable(env, name)
    limits[key] = value === undefined ? DEFAULT_LIMITS[key] : parsePositiveInt(value, name)
  }

  return {
    enabled: readVariable(env, 'AGENT_ENABLED') === 'true',
    // Dry run is the safe default: only the exact value `false` lets the agent write.
    dryRun: readVariable(env, 'AGENT_DRY_RUN') !== 'false',
    allowedActors: parseActors(readVariable(env, 'AGENT_ALLOWED_ACTORS')),
    models,
    limits,
  }
}

/** True when there is no restriction, else a case-insensitive membership check. */
function isActorAllowed(config, login) {
  if (config.allowedActors === null) return true
  if (typeof login !== 'string') return false
  return config.allowedActors.includes(login.trim().toLowerCase())
}

module.exports = { loadConfig, parseModel, isActorAllowed }
