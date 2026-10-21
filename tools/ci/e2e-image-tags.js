#!/usr/bin/env node
/**
 * Resolves the image tags an E2E run deploys.
 *
 * `IMAGE_TAGS` is a JSON object with the keys of the launch contract:
 *
 *   backend, buildTaskConsumer, ui, apiLinterService, agentsBackend, agent
 *
 * A missing or empty key takes `DEFAULT_TAG`. A key outside the list, a non-string value, or a tag
 * that is not a valid image tag is an error, so a typo such as `agentBackend` cannot silently run
 * the default image. `src-<hash>` tags are ordinary tags and work.
 *
 * Prints `key=value` lines, to be appended to $GITHUB_OUTPUT.
 *
 * Environment: IMAGE_TAGS (default `{}`), DEFAULT_TAG (default `dev`).
 */

const KEYS = ['backend', 'buildTaskConsumer', 'ui', 'apiLinterService', 'agentsBackend', 'agent']
const TAG = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/

const fail = (message) => {
  console.error(`::error::${message}`)
  process.exit(1)
}

const defaultTag = (process.env.DEFAULT_TAG || 'dev').trim()
if (!TAG.test(defaultTag)) fail(`the default image tag "${defaultTag}" is not a valid image tag`)

let tags
try {
  tags = JSON.parse(process.env.IMAGE_TAGS || '{}')
} catch (error) {
  fail(`image-tags is not valid JSON: ${error.message}`)
}
if (tags === null || typeof tags !== 'object' || Array.isArray(tags)) {
  fail('image-tags must be a JSON object such as {"backend":"dev","ui":"src-0123456789abcdef"}')
}

for (const key of Object.keys(tags)) {
  if (!KEYS.includes(key)) fail(`image-tags has the unknown key "${key}"; the keys are ${KEYS.join(', ')}`)
}

for (const key of KEYS) {
  const raw = tags[key]
  if (raw !== undefined && typeof raw !== 'string') fail(`image-tags.${key} must be a string`)
  const value = (raw || '').trim() || defaultTag
  if (!TAG.test(value)) fail(`image-tags.${key} "${value}" is not a valid image tag`)
  console.log(`${key}=${value}`)
}
