import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Stage the workspace so Linux never rewrites the host's node_modules.
const moduleRoot = fileURLToPath(new URL('../', import.meta.url));
const root = resolve(moduleRoot, '../..');
const pkg = JSON.parse(readFileSync(join(moduleRoot, 'package.json'), 'utf8'));
const rootPkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const image = `mcr.microsoft.com/playwright:v${pkg.devDependencies['@playwright/test']}-noble`;
const engine = process.env.PR_BOARD_CONTAINER_ENGINE || (process.platform === 'win32' ? 'podman' : 'docker');
const stage = mkdtempSync(join(tmpdir(), 'pr-board-linux-'));
const ignored = new Set(['node_modules', 'dist', '.logs', 'test-results', 'playwright-report', '__screenshots__']);
const snapshots = join(moduleRoot, 'e2e/__screenshots__');
const artifacts = join(moduleRoot, '.logs/linux');
mkdirSync(artifacts, { recursive: true });

try {
  for (const file of ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'patches']) {
    cpSync(join(root, file), join(stage, file), { recursive: true });
  }
  cpSync(moduleRoot, join(stage, 'sites/pr-board'), {
    recursive: true,
    filter: (path) => !ignored.has(basename(path)),
  });
  mkdirSync(join(stage, 'sites/pr-board/e2e/__screenshots__'));
  const result = spawnSync(engine, [
    'run', '--rm', '--init', '--ipc=host', '-e', 'CI',
    '--mount', `type=bind,source=${stage},target=/source,readonly`,
    '--mount', `type=bind,source=${snapshots},target=/work/sites/pr-board/e2e/__screenshots__`,
    '--mount', `type=bind,source=${artifacts},target=/artifacts`,
    '-w', '/work', image, 'bash', '-c',
    'set -euo pipefail\n' +
    'cp -r /source/. /work/\n' +
    'npm install --global "$1" --ignore-scripts\n' +
    'pnpm install --filter @netcracker/qubership-apihub-pr-board --frozen-lockfile --ignore-scripts\n' +
    'cd sites/pr-board\n' +
    'trap \'cp -r test-results playwright-report /artifacts/ 2>/dev/null || true\' EXIT\n' +
    'shift\n' +
    'pnpm exec playwright test "$@"',
    '--', rootPkg.packageManager, ...process.argv.slice(2),
  ], { stdio: 'inherit' });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(stage, { recursive: true, force: true });
}
