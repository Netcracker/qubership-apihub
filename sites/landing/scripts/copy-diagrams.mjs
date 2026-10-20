// Copies the architecture diagrams from docs/images/architecture/, their one home, into
// public/images/architecture/ so that Astro serves them. The target folder is git-ignored.
import { cpSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, '..', '..', 'docs', 'images', 'architecture');
const target = join(root, 'public', 'images', 'architecture');

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
for (const name of readdirSync(source).filter((file) => file.endsWith('.svg'))) {
  cpSync(join(source, name), join(target, name));
}
