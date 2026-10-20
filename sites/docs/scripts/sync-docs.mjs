// Copies the Markdown of docs/ into src/content/docs/ and the images it uses into public/, so that
// Starlight builds the site from the repository's one copy of the docs. Both targets are
// git-ignored and rebuilt on every run. The rules live in sync-docs-lib.mjs; astro.config.mjs
// calls collectPages() for the sidebar.
//
//   node scripts/sync-docs.mjs     (run by the dev and build scripts)
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  contentPathOf,
  isIndexSource,
  isPageSource,
  isPublished,
  slugOf,
  slugProblems,
  transformPage,
} from './sync-docs-lib.mjs';

const siteRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(siteRoot, '..', '..');
const docsRoot = join(repoRoot, 'docs');
const contentRoot = join(siteRoot, 'src', 'content', 'docs');
const publicRoot = join(siteRoot, 'public');
// The landing's favicon, its one home.
const favicon = join(repoRoot, 'sites', 'landing', 'public', 'favicon.svg');

const toPosix = (p) => p.split(sep).join('/');

// Every published Markdown file of docs/, as paths relative to docs/, sorted.
function listSources() {
  const found = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      const rel = toPosix(relative(docsRoot, full));
      if (!isPublished(rel)) continue;
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && isPageSource(rel)) found.push(rel);
    }
  };
  walk(docsRoot);
  return found.sort();
}

function makeTree(sources) {
  const pages = new Set(sources);
  return {
    isDir(repoRel) {
      try {
        return statSync(join(repoRoot, repoRel)).isDirectory();
      } catch {
        return false;
      }
    },
    hasPage: (docsRel) => pages.has(docsRel),
  };
}

// The transformed pages of docs/, without writing anything.
// Returns [{ source, slug, isIndex, title, hints, content, assets }].
export function collectPages() {
  const sources = listSources();
  const problems = slugProblems(sources);
  if (problems.length) throw new Error(`docs/ cannot be published:\n  ${problems.join('\n  ')}`);
  const tree = makeTree(sources);
  return sources.map((rel) => {
    const page = transformPage(rel, readFileSync(join(docsRoot, rel), 'utf8'), tree);
    return { source: rel, slug: slugOf(rel), isIndex: isIndexSource(rel), ...page };
  });
}

function sync() {
  const pages = collectPages();
  rmSync(contentRoot, { recursive: true, force: true });
  rmSync(publicRoot, { recursive: true, force: true });
  mkdirSync(publicRoot, { recursive: true });
  cpSync(favicon, join(publicRoot, 'favicon.svg'));

  const missing = [];
  const copied = new Set();
  for (const page of pages) {
    const target = join(contentRoot, contentPathOf(page.source));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, page.content);
    for (const asset of page.assets) {
      if (copied.has(asset.to)) continue;
      const from = join(repoRoot, asset.from);
      if (!existsSync(from)) {
        missing.push(`docs/${page.source} uses ${asset.from}, which does not exist`);
        continue;
      }
      const to = join(publicRoot, asset.to);
      mkdirSync(dirname(to), { recursive: true });
      cpSync(from, to);
      copied.add(asset.to);
    }
  }
  if (missing.length) throw new Error(`missing images:\n  ${missing.join('\n  ')}`);
  console.log(`sync-docs: ${pages.length} pages and ${copied.size} images from docs/`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    sync();
  } catch (error) {
    console.error(`sync-docs: ${error.message}`);
    process.exit(1);
  }
}
