#!/usr/bin/env node
/**
 * Interactive runner for a single screenshot IT suite (or whole test run for one category).
 *
 * Usage:
 *   node bin/run-screenshot-test-suite.mjs test
 *   node bin/run-screenshot-test-suite.mjs regenerate
 *   node bin/run-screenshot-test-suite.mjs regenerate json-schema-diffs-suite
 *   node bin/run-screenshot-test-suite.mjs regenerate json-schema-diffs-suite combiners
 *   node bin/run-screenshot-test-suite.mjs regenerate --ui=select
 *   node bin/run-screenshot-test-suite.mjs regenerate ddlapi-compatibility-suite column-type
 *
 * Compatibility-suite test runs (e.g. `ddlapi-compatibility-suite`) select their spec type's
 * `*.generated.it-test.ts` files inside `src/it/compatibility-suite/`. Those files are gitignored
 * and produced by `npm run generate-tests`, which this runner calls first for such runs in both
 * modes (and up front when the files are missing, so their suites can be listed).
 *
 * The test-run argument also accepts a name prefix that matches several test runs at once,
 * e.g. `json-schema` matches `json-schema-suite`, `json-schema-diffs-suite`,
 * `json-schema-diffs-extensions-suite`, etc. All matched test runs run together as their
 * whole suites in a single Jest invocation — a specific suite (3rd argument) cannot be
 * combined with a prefix that matches more than one test run.
 *
 *   node bin/run-screenshot-test-suite.mjs regenerate json-schema
 *   node bin/run-screenshot-test-suite.mjs regenerate json-schema-diffs
 *
 * The interactive "which test run" prompt supports the same prefix matching: type a prefix
 * instead of a number/exact name (in `--ui=select` mode, pick "Search by name prefix…" first).
 *
 * Default UI uses Clack note + text (static option list, then type a number or name).
 * Arrow-key select (--ui=select) is available in terminals with full TTY support.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cancel, intro, isCancel, note, outro, select, spinner, text } from '@clack/prompts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, '..');
const samplesRoot = path.resolve(packageRoot, '../samples');
const itRoot = path.resolve(packageRoot, 'src/it');

const WHOLE_SUITE_VALUE = '__whole__';
const SAMPLES_DIR_IGNORE = new Set(['fixtures', 'src']);
// Strips the file extension, plus an optional legacy "-samples" suffix some suites still use
// (kept only so existing suite names / CLI invocations stay stable — it is not required).
const IT_TEST_SUFFIX_RE = /(-samples)?\.it-test\.ts$/;
const GENERATED_IT_TEST_SUFFIX = '.generated.it-test.ts';
const COMPATIBILITY_SUITE_DIR = 'compatibility-suite';
// One test run per compatibility-suite spec type, named after the generator's file prefix
// (`makeFilePrefix` in bin/compatibility-suite-generation-utils.mjs).
const COMPATIBILITY_TEST_RUN_IDS = ['ddlapi-compatibility-suite'];

/**
 * Finds the on-disk IT test filename for a suite id, trying the plain name first and
 * falling back to the legacy "-samples" suffixed name.
 *
 * @param {string} dir
 * @param {string} base
 * @returns {string}
 */
function resolveItTestFileName(dir, base) {
  const plain = `${base}.it-test.ts`;
  if (fs.existsSync(path.join(dir, plain))) {
    return plain;
  }
  return `${base}-samples.it-test.ts`;
}

/** @type {string | undefined} */
let uiModeOverride = process.env.SCREENSHOT_SUITE_UI;
const positionalArgs = [];

for (const arg of process.argv.slice(2)) {
  if (arg.startsWith('--ui=')) {
    uiModeOverride = arg.slice('--ui='.length);
    continue;
  }
  positionalArgs.push(arg);
}

const mode = positionalArgs[0];
if (mode !== 'test' && mode !== 'regenerate') {
  console.error('Usage: node bin/run-screenshot-test-suite.mjs <test|regenerate> [test-run] [suite] [--ui=listed|select]');
  process.exit(1);
}

const cliTestRunId = positionalArgs[1];
const cliSuite = positionalArgs[2];

if (!cliTestRunId && !process.stdin.isTTY) {
  console.error('Interactive screenshot suite runner requires a TTY.');
  console.error('Pass a test-run name, or run Jest directly from packages/api-doc-viewer/.');
  process.exit(1);
}

/**
 * @returns {'listed' | 'select'}
 */
function resolveUiMode() {
  if (uiModeOverride === 'select') {
    return 'select';
  }
  if (uiModeOverride === 'listed') {
    return 'listed';
  }
  // Legacy aliases from earlier iterations.
  if (uiModeOverride === 'simple' || uiModeOverride === 'clack') {
    return 'listed';
  }
  return 'listed';
}

const uiMode = resolveUiMode();

/**
 * @returns {Array<{ samplesDir: string, itSuiteId: string, layout: 'folder' | 'flat' | 'compatibility', itDir?: string, prefix?: string }>}
 */
function discoverTestRuns() {
  if (!fs.existsSync(samplesRoot)) {
    console.error(`Samples directory not found: ${samplesRoot}`);
    process.exit(1);
  }

  const itEntries = fs.readdirSync(itRoot, { withFileTypes: true });
  const testRuns = fs.readdirSync(samplesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !SAMPLES_DIR_IGNORE.has(entry.name))
    .map((entry) => {
      const samplesDir = entry.name;
      const itSuiteId = `${samplesDir}-suite`;
      const itDir = path.join(itRoot, itSuiteId);

      if (fs.existsSync(itDir) && fs.statSync(itDir).isDirectory()) {
        return { samplesDir, itSuiteId, layout: 'folder', itDir };
      }

      const prefix = `${itSuiteId}.`;
      const hasFlatTests = itEntries.some(
        (file) => file.isFile() && file.name.startsWith(prefix) && file.name.endsWith('.it-test.ts'),
      );

      if (!hasFlatTests) {
        return null;
      }

      return { samplesDir, itSuiteId, layout: 'flat', prefix };
    })
    .filter(Boolean);

  const knownIds = new Set(testRuns.map((testRun) => testRun.itSuiteId));

  for (const entry of itEntries) {
    if (
      entry.isDirectory()
      && !knownIds.has(entry.name)
      && entry.name !== 'service'
      && entry.name !== '__image_snapshots__'
    ) {
      const itDir = path.join(itRoot, entry.name);
      const hasSamples = fs.readdirSync(itDir).some((file) => file.endsWith('.it-test.ts'));
      if (hasSamples) {
        testRuns.push({
          samplesDir: entry.name,
          itSuiteId: entry.name,
          layout: 'folder',
          itDir,
        });
        knownIds.add(entry.name);
      }
    }
  }

  for (const entry of itEntries) {
    if (!entry.isFile() || !entry.name.endsWith('.it-test.ts')) {
      continue;
    }
    const separatorIndex = entry.name.indexOf('.');
    if (separatorIndex <= 0) {
      continue;
    }
    const itSuiteId = entry.name.slice(0, separatorIndex);
    if (knownIds.has(itSuiteId)) {
      continue;
    }
    testRuns.push({
      samplesDir: itSuiteId.replace(/-suite$/, ''),
      itSuiteId,
      layout: 'flat',
      prefix: `${itSuiteId}.`,
    });
    knownIds.add(itSuiteId);
  }

  // Listed even when the generated files are absent (gitignored); see ensureCompatibilityTests().
  for (const itSuiteId of COMPATIBILITY_TEST_RUN_IDS) {
    if (knownIds.has(itSuiteId)) {
      continue;
    }
    testRuns.push({
      samplesDir: `${COMPATIBILITY_SUITE_DIR} (generated)`,
      itSuiteId,
      layout: 'compatibility',
      itDir: path.join(itRoot, COMPATIBILITY_SUITE_DIR),
      prefix: `${itSuiteId}-`,
    });
    knownIds.add(itSuiteId);
  }

  return testRuns.sort((a, b) => a.itSuiteId.localeCompare(b.itSuiteId));
}

/**
 * @param {{ layout: string, itDir?: string, prefix?: string }} testRun
 * @returns {string[]}
 */
function listCompatibilityTestFiles(testRun) {
  if (!fs.existsSync(testRun.itDir)) {
    return [];
  }
  return fs.readdirSync(testRun.itDir)
    .filter((file) => file.startsWith(testRun.prefix) && file.endsWith(GENERATED_IT_TEST_SUFFIX));
}

/**
 * Generates the compatibility-suite ITs when none exist yet for this test run, so its suites
 * can be listed and targeted.
 *
 * @param {{ layout: string, itSuiteId: string, itDir?: string, prefix?: string }} testRun
 */
function ensureCompatibilityTests(testRun) {
  if (testRun.layout !== 'compatibility' || listCompatibilityTestFiles(testRun).length > 0) {
    return;
  }
  console.log(`No generated ITs found for ${testRun.itSuiteId} — running "npm run generate-tests".`);
  const result = spawnSync('npm run generate-tests', {
    cwd: packageRoot,
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

/**
 * @param {{ layout: 'folder' | 'flat', itDir?: string, prefix?: string }} testRun
 * @returns {string[]}
 */
function discoverSuites(testRun) {
  if (testRun.layout === 'compatibility') {
    return listCompatibilityTestFiles(testRun)
      .map((file) => file.slice(testRun.prefix.length, -GENERATED_IT_TEST_SUFFIX.length))
      .sort();
  }

  if (testRun.layout === 'folder') {
    return fs.readdirSync(testRun.itDir)
      .filter((file) => file.endsWith('.it-test.ts'))
      .map((file) => file.replace(IT_TEST_SUFFIX_RE, ''))
      .sort();
  }

  return fs.readdirSync(itRoot)
    .filter((file) => file.startsWith(testRun.prefix) && file.endsWith('.it-test.ts'))
    .map((file) => file.slice(testRun.prefix.length).replace(IT_TEST_SUFFIX_RE, ''))
    .sort();
}

/**
 * Regex path segment that Jest's `--testPathPatterns` needs to select every IT file
 * belonging to one test run, regardless of its on-disk layout.
 *
 * @param {{ layout: 'folder' | 'flat', itSuiteId: string, prefix?: string }} testRun
 * @returns {string}
 */
function testRunPatternSegment(testRun) {
  if (testRun.layout === 'compatibility') {
    return `src/it/${COMPATIBILITY_SUITE_DIR}/${testRun.prefix}`;
  }
  return testRun.layout === 'folder'
    ? `src/it/${testRun.itSuiteId}/`
    : `src/it/${testRun.prefix.replace('.', '\\.')}`;
}

/**
 * Resolves a typed answer against the list of test runs: a 1-based index, an exact
 * `itSuiteId`, or a name prefix. A prefix matching exactly one test run behaves like an
 * exact match; a prefix matching several is returned as a `'multiple'` selection so the
 * caller can run them together.
 *
 * @param {string} raw
 * @param {Array<{ itSuiteId: string }>} testRuns
 * @returns {{ type: 'single', testRun: object } | { type: 'multiple', testRuns: object[] } | undefined}
 */
function resolveTestRunSelection(raw, testRuns) {
  const answer = raw.trim();
  if (!answer) {
    return undefined;
  }

  const asNumber = Number.parseInt(answer, 10);
  if (Number.isInteger(asNumber) && asNumber >= 1 && asNumber <= testRuns.length) {
    return { type: 'single', testRun: testRuns[asNumber - 1] };
  }

  const exactMatch = testRuns.find((testRun) => testRun.itSuiteId === answer);
  if (exactMatch) {
    return { type: 'single', testRun: exactMatch };
  }

  const prefixMatches = testRuns.filter((testRun) => testRun.itSuiteId.startsWith(answer));
  if (prefixMatches.length === 1) {
    return { type: 'single', testRun: prefixMatches[0] };
  }
  if (prefixMatches.length > 1) {
    return { type: 'multiple', testRuns: prefixMatches };
  }

  return undefined;
}

/**
 * @param {{ layout: 'folder' | 'flat', itSuiteId: string, prefix?: string }} testRun
 * @param {string} suiteChoice
 * @returns {string}
 */
function resolveJestTarget(testRun, suiteChoice) {
  if (testRun.layout === 'compatibility') {
    return suiteChoice === WHOLE_SUITE_VALUE
      ? testRunPatternSegment(testRun)
      : `src/it/${COMPATIBILITY_SUITE_DIR}/${testRun.prefix}${suiteChoice}${GENERATED_IT_TEST_SUFFIX}`;
  }

  if (suiteChoice === WHOLE_SUITE_VALUE) {
    if (testRun.layout === 'folder') {
      return `src/it/${testRun.itSuiteId}`;
    }
    return `--testPathPatterns=${testRun.prefix.replace('.', '\\.')}.+\\.it-test\\.ts$`;
  }

  if (testRun.layout === 'folder') {
    return `src/it/${testRun.itSuiteId}/${resolveItTestFileName(testRun.itDir, suiteChoice)}`;
  }

  return `src/it/${resolveItTestFileName(itRoot, `${testRun.prefix}${suiteChoice}`)}`;
}

/**
 * @param {string} jestTarget
 * @param {boolean} [includesCompatibilityRun] regenerate mode refreshes the generated
 *   compatibility-suite ITs too when one of the selected test runs relies on them
 * @returns {number}
 */
function runScreenshotCommand(jestTarget, includesCompatibilityRun = false) {
  const jestCommand = mode === 'test'
    ? `npm run generate-tests && jest --maxWorkers 1 --verbose -c .config/it/it-test-docker.jest.config.cjs ${jestTarget}`
    : `${includesCompatibilityRun ? 'npm run generate-tests && ' : ''}jest --maxWorkers 1 --verbose --updateSnapshot -c .config/it/it-test-docker.jest.config.cjs ${jestTarget}`;

  const command = `npx start-server-and-test development:local-server:static http://localhost:9009 "${jestCommand}"`;
  const actionLabel = mode === 'test' ? 'Running screenshot test suite' : 'Regenerating screenshots';

  console.log('');
  console.log(`${actionLabel}:`);
  console.log(`  ${command}`);
  console.log('');

  const result = spawnSync(command, {
    cwd: packageRoot,
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });

  return result.status ?? 1;
}

/**
 * Runs every matched test run's whole suite together, as a single Jest invocation.
 * Each matched test run is passed as its own positional path pattern — Jest ORs multiple
 * positional patterns together internally (see `buildTestPathPattern` in `jest-config`), so
 * this needs no `|`/`()` alternation on the command line. That matters on Windows, where
 * `spawnSync(..., { shell: true })` runs through `cmd.exe`, which treats `|` and `()` as
 * shell metacharacters even inside quotes and would otherwise split the command apart.
 * Exits the process with the Jest exit code.
 *
 * @param {object[]} matchedTestRuns
 * @returns {never}
 */
function runMultipleTestRuns(matchedTestRuns) {
  const jestTarget = matchedTestRuns.map(testRunPatternSegment).join(' ');
  const runLabel = `${matchedTestRuns.length} test runs (${matchedTestRuns.map((testRun) => testRun.itSuiteId).join(', ')})`;

  console.log('');
  console.log('Matched test runs:');
  for (const testRun of matchedTestRuns) {
    console.log(`  - ${testRun.itSuiteId}`);
  }

  const runSpinner = spinner();
  runSpinner.start(`Starting ${runLabel}`);

  const exitCode = runScreenshotCommand(
    jestTarget,
    matchedTestRuns.some((testRun) => testRun.layout === 'compatibility'),
  );

  if (exitCode === 0) {
    runSpinner.stop(`Finished ${runLabel}`);
    outro('Done.');
  } else {
    runSpinner.stop(`Failed ${runLabel}`);
  }
  process.exit(exitCode);
}

/**
 * @param {unknown} value
 */
function exitIfCancelled(value) {
  if (isCancel(value)) {
    cancel('Cancelled.');
    process.exit(0);
  }
}

/**
 * @param {string} raw
 * @param {Array<{ value: string, label: string }>} options
 * @returns {string | undefined}
 */
function resolveChoiceFromAnswer(raw, options) {
  const answer = raw.trim();
  if (!answer) {
    return undefined;
  }

  const asNumber = Number.parseInt(answer, 10);
  if (Number.isInteger(asNumber) && asNumber >= 1 && asNumber <= options.length) {
    return options[asNumber - 1].value;
  }

  const exactMatch = options.find((option) => option.value === answer || option.label === answer);
  return exactMatch?.value;
}

/**
 * Static list + typed answer. Works in Git Bash MinTTY because it never redraws
 * the option list with cursor control — only prints it once via note().
 *
 * @param {string} message
 * @param {Array<{ value: string, label: string, hint?: string }>} options
 * @returns {Promise<string>}
 */
async function promptChoiceListed(message, options) {
  const listing = options
    .map((option, index) => {
      const hint = option.hint ? `  ${option.hint}` : '';
      return `${index + 1}. ${option.label}${hint}`;
    })
    .join('\n');

  note(listing, message);

  const answer = await text({
    message: 'Your choice',
    placeholder: '1',
    validate(raw) {
      if (!resolveChoiceFromAnswer(raw, options)) {
        return `Enter a number 1–${options.length} or an exact name`;
      }
    },
  });
  exitIfCancelled(answer);

  const resolved = resolveChoiceFromAnswer(answer, options);
  if (!resolved) {
    throw new Error('Unexpected empty choice after validation.');
  }
  return resolved;
}

/**
 * Arrow-key picker. Only reliable in terminals with full TTY cursor support.
 *
 * @param {string} message
 * @param {Array<{ value: string, label: string, hint?: string }>} options
 * @returns {Promise<string>}
 */
async function promptChoiceSelect(message, options) {
  const value = await select({
    message,
    options: options.map((option) => ({
      value: option.value,
      label: option.label,
      hint: option.hint,
    })),
  });
  exitIfCancelled(value);
  return value;
}

/**
 * @param {string} message
 * @param {Array<{ value: string, label: string, hint?: string }>} options
 * @returns {Promise<string>}
 */
async function promptChoice(message, options) {
  if (uiMode === 'select') {
    return promptChoiceSelect(message, options);
  }
  return promptChoiceListed(message, options);
}

/**
 * Static list + typed answer for the test-run step. Accepts a number, an exact
 * `itSuiteId`, or a name prefix — a prefix matching several test runs selects all of them.
 *
 * @param {object[]} testRuns
 * @returns {Promise<{ type: 'single', testRun: object } | { type: 'multiple', testRuns: object[] }>}
 */
async function promptTestRunSelectionListed(testRuns) {
  const listing = testRuns
    .map((testRun, index) => `${index + 1}. ${testRun.itSuiteId}  samples/${testRun.samplesDir}`)
    .join('\n');

  note(listing, 'Which test run do you want to execute?');

  const answer = await text({
    message: 'Your choice (number, exact name, or a name prefix to match several)',
    placeholder: '1',
    validate(raw) {
      if (!resolveTestRunSelection(raw, testRuns)) {
        return `Enter a number 1–${testRuns.length}, an exact name, or a prefix that matches at least one test run`;
      }
    },
  });
  exitIfCancelled(answer);

  const resolved = resolveTestRunSelection(answer, testRuns);
  if (!resolved) {
    throw new Error('Unexpected empty choice after validation.');
  }
  return resolved;
}

/**
 * Arrow-key picker for the test-run step. A dedicated "Search by name prefix…" entry
 * switches to a typed prefix, since arrow-key selects can't filter by typing here.
 *
 * @param {object[]} testRuns
 * @returns {Promise<{ type: 'single', testRun: object } | { type: 'multiple', testRuns: object[] }>}
 */
async function promptTestRunSelectionSelect(testRuns) {
  const PREFIX_SEARCH_VALUE = '__prefix_search__';

  const value = await select({
    message: 'Which test run do you want to execute?',
    options: [
      {
        value: PREFIX_SEARCH_VALUE,
        label: 'Search by name prefix…',
        hint: 'e.g. "json-schema" to match several test runs',
      },
      ...testRuns.map((testRun) => ({
        value: testRun.itSuiteId,
        label: testRun.itSuiteId,
        hint: `samples/${testRun.samplesDir}`,
      })),
    ],
  });
  exitIfCancelled(value);

  if (value !== PREFIX_SEARCH_VALUE) {
    return { type: 'single', testRun: testRuns.find((testRun) => testRun.itSuiteId === value) };
  }

  const prefixAnswer = await text({
    message: 'Enter a test run name prefix',
    placeholder: 'json-schema',
    validate(raw) {
      if (testRuns.filter((testRun) => testRun.itSuiteId.startsWith(raw.trim())).length === 0) {
        return 'No test run ids start with that prefix';
      }
    },
  });
  exitIfCancelled(prefixAnswer);

  const prefixMatches = testRuns.filter((testRun) => testRun.itSuiteId.startsWith(prefixAnswer.trim()));
  return prefixMatches.length === 1
    ? { type: 'single', testRun: prefixMatches[0] }
    : { type: 'multiple', testRuns: prefixMatches };
}

/**
 * @param {object[]} testRuns
 * @returns {Promise<{ type: 'single', testRun: object } | { type: 'multiple', testRuns: object[] }>}
 */
async function promptTestRunSelection(testRuns) {
  if (uiMode === 'select') {
    return promptTestRunSelectionSelect(testRuns);
  }
  return promptTestRunSelectionListed(testRuns);
}

const testRuns = discoverTestRuns();
if (testRuns.length === 0) {
  console.error('No screenshot test runs found under packages/samples/.');
  process.exit(1);
}

intro(mode === 'test' ? 'Screenshot test — single suite' : 'Regenerate screenshots — single suite');

/** @type {{ type: 'single', testRun: object } | { type: 'multiple', testRuns: object[] }} */
let testRunSelection;

if (cliTestRunId) {
  const knownIds = testRuns.map((testRun) => testRun.itSuiteId);
  if (knownIds.includes(cliTestRunId)) {
    testRunSelection = { type: 'single', testRun: testRuns.find((testRun) => testRun.itSuiteId === cliTestRunId) };
  } else {
    const prefixMatches = testRuns.filter((testRun) => testRun.itSuiteId.startsWith(cliTestRunId));
    if (prefixMatches.length === 0) {
      console.error(`Unknown test run: ${cliTestRunId}`);
      console.error(`Known test runs: ${knownIds.join(', ')}`);
      process.exit(1);
    }
    testRunSelection = prefixMatches.length === 1
      ? { type: 'single', testRun: prefixMatches[0] }
      : { type: 'multiple', testRuns: prefixMatches };
  }
} else {
  testRunSelection = await promptTestRunSelection(testRuns);
}

if (testRunSelection.type === 'multiple' && cliSuite) {
  console.error(
    `"${cliTestRunId}" matches multiple test runs (${testRunSelection.testRuns.map((testRun) => testRun.itSuiteId).join(', ')}); `
    + 'pass an exact test run id to target a specific suite.',
  );
  process.exit(1);
}

if (testRunSelection.type === 'multiple') {
  runMultipleTestRuns(testRunSelection.testRuns);
}

const testRun = testRunSelection.testRun;
ensureCompatibilityTests(testRun);
const suites = discoverSuites(testRun);

if (suites.length === 0) {
  console.error(`No screenshot suites found for ${testRun.itSuiteId}.`);
  process.exit(1);
}

let selectedSuite = cliSuite;
if (selectedSuite) {
  if (selectedSuite !== WHOLE_SUITE_VALUE && !suites.includes(selectedSuite)) {
    console.error(`Unknown suite: ${selectedSuite}`);
    console.error(`Known suites: ${suites.join(', ')}`);
    process.exit(1);
  }
} else if (cliTestRunId && !cliSuite) {
  selectedSuite = WHOLE_SUITE_VALUE;
} else {
  selectedSuite = await promptChoice(
    'Which test suite do you want to run?',
    [
      {
        value: WHOLE_SUITE_VALUE,
        label: 'Whole test run',
        hint: `${suites.length} suite${suites.length === 1 ? '' : 's'}`,
      },
      ...suites.map((suite) => ({
        value: suite,
        label: suite,
      })),
    ],
  );
}

const jestTarget = resolveJestTarget(testRun, selectedSuite);
const runLabel = selectedSuite === WHOLE_SUITE_VALUE
  ? `${testRun.itSuiteId} (whole run)`
  : `${testRun.itSuiteId} / ${selectedSuite}`;

const runSpinner = spinner();
runSpinner.start(`Starting ${runLabel}`);

const exitCode = runScreenshotCommand(jestTarget, testRun.layout === 'compatibility');

if (exitCode === 0) {
  runSpinner.stop(`Finished ${runLabel}`);
  outro('Done.');
} else {
  runSpinner.stop(`Failed ${runLabel}`);
  process.exit(exitCode);
}
