#!/usr/bin/env node
/**
 * Interactive runner for a single screenshot IT suite (or a whole test run), aligned with
 * `run-screenshot-test-suite.mjs` of `qubership-apihub-api-doc-viewer`.
 *
 * Usage:
 *   node bin/run-screenshot-test-suite.mjs test
 *   node bin/run-screenshot-test-suite.mjs regenerate
 *   node bin/run-screenshot-test-suite.mjs regenerate legacy
 *   node bin/run-screenshot-test-suite.mjs regenerate legacy legacy-tests-diff-operation-api
 *   node bin/run-screenshot-test-suite.mjs test openapi-compatibility-suite-30-30 operation-parameters
 *
 * Test runs are discovered in `src/it`:
 *   - every folder with IT files (e.g. `legacy`) is a test run, its files are suites;
 *   - generated compatibility suite files are grouped by version pair, e.g.
 *     `openapi-compatibility-suite-30-30-operation-parameters.generated.it-test.ts` is suite
 *     `operation-parameters` of test run `openapi-compatibility-suite-30-30`.
 *
 * The test-run argument also accepts a name prefix that matches several test runs at once,
 * e.g. `openapi-compatibility-suite-30` matches `...-30-30` and `...-30-31`. All matched test
 * runs run together as their whole suites in a single Jest invocation - a specific suite
 * (3rd argument) cannot be combined with a prefix that matches more than one test run.
 * The interactive "which test run" prompt supports the same prefix matching.
 *
 * Generated IT files are not committed, so `npm run generate-tests` always runs first.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(__dirname, '..')
const itRoot = path.resolve(packageRoot, 'src/it')

const WHOLE_SUITE_VALUE = '__whole__'
const IT_DIR_IGNORE = new Set(['service', '__image_snapshots__'])
const IT_TEST_SUFFIX_RE = /(\.generated)?\.it-test\.ts$/
// `storyMetaId` of bin/compatibility-suite-generation-utils.mjs + suite id
const GENERATED_IT_FILE_RE = /^(openapi-compatibility-suite-\d+-\d+)-(.+)\.generated\.it-test\.ts$/
const JEST_CONFIG = '.config/it/it-test-docker.jest.config.js'

const positionalArgs = process.argv.slice(2).filter(arg => !arg.startsWith('--'))

const mode = positionalArgs[0]
if (mode !== 'test' && mode !== 'regenerate') {
  console.error('Usage: node bin/run-screenshot-test-suite.mjs <test|regenerate> [test-run] [suite]')
  process.exit(1)
}

const cliTestRunId = positionalArgs[1]
const cliSuite = positionalArgs[2]

if (!cliTestRunId && !process.stdin.isTTY) {
  console.error('Interactive screenshot suite runner requires a TTY.')
  console.error('Pass a test-run name, or run Jest directly from packages/elements/.')
  process.exit(1)
}

/**
 * @typedef {{ id: string, layout: 'folder', itDir: string }
 *   | { id: string, layout: 'flat', prefix: string, suiteFiles: Map<string, string> }} TestRun
 */

/**
 * @param {string} command
 * @returns {number}
 */
function run(command) {
  const result = spawnSync(command, { cwd: packageRoot, stdio: 'inherit', shell: true, env: process.env })
  return result.status ?? 1
}

/**
 * @returns {TestRun[]}
 */
function discoverTestRuns() {
  /** @type {TestRun[]} */
  const testRuns = []
  /** @type {Map<string, TestRun>} */
  const flatRuns = new Map()

  for (const entry of fs.readdirSync(itRoot, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (IT_DIR_IGNORE.has(entry.name)) {
        continue
      }
      const itDir = path.join(itRoot, entry.name)
      if (fs.readdirSync(itDir).some(file => file.endsWith('.it-test.ts'))) {
        testRuns.push({ id: entry.name, layout: 'folder', itDir })
      }
      continue
    }

    if (!entry.isFile() || !entry.name.endsWith('.it-test.ts')) {
      continue
    }
    const match = GENERATED_IT_FILE_RE.exec(entry.name)
    // Non-generated flat files form a test run of their own with a single suite
    const [runId, suite] = match ? [match[1], match[2]] : [entry.name.replace(IT_TEST_SUFFIX_RE, ''), '']
    let testRun = flatRuns.get(runId)
    if (!testRun) {
      testRun = { id: runId, layout: 'flat', prefix: match ? `${runId}-` : runId, suiteFiles: new Map() }
      flatRuns.set(runId, testRun)
      testRuns.push(testRun)
    }
    testRun.suiteFiles.set(suite || runId, entry.name)
  }

  return testRuns.sort((a, b) => a.id.localeCompare(b.id))
}

/**
 * @param {TestRun} testRun
 * @returns {string[]}
 */
function discoverSuites(testRun) {
  if (testRun.layout === 'folder') {
    return fs.readdirSync(testRun.itDir)
      .filter(file => file.endsWith('.it-test.ts'))
      .map(file => file.replace(IT_TEST_SUFFIX_RE, ''))
      .sort()
  }
  return [...testRun.suiteFiles.keys()].sort()
}

/**
 * Jest path pattern selecting every IT file of one test run. Several patterns passed as
 * separate positional arguments are OR-ed by Jest, so no `|`/`()` alternation is needed
 * (those are shell metacharacters for `cmd.exe` on Windows, even inside quotes).
 *
 * @param {TestRun} testRun
 * @returns {string}
 */
function testRunPattern(testRun) {
  return testRun.layout === 'folder' ? `src/it/${testRun.id}/` : `src/it/${testRun.prefix}`
}

/**
 * @param {TestRun} testRun
 * @param {string} suite
 * @returns {string}
 */
function resolveJestTarget(testRun, suite) {
  if (suite === WHOLE_SUITE_VALUE) {
    return testRunPattern(testRun)
  }
  if (testRun.layout === 'folder') {
    return `src/it/${testRun.id}/${suite}.it-test.ts`
  }
  return `src/it/${testRun.suiteFiles.get(suite)}`
}

/**
 * @param {string} jestTarget
 * @param {string} runLabel
 * @returns {number}
 */
function runScreenshotCommand(jestTarget, runLabel) {
  // Release stdin, so the child process owns the terminal
  input?.close()
  const updateSnapshot = mode === 'regenerate' ? ' --updateSnapshot' : ''
  const jestCommand = `jest --maxWorkers 1 --verbose${updateSnapshot} -c ${JEST_CONFIG} ${jestTarget}`
  const command = `npx start-server-and-test development:local-server:static http://localhost:9009 "${jestCommand}"`

  console.log('')
  console.log(`${mode === 'test' ? 'Running screenshot test suite' : 'Regenerating screenshots'}: ${runLabel}`)
  console.log(`  ${command}`)
  console.log('')

  const exitCode = run(command)
  console.log('')
  console.log(`${exitCode === 0 ? 'Finished' : 'Failed'} ${runLabel}`)
  return exitCode
}

/**
 * Resolves a typed answer: a 1-based index, an exact name, or (when `allowPrefix`) a name prefix.
 *
 * @template T
 * @param {string} raw
 * @param {T[]} items
 * @param {(item: T) => string} nameOf
 * @param {boolean} allowPrefix
 * @returns {T[]}
 */
function resolveAnswer(raw, items, nameOf, allowPrefix) {
  const answer = raw.trim()
  if (!answer) {
    return []
  }
  const asNumber = Number(answer)
  if (Number.isInteger(asNumber) && asNumber >= 1 && asNumber <= items.length) {
    return [items[asNumber - 1]]
  }
  const exactMatch = items.find(item => nameOf(item) === answer)
  if (exactMatch) {
    return [exactMatch]
  }
  return allowPrefix ? items.filter(item => nameOf(item).startsWith(answer)) : []
}

/** @type {readline.Interface | undefined} */
let input
/** @type {string[]} */
const bufferedLines = []
/** @type {((line: string) => void) | undefined} */
let pendingAnswer

function cancel() {
  console.log('\nCancelled.')
  process.exit(0)
}

/**
 * Reads the next line of input. One interface lives for the whole run and buffers lines,
 * so answers typed (or piped) ahead of a question are not lost.
 *
 * @param {string} question
 * @returns {Promise<string>}
 */
function ask(question) {
  if (!input) {
    input = readline.createInterface({ input: process.stdin, output: process.stdout })
    input.on('line', line => {
      if (pendingAnswer) {
        const resolve = pendingAnswer
        pendingAnswer = undefined
        resolve(line)
      } else {
        bufferedLines.push(line)
      }
    })
    input.on('SIGINT', cancel)
    input.on('close', () => pendingAnswer && cancel())
  }
  process.stdout.write(`${question}: `)
  if (bufferedLines.length > 0) {
    const line = bufferedLines.shift()
    process.stdout.write(`${line}\n`)
    return Promise.resolve(line)
  }
  if (input.closed) {
    cancel()
  }
  return new Promise(resolve => {
    pendingAnswer = resolve
  })
}

/**
 * Prints a numbered list once and asks for an answer until it resolves.
 *
 * @template T
 * @param {string} title
 * @param {string} question
 * @param {T[]} items
 * @param {(item: T) => string} nameOf
 * @param {(item: T) => string} hintOf
 * @param {boolean} allowPrefix
 * @returns {Promise<T[]>}
 */
async function promptChoice(title, question, items, nameOf, hintOf, allowPrefix) {
  console.log('')
  console.log(title)
  items.forEach((item, index) => console.log(`  ${index + 1}. ${nameOf(item)}  ${hintOf(item)}`))
  console.log('')

  for (;;) {
    const resolved = resolveAnswer(await ask(question), items, nameOf, allowPrefix)
    if (resolved.length > 0) {
      return resolved
    }
    console.log(allowPrefix
      ? `Enter a number 1-${items.length}, an exact name, or a prefix that matches at least one test run`
      : `Enter a number 1-${items.length} or an exact name`)
  }
}

console.log(mode === 'test' ? 'Screenshot test - single suite' : 'Regenerate screenshots - single suite')
console.log('')
console.log('Generating compatibility suite tests: npm run generate-tests')
const generateExitCode = run('npm run generate-tests')
if (generateExitCode !== 0) {
  process.exit(generateExitCode)
}

const testRuns = discoverTestRuns()
if (testRuns.length === 0) {
  console.error('No screenshot test runs found under src/it/.')
  process.exit(1)
}

/** @type {TestRun[]} */
let selectedTestRuns
if (cliTestRunId) {
  const exactMatch = testRuns.find(testRun => testRun.id === cliTestRunId)
  selectedTestRuns = exactMatch ? [exactMatch] : testRuns.filter(testRun => testRun.id.startsWith(cliTestRunId))
  if (selectedTestRuns.length === 0) {
    console.error(`Unknown test run: ${cliTestRunId}`)
    console.error(`Known test runs: ${testRuns.map(testRun => testRun.id).join(', ')}`)
    process.exit(1)
  }
} else {
  selectedTestRuns = await promptChoice(
    'Which test run do you want to execute?',
    'Your choice (number, exact name, or a name prefix to match several)',
    testRuns,
    testRun => testRun.id,
    testRun => `(${discoverSuites(testRun).length} suites)`,
    true,
  )
}

if (selectedTestRuns.length > 1) {
  if (cliSuite) {
    console.error(
      `"${cliTestRunId}" matches multiple test runs (${selectedTestRuns.map(testRun => testRun.id).join(', ')}); `
      + 'pass an exact test run id to target a specific suite.',
    )
    process.exit(1)
  }
  console.log('')
  console.log('Matched test runs:')
  selectedTestRuns.forEach(testRun => console.log(`  - ${testRun.id}`))
  process.exit(runScreenshotCommand(
    selectedTestRuns.map(testRunPattern).join(' '),
    `${selectedTestRuns.length} test runs (${selectedTestRuns.map(testRun => testRun.id).join(', ')})`,
  ))
}

const testRun = selectedTestRuns[0]
const suites = discoverSuites(testRun)
if (suites.length === 0) {
  console.error(`No screenshot suites found for ${testRun.id}.`)
  process.exit(1)
}

let selectedSuite = cliSuite
if (selectedSuite) {
  if (selectedSuite !== WHOLE_SUITE_VALUE && !suites.includes(selectedSuite)) {
    console.error(`Unknown suite: ${selectedSuite}`)
    console.error(`Known suites: ${suites.join(', ')}`)
    process.exit(1)
  }
} else if (cliTestRunId) {
  selectedSuite = WHOLE_SUITE_VALUE
} else {
  const [choice] = await promptChoice(
    'Which test suite do you want to run?',
    'Your choice (number or exact name)',
    [WHOLE_SUITE_VALUE, ...suites],
    suite => (suite === WHOLE_SUITE_VALUE ? 'Whole test run' : suite),
    suite => (suite === WHOLE_SUITE_VALUE ? `(${suites.length} suite${suites.length === 1 ? '' : 's'})` : ''),
    false,
  )
  selectedSuite = choice
}

const runLabel = selectedSuite === WHOLE_SUITE_VALUE ? `${testRun.id} (whole run)` : `${testRun.id} / ${selectedSuite}`
process.exit(runScreenshotCommand(resolveJestTarget(testRun, selectedSuite), runLabel))
