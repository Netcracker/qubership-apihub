import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

const workflow = readFileSync('../../.github/workflows/pages.yml', 'utf8');
const ci = readFileSync('../../.github/workflows/ci.yml', 'utf8');
const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as Record<string, Record<string, string>>;

test('DATA-3 SEC-5: the board is assembled by the existing Pages workflow without collecting PR data', () => {
  assert.match(workflow, /sites\/pr-board\/dist/);
  assert.match(workflow, /--pr-board/);
  assert.doesNotMatch(workflow, /scripts\/build-site|GH_ACCESS_TOKEN/);
  assert.equal(pkg.scripts.build, 'vite build');
  assert.match(workflow, /persist-credentials: false/);
});

test('SEC-6: Pages retains the deployment gate and serializes publication', () => {
  assert.match(workflow, /pages: write/);
  assert.match(workflow, /id-token: write/);
  assert.match(workflow, /PAGES_DEPLOY == 'true'/);
  assert.match(workflow, /cancel-in-progress: false/);
});

test('unit, browser, and Linux screenshot checks run in monorepo CI', () => {
  assert.match(ci, /nx affected -t build test/);
  assert.match(ci, /nx run pr-board:test:e2e/);
  assert.match(pkg.scripts['test:e2e'], /--project=e2e$/);
  assert.match(ci, /run test:linux --project=screenshots/);
  assert.equal(pkg.scripts['test:linux'], 'node scripts/linux-checks.ts');
});

test('SEC-7: packages that touch untrusted content and DOM test tooling are pinned to exact versions', () => {
  const versions = { ...pkg.dependencies, ...pkg.devDependencies };
  for (const name of ['marked', 'dompurify', 'jsdom', '@playwright/test', '@fontsource/ibm-plex-sans', '@fontsource/ibm-plex-mono']) {
    assert.match(versions[name], /^\d+\.\d+\.\d+$/, name + ' ' + versions[name]);
  }
});

test('QUAL-6: colors in the stylesheets come only from the theme tokens', () => {
  const RAW_COLOR = /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i;
  for (const file of readdirSync('src/styles').filter((f) => f.endsWith('.css') && f !== 'tokens.css')) {
    const raw = readFileSync('src/styles/' + file, 'utf8').split('\n').filter((line) => RAW_COLOR.test(line));
    assert.deepEqual(raw, [], file);
  }
  const tokens = readFileSync('src/styles/tokens.css', 'utf8');
  assert.equal(tokens.match(/--surface:/g)?.length, 3, 'light, system dark, and chosen dark');
  // The dark theme is written twice, for the system setting and for the chosen theme; the two copies must not drift.
  const declarations = (block: string) => [...block.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)].map((m) => m[1] + ':' + m[2].trim()).sort();
  const blocks = [...tokens.matchAll(/\{([^{}]*--surface:[^{}]*)\}/g)].map((m) => declarations(m[1]));
  assert.equal(blocks.length, 3);
  assert.deepEqual(blocks[1], blocks[2], 'the system dark and the chosen dark tokens are the same');
  // Every token that differs by theme is set in the dark theme too; fonts, label ink, and issue type colors are shared.
  const THEMED = /^--(bg|surface|fg|muted|line|accent|bad|warn|running|good|idle|example-ink|shadow|backdrop|group)/;
  const dark = new Set(blocks[1].map((d) => d.split(':')[0]));
  const missing = blocks[0].map((d) => d.split(':')[0]).filter((name) => THEMED.test(name) && !dark.has(name));
  assert.deepEqual(missing, [], 'light tokens without a dark value');
});

test('the README shows only screenshots that exist, so a renamed baseline cannot leave a broken picture', () => {
  const readme = readFileSync('README.md', 'utf8');
  const images = [...readme.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map((m) => m[1]);
  assert.ok(images.length >= 5);
  assert.deepEqual(images.filter((file) => !existsSync(file)), []);
});
