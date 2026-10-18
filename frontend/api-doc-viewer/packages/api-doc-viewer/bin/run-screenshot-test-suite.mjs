#!/usr/bin/env node
/**
 * Interactive runner for a single screenshot IT suite (or whole test run for one category).
 *
 * Usage:
 *   node bin/run-screenshot-test-suite.mjs test
 *   node bin/run-screenshot-test-suite.mjs regenerate
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cancel, intro, isCancel, outro, select, spinner } from '@clack/prompts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, '..');
const samplesRoot = path.resolve(packageRoot, '../samples');
const itRoot = path.resolve(packageRoot, 'src/it');

const WHOLE_SUITE_VALUE = '__whole__';
const SAMPLES_DIR_IGNORE = new Set(['fixtures', 'src']);

const mode = process.argv[2];
if (mode !== 'test' && mode !== 'regenerate') {
  console.error('Usage: node bin/run-screenshot-test-suite.mjs <test|regenerate>');
  process.exit(1);
}

if (!process.stdin.isTTY) {
  console.error('Interactive screenshot suite runner requires a TTY.');
  console.error('Run Jest directly from packages/api-doc-viewer/ instead.');
  process.exit(1);
}

/**
 * @returns {Array<{ samplesDir: string, itSuiteId: string, layout: 'folder' | 'flat', itDir?: string, prefix?: string }>}
 */
function discoverTestRuns() {
  if (!fs.existsSync(samplesRoot)) {
    console.error(`Samples directory not found: ${samplesRoot}`);
    process.exit(1);
  }

  return fs.readdirSync(samplesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !SAMPLES_DIR_IGNORE.has(entry.name))
    .map((entry) => {
      const samplesDir = entry.name;
      const itSuiteId = `${samplesDir}-suite`;
      const itDir = path.join(itRoot, itSuiteId);

      if (fs.existsSync(itDir) && fs.statSync(itDir).isDirectory()) {
        return { samplesDir, itSuiteId, layout: 'folder', itDir };
      }

      const prefix = `${itSuiteId}.`;
      const hasFlatTests = fs.readdirSync(itRoot).some(
        (file) => file.startsWith(prefix) && file.endsWith('.it-test.ts'),
      );

      if (!hasFlatTests) {
        return null;
      }

      return { samplesDir, itSuiteId, layout: 'flat', prefix };
    })
    .filter(Boolean)
    .sort((a, b) => a.itSuiteId.localeCompare(b.itSuiteId));
}

/**
 * @param {{ layout: 'folder' | 'flat', itDir?: string, prefix?: string }} testRun
 * @returns {string[]}
 */
function discoverSuites(testRun) {
  if (testRun.layout === 'folder') {
    return fs.readdirSync(testRun.itDir)
      .filter((file) => file.endsWith('-samples.it-test.ts'))
      .map((file) => file.replace(/-samples\.it-test\.ts$/, ''))
      .sort();
  }

  return fs.readdirSync(itRoot)
    .filter((file) => file.startsWith(testRun.prefix) && file.endsWith('-samples.it-test.ts'))
    .map((file) => file.slice(testRun.prefix.length).replace(/-samples\.it-test\.ts$/, ''))
    .sort();
}

/**
 * @param {{ layout: 'folder' | 'flat', itSuiteId: string, prefix?: string }} testRun
 * @param {string} suiteChoice
 * @returns {string}
 */
function resolveJestTarget(testRun, suiteChoice) {
  if (suiteChoice === WHOLE_SUITE_VALUE) {
    if (testRun.layout === 'folder') {
      return `src/it/${testRun.itSuiteId}`;
    }
    return `--testPathPattern=${testRun.prefix.replace('.', '\\.')}.+-samples\\.it-test\\.ts$`;
  }

  if (testRun.layout === 'folder') {
    return `src/it/${testRun.itSuiteId}/${suiteChoice}-samples.it-test.ts`;
  }

  return `src/it/${testRun.prefix}${suiteChoice}-samples.it-test.ts`;
}

/**
 * @param {string} jestTarget
 * @returns {number}
 */
function runScreenshotCommand(jestTarget) {
  const jestCommand = mode === 'test'
    ? `npm run generate-tests && jest --maxWorkers 1 --verbose -c .config/it/it-test-docker.jest.config.cjs ${jestTarget}`
    : `jest --maxWorkers 1 --verbose --updateSnapshot -c .config/it/it-test-docker.jest.config.cjs ${jestTarget}`;

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

function exitIfCancelled(value) {
  if (isCancel(value)) {
    cancel('Cancelled.');
    process.exit(0);
  }
}

const testRuns = discoverTestRuns();
if (testRuns.length === 0) {
  console.error('No screenshot test runs found under packages/samples/.');
  process.exit(1);
}

intro(mode === 'test' ? 'Screenshot test — single suite' : 'Regenerate screenshots — single suite');

const selectedTestRunId = await select({
  message: 'Which test run do you want to execute?',
  options: testRuns.map((testRun) => ({
    value: testRun.itSuiteId,
    label: testRun.itSuiteId,
    hint: `samples/${testRun.samplesDir}`,
  })),
});
exitIfCancelled(selectedTestRunId);

const testRun = testRuns.find((entry) => entry.itSuiteId === selectedTestRunId);
const suites = discoverSuites(testRun);

if (suites.length === 0) {
  console.error(`No screenshot suites found for ${testRun.itSuiteId}.`);
  process.exit(1);
}

const selectedSuite = await select({
  message: 'Which test suite do you want to run?',
  options: [
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
});
exitIfCancelled(selectedSuite);

const jestTarget = resolveJestTarget(testRun, selectedSuite);
const runLabel = selectedSuite === WHOLE_SUITE_VALUE
  ? `${testRun.itSuiteId} (whole run)`
  : `${testRun.itSuiteId} / ${selectedSuite}`;

const runSpinner = spinner();
runSpinner.start(`Starting ${runLabel}`);

const exitCode = runScreenshotCommand(jestTarget);

if (exitCode === 0) {
  runSpinner.stop(`Finished ${runLabel}`);
  outro('Done.');
} else {
  runSpinner.stop(`Failed ${runLabel}`);
  process.exit(exitCode);
}
