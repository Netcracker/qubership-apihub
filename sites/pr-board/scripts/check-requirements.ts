// Fails when a requirement in docs/requirements/ has no unit or browser test, an id is defined twice, or a test names
// an unknown id.
// Usage: node scripts/check-requirements.ts

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { checkRequirements } from './requirements.ts';

function read(dir: string, pattern: RegExp): Record<string, string> {
  const files: Record<string, string> = {};
  for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !pattern.test(entry.name)) continue;
    const file = path.join(entry.parentPath, entry.name);
    files[file] = readFileSync(file, 'utf8');
  }
  return files;
}

const result = checkRequirements(
  read('docs/requirements', /\.md$/),
  { ...read('test', /\.test\.ts$/), ...read('e2e', /\.spec\.ts$/) },
);
const total = result.covered.length + result.missing.length + result.planned.length + result.manual.length;
console.log('Requirements with tests: ' + result.covered.length + ' of ' + total
  + (result.planned.length ? '; planned: ' + result.planned.join(', ') : '')
  + (result.manual.length ? '; checked by hand: ' + result.manual.join(', ') : '')
  + (result.removed.length ? '; removed: ' + result.removed.join(', ') : ''));
if (result.missing.length) console.error('Requirements without a test: ' + result.missing.join(', '));
for (const { id, file } of result.unknown) console.error('Unknown requirement ' + id + ' in ' + file);
for (const { id, file } of result.stale) console.error('Removed requirement ' + id + ' still named in ' + file);
for (const id of result.duplicate) console.error('Requirement ' + id + ' is defined more than once');
if (result.missing.length || result.unknown.length || result.stale.length || result.duplicate.length) process.exit(1);
