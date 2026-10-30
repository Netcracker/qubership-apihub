// The pure rules of sync-docs.mjs: which files of docs/ become pages, under which slug, with which
// title, and where each link in them points on the site. No file system access here, so that
// sync-docs.test.mjs can test every rule; the callers pass what they know about the tree.
import { slug as githubSlug } from 'github-slugger';
import { posix } from 'node:path';

export const REPO_URL = 'https://github.com/Netcracker/qubership-apihub';
// Edit links always open develop, where changes land. The other GitHub links (files outside docs/,
// docs/internal/) show the ref the site is built from: DOCS_GITHUB_REF, which pages.yml sets to the
// site's ref (main or develop, or SITE_REF), and develop when it is unset.
export const EDIT_REF = 'develop';
export const DEFAULT_GITHUB_REF = 'develop';

// The ref of the GitHub links from the environment of the build.
export function githubRefFrom(env) {
  const ref = (env.DOCS_GITHUB_REF || '').trim();
  return ref || DEFAULT_GITHUB_REF;
}
export const BASE = '/qubership-apihub/docs';

// Folders of docs/ that are not published (D18): docs/internal/ is for the team, docs/pages/ was the
// legacy Pages tree.
export const SKIPPED_DIRS = ['internal', 'pages'];

// Files with these extensions are served as they are from the site's public/ folder.
export const ASSET_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif', '.ico']);

const INDEX_NAMES = new Set(['readme.md', 'index.md']);

// Whether a path relative to docs/ is published on the site.
export function isPublished(docsRel) {
  const first = docsRel.split('/')[0];
  return !SKIPPED_DIRS.includes(first);
}

// Whether a path relative to docs/ is a page source: a published Markdown file.
export function isPageSource(docsRel) {
  return docsRel.toLowerCase().endsWith('.md') && isPublished(docsRel);
}

// The slug of a page source, as Astro's glob loader computes it: each folder and the file name
// (without .md) through github-slugger, README.md and index.md standing for their folder.
// docs/README.md is '' (the site's home page).
export function slugOf(docsRel) {
  const segments = docsRel.split('/');
  const file = segments.pop();
  if (!INDEX_NAMES.has(file.toLowerCase())) segments.push(file.replace(/\.md$/i, ''));
  return segments
    .map((segment) => {
      const slug = githubSlug(segment);
      if (!slug) throw new Error(`docs/${docsRel}: "${segment}" gives an empty slug; rename it`);
      return slug;
    })
    .join('/');
}

// Whether a page source is the page of its folder (README.md or index.md).
export function isIndexSource(docsRel) {
  return INDEX_NAMES.has(posix.basename(docsRel).toLowerCase());
}

// Where a page source is written under src/content/docs/.
export function contentPathOf(docsRel) {
  const slug = slugOf(docsRel);
  if (slug === '') return 'index.md';
  return isIndexSource(docsRel) ? `${slug}/index.md` : `${slug}.md`;
}

// Why a set of page sources cannot be published: two files that give one slug (user-guide.md and
// user-guide/README.md), or a name starting with "_", which Starlight's loader skips.
export function slugProblems(sources) {
  const problems = [];
  const bySlug = new Map();
  for (const rel of sources) {
    const slug = slugOf(rel);
    if (bySlug.has(slug)) problems.push(`docs/${bySlug.get(slug)} and docs/${rel} both give the page "/${slug}/"`);
    else bySlug.set(slug, rel);
    if (
      contentPathOf(rel)
        .split('/')
        .some((segment) => segment.startsWith('_'))
    ) {
      problems.push(`docs/${rel}: Starlight skips files and folders whose name starts with "_"; rename it`);
    }
  }
  return problems;
}

// The site URL of a page slug, with the base and the trailing slash.
export function pageUrl(slug) {
  return slug === '' ? `${BASE}/` : `${BASE}/${encodeURI(slug)}/`;
}

function encodePath(repoRel) {
  return repoRel
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

export function editUrl(docsRel) {
  return `${REPO_URL}/edit/${EDIT_REF}/docs/${encodePath(docsRel)}`;
}

export function githubUrl(repoRel, isDir, ref = DEFAULT_GITHUB_REF) {
  if (repoRel === '') return `${REPO_URL}/tree/${encodePath(ref)}`;
  return `${REPO_URL}/${isDir ? 'tree' : 'blob'}/${encodePath(ref)}/${encodePath(repoRel)}`;
}

// The public/ path of an asset: files of docs/ keep their path relative to docs/ (so
// docs/images/x.png is served at <base>/images/x.png); files elsewhere go under _repo/.
export function assetPathOf(repoRel) {
  return repoRel.startsWith('docs/') ? repoRel.slice('docs/'.length) : `_repo/${repoRel}`;
}

export function assetUrl(publicRel) {
  return `${BASE}/${encodePath(publicRel)}`;
}

function safeDecode(text) {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

// Where one link destination points on the site.
//
// fromRepoRel: the repository path of the page that holds the link (docs/admin-guide.md).
// tree.isDir(repoRel): whether the path is a folder in the repository.
// tree.hasPage(docsRel): whether docs/<docsRel> is a page source that the sync publishes.
// tree.pagesUnder(docsRel): the page sources in the folder docs/<docsRel>/ and its subfolders.
// tree.ref: the branch, tag, or commit that GitHub links show (DEFAULT_GITHUB_REF when unset).
//
// Returns { url } and, for an asset, { asset: { from, to } } (repository path, public/ path).
//
// A published folder of docs/ links to its README.md or index.md. A folder without one, such as a
// design area, is a sidebar group with no page of its own, so the link opens the group's first page:
// a file of the folder itself before its subfolders, each by name. Only a folder without any page
// links to GitHub.
export function rewriteUrl(raw, fromRepoRel, tree) {
  const url = raw.trim();
  if (url === '' || url.startsWith('#') || url.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(url)) {
    return { url: raw };
  }
  const hashAt = url.indexOf('#');
  const hash = hashAt >= 0 ? url.slice(hashAt) : '';
  const beforeHash = hashAt >= 0 ? url.slice(0, hashAt) : url;
  const queryAt = beforeHash.indexOf('?');
  const query = queryAt >= 0 ? beforeHash.slice(queryAt) : '';
  const rawPath = safeDecode(queryAt >= 0 ? beforeHash.slice(0, queryAt) : beforeHash);
  if (rawPath === '') return { url: raw };

  const joined = rawPath.startsWith('/')
    ? posix.normalize(rawPath.slice(1))
    : posix.normalize(posix.join(posix.dirname(fromRepoRel), rawPath));
  // A link above the repository root cannot be mapped; it stays as written.
  if (joined === '..' || joined.startsWith('../')) return { url: raw };
  const repoRel = joined === '.' ? '' : joined.replace(/\/+$/, '');
  const looksLikeDir = rawPath.endsWith('/') || repoRel === '' || tree.isDir(repoRel);
  const ext = posix.extname(repoRel).toLowerCase();

  if (!looksLikeDir && ASSET_EXTENSIONS.has(ext)) {
    const to = assetPathOf(repoRel);
    return { url: assetUrl(to) + query + hash, asset: { from: repoRel, to } };
  }

  const inDocs = repoRel === 'docs' || repoRel.startsWith('docs/');
  const docsRel = repoRel === 'docs' ? '' : repoRel.slice('docs/'.length);
  if (inDocs && isPublished(docsRel)) {
    if (!looksLikeDir && ext === '.md') return { url: pageUrl(slugOf(docsRel)) + hash };
    if (looksLikeDir) {
      const index = ['README.md', 'index.md']
        .map((name) => (docsRel === '' ? name : `${docsRel}/${name}`))
        .find((candidate) => tree.hasPage(candidate));
      if (index) return { url: pageUrl(slugOf(index)) + hash };
      const first = firstPageOf(docsRel, tree.pagesUnder(docsRel));
      // The anchor belonged to the folder, not to the page that stands in for it.
      if (first) return { url: pageUrl(slugOf(first)) };
    }
  }
  return { url: githubUrl(repoRel, looksLikeDir, tree.ref) + query + hash };
}

// The page that stands in for a folder without an index page: a page of the folder itself before
// the pages of its subfolders, each group by slug. Undefined when the folder has no page.
function firstPageOf(docsRel, sources) {
  const prefix = docsRel === '' ? '' : `${docsRel}/`;
  const depth = (rel) => rel.slice(prefix.length).split('/').length;
  return [...sources]
    .filter((rel) => rel.startsWith(prefix))
    .sort((a, b) => depth(a) - depth(b) || slugOf(a).localeCompare(slugOf(b)))[0];
}

// Reads a link destination that starts at text[start] (just after "(" of "](").
// Returns the [start, end) range of the destination, or null when there is none.
function destinationRange(text, start) {
  let i = start;
  while (text[i] === ' ' || text[i] === '\t') i++;
  if (text[i] === '<') {
    const close = text.indexOf('>', i + 1);
    if (close < 0) return null;
    return { from: i, to: close + 1, inner: text.slice(i + 1, close) };
  }
  let depth = 0;
  let j = i;
  for (; j < text.length; j++) {
    const c = text[j];
    if (c === '\\') {
      j++;
      continue;
    }
    if (c === ' ' || c === '\t') break;
    if (c === '(') depth++;
    if (c === ')') {
      if (depth === 0) break;
      depth--;
    }
  }
  if (j === i) return null;
  return { from: i, to: j, inner: text.slice(i, j) };
}

// Rewrites the inline link and image destinations and the reference definitions in one stretch of
// Markdown that holds no code.
function rewriteMarkdownSegment(text, rewrite) {
  let out = '';
  let last = 0;
  const marker = /\]\(/g;
  let m;
  while ((m = marker.exec(text))) {
    const range = destinationRange(text, m.index + 2);
    if (!range) continue;
    out += text.slice(last, range.from) + rewrite(range.inner);
    last = range.to;
    marker.lastIndex = range.to;
  }
  out += text.slice(last);
  return out.replace(
    /^(\s{0,3}\[[^\]]+\]:[ \t]*)(<[^>]*>|\S+)/,
    (all, head, dest) => head + rewrite(dest.startsWith('<') ? dest.slice(1, -1) : dest),
  );
}

// Rewrites the href, src, and srcset attributes of HTML a, img, and source tags. A tag may span
// lines (`<img alt="..."` on one line, `src="..." />` on the next), so this runs on a whole block.
function rewriteHtml(text, rewrite) {
  return text.replace(
    /(<(?:a|img|source)\b[^>]*?\s(?:href|src|srcset)\s*=\s*)(["'])(.*?)\2/gis,
    (all, head, quote, value) => head + quote + rewrite(value) + quote,
  );
}

// Splits Markdown lines into fenced code blocks and the rest. Yields { code, lines }.
function* blocks(lines) {
  let fence = null;
  let chunk = [];
  for (const line of lines) {
    const open = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (fence === null && open) {
      if (chunk.length) yield { code: false, lines: chunk };
      chunk = [line];
      fence = open[1];
      continue;
    }
    chunk.push(line);
    if (
      fence !== null &&
      open &&
      open[1][0] === fence[0] &&
      open[1].length >= fence.length &&
      line.trim() === open[1]
    ) {
      yield { code: true, lines: chunk };
      chunk = [];
      fence = null;
    }
  }
  if (chunk.length) yield { code: fence !== null, lines: chunk };
}

// Applies rewrite(destination) to every link outside code: fenced blocks and inline code spans
// keep their text. Markdown links are rewritten line by line; HTML tags over the whole block, with
// the code spans held out by a placeholder that holds no quote and no ">".
export function rewriteLinks(markdown, rewrite) {
  const lines = markdown.split('\n');
  const out = [];
  for (const block of blocks(lines)) {
    if (block.code) {
      out.push(...block.lines);
      continue;
    }
    const spans = [];
    const held = block.lines.map((line) =>
      // Odd parts are inline code spans (`code`, ``code``).
      line
        .split(/(`+[^`]*?`+)/)
        .map((part, i) => (i % 2 ? `\u0000${spans.push(part) - 1}\u0000` : rewriteMarkdownSegment(part, rewrite)))
        .join(''),
    );
    out.push(rewriteHtml(held.join('\n'), rewrite).replace(/\u0000(\d+)\u0000/g, (all, n) => spans[Number(n)]));
  }
  return out.join('\n');
}

// Plain text of an inline Markdown heading: link text, code without backticks, no emphasis marks.
export function plainTitle(inline) {
  return inline
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(^|[\s(])[*_](\S(?:.*?\S)?)[*_](?=$|[\s).,:;!?])/g, '$1$2')
    .replace(/<[^>]+>/g, '')
    .replace(/\\([\\`*_{}[\]()#+\-.!|])/g, '$1')
    .trim();
}

// Splits the YAML front matter off a Markdown file. Returns { frontMatter: lines | null, body }.
export function splitFrontMatter(markdown) {
  const text = markdown.replace(/^﻿/, '');
  if (!/^---\r?\n/.test(text)) return { frontMatter: null, body: text };
  const lines = text.split('\n');
  const end = lines.findIndex((line, i) => i > 0 && /^(---|\.\.\.)\s*$/.test(line));
  if (end < 0) return { frontMatter: null, body: text };
  return { frontMatter: lines.slice(1, end), body: lines.slice(end + 1).join('\n') };
}

// The lines without the heading at `at` (`count` lines) and the blank line after it, and without
// leading blank lines.
function withoutHeading(lines, at, count) {
  const after = lines[at + count] !== undefined && lines[at + count].trim() === '' ? 1 : 0;
  const rest = lines.slice(0, at).concat(lines.slice(at + count + after));
  while (rest.length > 1 && rest[0].trim() === '') rest.shift();
  return rest.join('\n');
}

// The first H1 outside code (ATX "# Title" or setext "Title" over "==="), and the body without it.
// Returns { title: string | null, body }.
export function extractTitle(body) {
  const lines = body.split('\n');
  let index = 0;
  for (const block of blocks(lines)) {
    if (!block.code) {
      for (let k = 0; k < block.lines.length; k++) {
        const line = block.lines[k].replace(/\r$/, '');
        const atx = /^ {0,3}#[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/.exec(line) || /^ {0,3}#[ \t]*$/.exec(line);
        if (atx) {
          return { title: plainTitle(atx[1] || ''), body: withoutHeading(lines, index + k, 1) };
        }
        const next = block.lines[k + 1];
        if (line.trim() !== '' && next !== undefined && /^ {0,3}=+[ \t]*\r?$/.test(next) && !/^\s{4}/.test(line)) {
          const previous = k === 0 ? '' : block.lines[k - 1].trim();
          if (previous === '') {
            return { title: plainTitle(line.trim()), body: withoutHeading(lines, index + k, 2) };
          }
        }
      }
    }
    index += block.lines.length;
  }
  return { title: null, body };
}

// A title from a file name when the page has no H1: "release-process.md" -> "Release process".
export function titleFromFileName(docsRel) {
  const segments = docsRel.split('/');
  let name = segments.pop();
  if (INDEX_NAMES.has(name.toLowerCase())) name = segments.pop() || 'Documentation';
  const words = name.replace(/\.md$/i, '').replace(/[-_]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function hasKey(frontMatter, key) {
  return frontMatter.some((line) => new RegExp(`^${key}\\s*:`).test(line));
}

// The sidebar hints Starlight reads from front matter (sidebar.order, sidebar.label), when a source
// sets them. A full YAML parser is not needed for these two scalars.
export function sidebarHints(frontMatter) {
  const hints = {};
  if (!frontMatter) return hints;
  const start = frontMatter.findIndex((line) => /^sidebar\s*:\s*$/.test(line));
  if (start < 0) return hints;
  for (const line of frontMatter.slice(start + 1)) {
    if (!/^\s+\S/.test(line)) break;
    const order = /^\s+order\s*:\s*(-?\d+)\s*$/.exec(line);
    if (order) hints.order = Number(order[1]);
    const label = /^\s+label\s*:\s*(.+?)\s*$/.exec(line);
    if (label) hints.label = label[1].replace(/^(["'])(.*)\1$/, '$2');
  }
  return hints;
}

// The page that the sync writes for one source file: front matter with title and editUrl (kept when
// the source sets them), the body without its H1, and every link rewritten.
// Returns { content, title, assets: [{ from, to }], hints }.
export function transformPage(docsRel, markdown, tree) {
  const source = markdown.replace(/\r\n/g, '\n');
  const { frontMatter, body } = splitFrontMatter(source);
  const extracted = extractTitle(body);
  const own = frontMatter || [];
  const titleLine = own.find((line) => /^title\s*:/.test(line));
  const title = titleLine
    ? titleLine.replace(/^title\s*:\s*/, '').replace(/^(["'])(.*)\1$/, '$2')
    : extracted.title || titleFromFileName(docsRel);
  const header = [];
  if (!hasKey(own, 'title')) header.push(`title: ${JSON.stringify(title)}`);
  if (!hasKey(own, 'editUrl')) header.push(`editUrl: ${JSON.stringify(editUrl(docsRel))}`);
  const assets = [];
  const fromRepoRel = `docs/${docsRel}`;
  const rewritten = rewriteLinks(extracted.body, (destination) => {
    const result = rewriteUrl(destination, fromRepoRel, tree);
    if (result.asset) assets.push(result.asset);
    return result.url;
  });
  const content = ['---', ...header, ...own, '---', '', rewritten].join('\n');
  return { content, title, assets, hints: sidebarHints(frontMatter) };
}

function humanize(name) {
  const words = name.replace(/[-_]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function byOrder(a, b) {
  const oa = a.order ?? Number.POSITIVE_INFINITY;
  const ob = b.order ?? Number.POSITIVE_INFINITY;
  if (oa !== ob) return oa - ob;
  return a.name.localeCompare(b.name);
}

// The sidebar entries of one folder: its index page first ("Overview"), then its pages and
// subfolders. Order: sidebar.order from the source's front matter, then the folder's list in
// `order`, then by name. A subfolder is a collapsed group labeled with the title of its index page
// (or its name) and is left out when it holds no page.
function directoryItems(dir, pages, used, order, labels) {
  const prefix = dir === '' ? '' : `${dir}/`;
  const listed = order[dir] || [];
  const children = new Map();
  let index = null;
  for (const page of pages) {
    if (used.has(page.slug)) continue;
    if (page.slug === dir && page.isIndex !== false) {
      index = page;
      continue;
    }
    if (dir !== '' && !page.slug.startsWith(prefix)) continue;
    const rest = page.slug.slice(prefix.length);
    const name = rest.split('/')[0];
    // A folder's README belongs to the folder's group. user-guide.md and the folder user-guide/
    // are two children: a page and a group.
    const isSubdir = rest.includes('/') || page.isIndex === true;
    const key = `${isSubdir ? 'dir' : 'page'}:${name}`;
    if (!children.has(key)) {
      const listedAt = listed.indexOf(name) >= 0 ? listed.indexOf(name) : undefined;
      // A subfolder takes its place from `order` only, not from the hints of a page inside it.
      children.set(key, { name, isSubdir, order: isSubdir ? listedAt : (page.hints?.order ?? listedAt) });
    }
    if (!isSubdir) children.get(key).page = page;
  }
  const items = [];
  if (index) {
    used.add(index.slug);
    items.push({ label: 'Overview', slug: index.slug === '' ? 'index' : index.slug });
  }
  const sorted = [...children.values()].sort(byOrder);
  for (const child of sorted) {
    if (!child.isSubdir) {
      used.add(child.page.slug);
      items.push(
        child.page.hints?.label ? { label: child.page.hints.label, slug: child.page.slug } : { slug: child.page.slug },
      );
      continue;
    }
    const sub = `${prefix}${child.name}`;
    const subIndex = pages.find((p) => p.slug === sub && p.isIndex !== false);
    const subItems = directoryItems(sub, pages, used, order, labels);
    if (subItems.length === 0) continue;
    items.push({
      label: subIndex?.hints?.label || labels[sub] || subIndex?.title || humanize(child.name),
      collapsed: true,
      items: subItems,
    });
  }
  return items;
}

// The Starlight sidebar from the pages that exist and the section config, in the config's order.
//
// pages: [{ slug, title, hints, isIndex }] from the sync; isIndex marks a folder's README.md.
// sections: [{ label, pages?: [slug | { slug, label }], directory?: slug, collapsed? }]; a section
//   lists its pages first, then everything under its directory. A section with no page is left out.
// links: [{ label, items: [{ label, link }] }] groups of external links, appended as they are.
// order: { '<directory slug>': ['<child name>', ...] } explicit order inside a folder.
// labels: { '<directory slug>': 'Label' } group labels for folders whose name does not read well. A label
//   from the folder's front matter wins; the config label wins over the README title.
//
// Returns { sidebar, unlisted } where unlisted are the slugs of pages in no section.
export function buildSidebar({ pages, sections, links = [], order = {}, labels = {} }) {
  const bySlug = new Map(pages.map((page) => [page.slug, page]));
  const used = new Set();
  const sidebar = [];
  for (const section of sections) {
    const items = [];
    for (const entry of section.pages || []) {
      const { slug, label } = typeof entry === 'string' ? { slug: entry } : entry;
      const page = bySlug.get(slug);
      if (!page || used.has(slug)) continue;
      used.add(slug);
      const starlightSlug = slug === '' ? 'index' : slug;
      items.push(label ? { label, slug: starlightSlug } : { slug: starlightSlug });
    }
    if (section.directory !== undefined) items.push(...directoryItems(section.directory, pages, used, order, labels));
    if (items.length === 0) continue;
    sidebar.push({ label: section.label, collapsed: section.collapsed ?? false, items });
  }
  sidebar.push(...links);
  const unlisted = pages.map((page) => page.slug).filter((slug) => !used.has(slug));
  return { sidebar, unlisted };
}
