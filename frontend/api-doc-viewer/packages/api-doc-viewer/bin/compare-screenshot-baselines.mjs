#!/usr/bin/env node
/**
 * Compares the screenshot baselines of the current branch with those of a base branch (`develop` by
 * default) in a reg-cli report, even when the branch moved, renamed, or added baselines.
 *
 * Usage (from packages/api-doc-viewer):
 *   pnpm run compare-screenshot-baselines
 *   pnpm run compare-screenshot-baselines -- --base main --no-fetch --no-serve --port 9124
 *
 * Options:
 *   --base <branch>  base branch, `develop` by default; `origin/<branch>` is used when it exists
 *   --no-fetch       skip `git fetch origin <branch>` (the local branch is never moved)
 *   --no-serve       write the report and exit instead of serving it
 *   --port <number>  port of the local report server, 9123 by default
 *
 * Steps:
 * 1. Lists the baselines (`src/it/**\/__image_snapshots__/*.png`) of the working tree, uncommitted
 *    changes included, and of the base branch.
 * 2. Maps each base baseline to a branch baseline, by the first rule that matches exactly one file:
 *    the same path; the same filename; a base filename that is `<prefix>-<branch filename>` (an IT
 *    that moved from `src/it/` into a test-run folder); the same image content. A base baseline that
 *    matches nothing is reported as deleted, a branch baseline that nothing maps to as new.
 * 3. Writes both sides as flat folders with the branch filenames into
 *    `.baseline-comparison/<branch><n>/` (gitignored; earlier runs are kept), runs reg-cli there,
 *    and labels the report sides with the branch names.
 * 4. Serves `.baseline-comparison/` on 127.0.0.1 and opens the report: Chrome cannot open a
 *    `file://` path longer than 260 characters on Windows, and the flat filenames are long.
 */
import { execFileSync, execSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REG_CLI = 'reg-cli@0.18.16';
const DEFAULT_BASE = 'develop';
const DEFAULT_PORT = 9123;
const SERVER_START_TIMEOUT_MS = 30_000;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, '..');
const itRoot = path.join(packageRoot, 'src/it');
const outputRoot = path.join(packageRoot, '.baseline-comparison');

const options = parseOptions(process.argv.slice(2));
const repoRoot = git('rev-parse', '--show-toplevel').trim();
const itPathInRepo = path.relative(repoRoot, itRoot).split(path.sep).join('/') + '/';

const branchName = currentBranchName();
const baseRef = resolveBaseRef(options.base, options.fetch);
const branchFolder = toFolderName(branchName);
const baseFolder = toFolderName(options.base) === branchFolder ? `${branchFolder}-base` : toFolderName(options.base);

console.log(`Comparing the working tree of ${branchName} with ${baseRef} (${git('rev-parse', '--short', baseRef).trim()}).`);

const branchBaselines = listWorkingTreeBaselines();
const baseBaselines = listBaseBaselines(baseRef);
const { mappings, branchOnly, baseOnly } = mapBaselines(baseBaselines, branchBaselines);

const runName = nextRunName(branchFolder);
const runDir = path.join(outputRoot, runName);
fs.mkdirSync(path.join(runDir, branchFolder), { recursive: true });
fs.mkdirSync(path.join(runDir, baseFolder), { recursive: true });

for (const baseline of branchBaselines) {
  fs.copyFileSync(path.join(itRoot, baseline.rel), path.join(runDir, branchFolder, flatName(baseline.rel)));
}
const baseTargets = [
  ...mappings.map(({ base, branch }) => [base, flatName(branch.rel)]),
  ...baseOnly.map((base) => [base, `${baseFolder}-only__${flatName(base.rel)}`]),
];
await writeBlobs(baseTargets, path.join(runDir, baseFolder));
writeMappingTable(path.join(runDir, 'mapping.tsv'));

runRegCli();
labelReport(path.join(runDir, 'report.html'), `${options.base} @ ${git('rev-parse', '--short', baseRef).trim()}`, `${branchName} (working tree)`);
printSummary();

if (options.serve) {
  await serveReport(`${runName}/report.html`);
} else {
  console.log(`Report: ${path.join(runDir, 'report.html')}`);
  console.log('Open it through a local server; on Windows a file:// URL fails for paths over 260 characters.');
}

function parseOptions(args) {
  const parsed = { base: DEFAULT_BASE, fetch: true, serve: true, port: DEFAULT_PORT };
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--base') {
      parsed.base = requireValue(args, ++index, arg);
    } else if (arg === '--port') {
      parsed.port = Number(requireValue(args, ++index, arg));
      if (!Number.isInteger(parsed.port)) {
        throw new Error(`--port needs a number, got ${args[index]}`);
      }
    } else if (arg === '--no-fetch') {
      parsed.fetch = false;
    } else if (arg === '--no-serve') {
      parsed.serve = false;
    } else if (arg !== '--') {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  return parsed;
}

function requireValue(args, index, name) {
  const value = args[index];
  if (value === undefined || value.startsWith('--')) {
    throw new Error(`${name} needs a value`);
  }
  return value;
}

function git(...args) {
  return execFileSync('git', args, { cwd: packageRoot, maxBuffer: 1 << 28 }).toString();
}

function gitSucceeds(...args) {
  try {
    execFileSync('git', args, { cwd: packageRoot, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function currentBranchName() {
  const name = git('rev-parse', '--abbrev-ref', 'HEAD').trim();
  return name === 'HEAD' ? git('rev-parse', '--short', 'HEAD').trim() : name;
}

function resolveBaseRef(base, fetch) {
  if (fetch) {
    console.log(`Fetching origin/${base}...`);
    if (!gitSucceeds('fetch', 'origin', base)) {
      console.warn(`git fetch origin ${base} failed; comparing with the last fetched state.`);
    }
  }
  if (gitSucceeds('rev-parse', '--verify', '--quiet', `origin/${base}`)) {
    return `origin/${base}`;
  }
  if (gitSucceeds('rev-parse', '--verify', '--quiet', base)) {
    return base;
  }
  throw new Error(`Neither origin/${base} nor ${base} exists`);
}

function toFolderName(name) {
  return name.replace(/[^A-Za-z0-9._-]+/g, '-');
}

/** A baseline under `src/it/`: `rel` is its path from there, with `/` separators. */
function isBaselinePath(rel) {
  const segments = rel.split('/');
  return rel.endsWith('.png') && segments.includes('__image_snapshots__')
    && !segments.includes('__diff_output__') && !segments.includes('__received_output__');
}

function listWorkingTreeBaselines() {
  const rels = fs.readdirSync(itRoot, { recursive: true })
    .map((entry) => entry.split(path.sep).join('/'))
    .filter(isBaselinePath)
    .sort();
  return rels.map((rel) => ({ rel, blob: gitBlobId(path.join(itRoot, rel)), base: path.posix.basename(rel) }));
}

/**
 * The id git gives the file's content, so a working-tree image and a base blob compare by id. Computed
 * here because `git hash-object` cannot open a path over 260 characters on Windows without
 * `core.longpaths`, and many baseline paths are longer.
 */
function gitBlobId(file) {
  const content = fs.readFileSync(file);
  return createHash('sha1').update(`blob ${content.length}\0`).update(content).digest('hex');
}

function listBaseBaselines(ref) {
  // From the repository root: a pathspec is relative to the working directory of git.
  return execFileSync('git', ['ls-tree', '-r', ref, '--', itPathInRepo], { cwd: repoRoot, maxBuffer: 1 << 28 })
    .toString()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [meta, file] = line.split('\t');
      const rel = file.slice(itPathInRepo.length);
      return { rel, blob: meta.split(' ')[2], base: path.posix.basename(rel) };
    })
    .filter(({ rel }) => isBaselinePath(rel));
}

function mapBaselines(base, branch) {
  const result = [];
  const mappedBase = new Set();
  const mappedBranch = new Set();
  const link = (baseBaseline, branchBaseline, rule) => {
    result.push({ base: baseBaseline, branch: branchBaseline, rule });
    mappedBase.add(baseBaseline);
    mappedBranch.add(branchBaseline);
  };
  const unmappedBase = () => base.filter((baseline) => !mappedBase.has(baseline));
  const unmappedBranch = () => branch.filter((baseline) => !mappedBranch.has(baseline));

  const branchByRel = new Map(branch.map((baseline) => [baseline.rel, baseline]));
  for (const baseBaseline of base) {
    const branchBaseline = branchByRel.get(baseBaseline.rel);
    if (branchBaseline) {
      link(baseBaseline, branchBaseline, 'same-path');
    }
  }

  linkUnique(unmappedBase(), unmappedBranch(), (baseline) => [baseline.base], (baseline) => baseline.base, 'same-filename');
  linkUnique(unmappedBase(), unmappedBranch(), prefixedFilenameKeys, (baseline) => baseline.base, 'prefixed-filename');
  linkUnique(unmappedBase(), unmappedBranch(), (baseline) => [baseline.blob], (baseline) => baseline.blob, 'same-content');

  return { mappings: result, branchOnly: unmappedBranch(), baseOnly: unmappedBase() };

  /** Links a base and a branch baseline when they are the only two with a key in common. */
  function linkUnique(baseCandidates, branchCandidates, baseKeysOf, branchKeyOf, rule) {
    const baseByKey = groupByKeys(baseCandidates, baseKeysOf);
    const branchByKey = groupByKeys(branchCandidates, (baseline) => [branchKeyOf(baseline)]);
    for (const [key, branchMatches] of branchByKey) {
      const baseMatches = baseByKey.get(key) ?? [];
      const [baseBaseline] = baseMatches;
      if (branchMatches.length === 1 && baseMatches.length === 1 && !mappedBase.has(baseBaseline)) {
        link(baseBaseline, branchMatches[0], rule);
      }
    }
  }
}

/** `<prefix>-<filename>` keys of a base filename: every suffix that starts after a hyphen. */
function prefixedFilenameKeys(baseline) {
  const keys = [];
  for (let index = baseline.base.indexOf('-'); index !== -1; index = baseline.base.indexOf('-', index + 1)) {
    keys.push(baseline.base.slice(index + 1));
  }
  return keys;
}

function groupByKeys(items, keysOf) {
  const groups = new Map();
  for (const item of items) {
    for (const key of new Set(keysOf(item))) {
      groups.set(key, [...(groups.get(key) ?? []), item]);
    }
  }
  return groups;
}

/** `openapi-suite/__image_snapshots__/x.png` -> `openapi-suite__x.png`, so a flat folder keeps the test run. */
function flatName(rel) {
  const folder = path.posix.dirname(rel).replace(/\/?__image_snapshots__$/, '');
  return (folder && folder !== '.' ? `${folder.replaceAll('/', '__')}__` : '') + path.posix.basename(rel);
}

function nextRunName(prefix) {
  const pattern = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)$`);
  const used = fs.existsSync(outputRoot)
    ? fs.readdirSync(outputRoot).map((name) => pattern.exec(name)?.[1]).filter(Boolean).map(Number)
    : [];
  return `${prefix}${Math.max(0, ...used) + 1}`;
}

/** Writes git blobs to files through one `git cat-file --batch` process. */
function writeBlobs(targets, folder) {
  return new Promise((resolve, reject) => {
    const catFile = spawn('git', ['cat-file', '--batch'], { cwd: packageRoot });
    let buffer = Buffer.alloc(0);
    let written = 0;
    catFile.stdout.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      while (written < targets.length) {
        const headerEnd = buffer.indexOf(10);
        if (headerEnd === -1) {
          return;
        }
        const size = Number(buffer.subarray(0, headerEnd).toString().split(' ')[2]);
        if (buffer.length < headerEnd + 1 + size + 1) {
          return;
        }
        fs.writeFileSync(path.join(folder, targets[written][1]), buffer.subarray(headerEnd + 1, headerEnd + 1 + size));
        buffer = buffer.subarray(headerEnd + 1 + size + 1);
        written++;
      }
    });
    catFile.on('error', reject);
    catFile.on('close', (code) => {
      if (code === 0 && written === targets.length) {
        resolve();
      } else {
        reject(new Error(`git cat-file exited with ${code} after ${written} of ${targets.length} blobs`));
      }
    });
    catFile.stdin.end(targets.map(([baseline]) => baseline.blob).join('\n') + '\n');
  });
}

function writeMappingTable(file) {
  const rows = [
    ['rule', 'report filename', `${branchName} path`, `${options.base} path`, 'identical'],
    ...mappings.map(({ rule, base, branch }) => [rule, flatName(branch.rel), branch.rel, base.rel, String(base.blob === branch.blob)]),
    ...branchOnly.map((branch) => ['new', flatName(branch.rel), branch.rel, '', '']),
    ...baseOnly.map((base) => ['deleted', `${baseFolder}-only__${flatName(base.rel)}`, '', base.rel, '']),
  ];
  fs.writeFileSync(file, rows.map((row) => row.join('\t')).join('\n') + '\n');
}

function runRegCli() {
  console.log(`Running ${REG_CLI}...`);
  const result = runInRunDir(
    `pnpm dlx ${REG_CLI} "${branchFolder}" "${baseFolder}" diff -R report.html -J reg.json -I -C 8`,
  );
  if (result.status !== 0) {
    process.stdout.write(result.output);
    throw new Error(`reg-cli exited with ${result.status}`);
  }
  // reg-cli prints a line per image; keep its totals.
  for (const line of result.output.split('\n').filter((text) => /file\(s\)/.test(text))) {
    console.log(`  ${line.trim()}`);
  }
}

/** One command line, run through the shell: `pnpm` is `pnpm.cmd` on Windows. */
function runInRunDir(command) {
  try {
    const stdout = execSync(command, { cwd: runDir, maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] });
    return { status: 0, output: stdout.toString() };
  } catch (error) {
    return { status: error.status ?? 1, output: `${error.stdout ?? ''}${error.stderr ?? ''}` };
  }
}

/** The reg-cli report calls the sides "Before" and "After"; name the branches next to them. */
function labelReport(file, beforeLabel, afterLabel) {
  let html = fs.readFileSync(file, 'utf8');
  const replacements = [
    ['children:"Before"', `children:${JSON.stringify(`Before: ${beforeLabel}`)}`],
    ['children:"After"', `children:${JSON.stringify(`After: ${afterLabel}`)}`],
    ['<title>Comparison Report - REG</title>', `<title>${escapeHtml(beforeLabel)} vs ${escapeHtml(afterLabel)} - REG</title>`],
    ['</body>', `${legendHtml(beforeLabel, afterLabel)}\n</body>`],
  ];
  for (const [from, to] of replacements) {
    if (html.includes(from)) {
      html = html.replaceAll(from, to);
    } else {
      console.warn(`The report has no "${from}"; that label is left out.`);
    }
  }
  fs.writeFileSync(file, html);
}

function legendHtml(beforeLabel, afterLabel) {
  return `<div style="position:fixed;right:12px;bottom:12px;z-index:9999;max-width:520px;padding:8px 12px;border-radius:6px;
  background:#00303c;color:#fff;font:12px/1.5 'Roboto Mono',monospace;box-shadow:0 2px 8px rgba(0,0,0,.3);opacity:.92">
  <div><b>Before</b> (expected, left in 2up) = ${escapeHtml(beforeLabel)}</div>
  <div><b>After</b> (actual, right in 2up) = ${escapeHtml(afterLabel)}</div>
  <div style="opacity:.7">Changed = mapped baseline differs &middot; New = branch only &middot; Deleted = base only</div>
</div>`;
}

function escapeHtml(text) {
  return text.replace(/[&<>"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character]);
}

function printSummary() {
  const count = (rule) => mappings.filter((mapping) => mapping.rule === rule).length;
  console.log(`Baselines: ${branchBaselines.length} in ${branchName}, ${baseBaselines.length} in ${baseRef}.`);
  console.log(`Mapped ${mappings.length}: same path ${count('same-path')}, same filename ${count('same-filename')}, `
    + `prefixed filename ${count('prefixed-filename')}, same content ${count('same-content')}.`);
  console.log(`New in ${branchName}: ${branchOnly.length}. Only in ${options.base}: ${baseOnly.length}.`);
  for (const base of baseOnly) {
    console.log(`  only in ${options.base}: ${base.rel}`);
  }
  console.log(`Mapping table: ${path.join(runDir, 'mapping.tsv')}`);
}

async function serveReport(reportPath) {
  const url = `http://127.0.0.1:${options.port}/${reportPath}`;
  if (await respondsOk(url)) {
    console.log(`A server already serves ${outputRoot} on port ${options.port}.`);
    openInBrowser(url);
    return;
  }
  const server = spawn(`pnpm exec ws --hostname 127.0.0.1 -p ${options.port} -d "${outputRoot}"`, {
    cwd: packageRoot,
    shell: true,
    stdio: 'inherit',
  });
  const deadline = Date.now() + SERVER_START_TIMEOUT_MS;
  while (!(await respondsOk(url))) {
    if (Date.now() > deadline || server.exitCode !== null) {
      server.kill();
      throw new Error(`The report server did not start on port ${options.port}; try --port <number>`);
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  openInBrowser(url);
  console.log(`Serving ${outputRoot}; earlier reports stay available. Press Ctrl+C to stop.`);
}

async function respondsOk(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

function openInBrowser(url) {
  console.log(`Report: ${url}`);
  const [command, args] = process.platform === 'win32'
    ? ['cmd', ['/c', 'start', '""', url]]
    : [process.platform === 'darwin' ? 'open' : 'xdg-open', [url]];
  spawn(command, args, { stdio: 'ignore', detached: true }).on('error', () => {
    console.log('Open the report URL in a browser.');
  }).unref();
}
