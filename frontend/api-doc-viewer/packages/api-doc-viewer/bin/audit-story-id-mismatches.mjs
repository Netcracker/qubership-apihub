#!/usr/bin/env node
/**
 * Compare story IDs used in screenshot IT files against Storybook index.json.
 * Usage: node bin/audit-story-id-mismatches.mjs [path-to-index.json]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, '..');

const indexPath = process.argv[2] ?? '/tmp/storybook-index.json';
if (!fs.existsSync(indexPath)) {
  console.error(`Missing index.json: ${indexPath}`);
  console.error('Fetch with: curl -s http://localhost:9099/index.json -o /tmp/storybook-index.json');
  process.exit(1);
}

const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
const canonicalIds = new Set(
  Object.values(index.entries)
    .filter((e) => e.type === 'story')
    .map((e) => e.id),
);

const itRoot = path.join(pkgRoot, 'src/it');
const itFiles = [];

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (ent.name.endsWith('.it-test.ts')) itFiles.push(p);
  }
}
walk(itRoot);

function extractFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const rel = path.relative(pkgRoot, filePath).replace(/\\/g, '/');
  const ids = [];

  const literalRe = /storyPage\s*\(\s*[^,]+,\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = literalRe.exec(content)) !== null) {
    ids.push({ id: m[1], source: 'literal' });
  }

  const backtickStaticRe = /storyPage\s*\(\s*[^,]+,\s*`([^$`]+)`/g;
  while ((m = backtickStaticRe.exec(content)) !== null) {
    ids.push({ id: m[1], source: 'literal-backtick' });
  }

  const metaMatch = content.match(/const META_ID = ['"]([^'"]+)['"]/);
  const testIdsMatch = content.match(/const TEST_IDS: string\[\] = \[([\s\S]*?)\]/);
  if (metaMatch && testIdsMatch) {
    const metaId = metaMatch[1];
    const testIds = [...testIdsMatch[1].matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1]);
    for (const testId of testIds) {
      ids.push({ id: `${metaId}--${testId}`, source: 'META_ID+TEST_IDS', testId });
    }
  }

  const prefixMatch = content.match(/const STORY_ID_PREFIX = ["']([^"']+)["']/);
  if (prefixMatch) {
    const prefix = prefixMatch[1];
    const caseRe = /expectCaseScreenshot\s*\(\s*["']([^"']+)["']\s*\)/g;
    while ((m = caseRe.exec(content)) !== null) {
      ids.push({ id: prefix + m[1], source: 'STORY_ID_PREFIX+case', caseId: m[1] });
    }
  }

  const multilineStoryRe = /storyPage\s*\(\s*page,\s*\n\s*['"]([a-z0-9-]+--[^'"]+)['"]/g;
  while ((m = multilineStoryRe.exec(content)) !== null) {
    ids.push({ id: m[1], source: 'multiline-literal' });
  }

  // Template: storyPage(page, `${STORY_ID_PREFIX}${caseId}`) with inline case in it() only via expectCaseScreenshot

  return ids.map((entry) => ({ ...entry, file: rel }));
}

function findSuggestions(id) {
  const parts = id.split('--');
  const suffix = parts[parts.length - 1];
  const titlePrefix = `${parts.slice(0, -1).join('--')}--`;
  const candidates = [...canonicalIds].filter(
    (cid) => cid.startsWith(titlePrefix) && cid.includes(suffix.slice(0, Math.min(20, suffix.length))),
  );
  if (candidates.length > 0) return candidates.slice(0, 5);
  return [...canonicalIds]
    .filter((cid) => cid.includes(suffix.slice(0, Math.min(15, suffix.length))))
    .slice(0, 3);
}

const allRefs = [];
for (const f of itFiles) allRefs.push(...extractFromFile(f));

const missing = allRefs.filter((ref) => !canonicalIds.has(ref.id));

const byFile = new Map();
for (const ref of missing) {
  if (!byFile.has(ref.file)) byFile.set(ref.file, []);
  byFile.get(ref.file).push(ref);
}

console.log('=== SUMMARY ===');
console.log('Canonical story IDs:', canonicalIds.size);
console.log('IT files:', itFiles.length);
console.log('Story ID references extracted:', allRefs.length);
console.log('Unique references:', new Set(allRefs.map((r) => r.id)).size);
console.log('MISSING from index (mismatches):', new Set(missing.map((r) => r.id)).size);

if (missing.length === 0) {
  console.log('\nNo mismatches found.');
  process.exit(0);
}

for (const [file, refs] of [...byFile.entries()].sort()) {
  const unique = [...new Map(refs.map((r) => [r.id, r])).values()];
  console.log(`\n## ${file} (${unique.length} mismatches)`);
  for (const ref of unique) {
    const suggestions = findSuggestions(ref.id);
    console.log(`  IT:  ${ref.id}`);
    if (suggestions.length === 1 && suggestions[0] !== ref.id) {
      console.log(`  SB:  ${suggestions[0]}  <-- likely correct`);
    } else if (suggestions.length > 0) {
      console.log('  SB candidates:');
      for (const s of suggestions) console.log(`       ${s}`);
    } else {
      console.log('  SB:  (no close match found)');
    }
  }
}

const referencedIds = new Set(allRefs.map((r) => r.id));
const metaPrefixes = new Set(missing.map((m) => m.id.split('--')[0]));
const relevantOrphans = [...canonicalIds].filter((id) => {
  const prefix = id.split('--')[0];
  return metaPrefixes.has(prefix) && !referencedIds.has(id);
});

if (relevantOrphans.length > 0) {
  console.log(`\n=== Canonical stories in same meta with no IT reference (${relevantOrphans.length}) ===`);
  for (const o of relevantOrphans.slice(0, 40)) console.log(`  orphan: ${o}`);
  if (relevantOrphans.length > 40) console.log(`  ... and ${relevantOrphans.length - 40} more`);
}

process.exit(missing.length > 0 ? 1 : 0);
