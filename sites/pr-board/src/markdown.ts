// GitHub comment Markdown: GFM with inline HTML, sanitized before it reaches the page. Browser only, because
// DOMPurify needs the DOM.

import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { stripHtmlComments } from './model/comments.ts';

// Rendering is cached per body. The comments panel can hold 500 entries per PR and notes share the cache, so the
// oldest entry makes room for a new one rather than the whole cache going.
const MAX_CACHED = 1000;
const htmlCache = new Map<string, string>();
const textCache = new Map<string, string>();
// Closing tags of blocks that need a space between them once the markup is gone.
const BLOCK_END = /<\/(p|h[1-6]|li|tr|td|th|pre|blockquote|summary|div)>|<br\s*\/?>/gi;

// GitHub renders no SVG, MathML, or image maps in comments. Their links (an SVG <a>, an <area>) would also escape the
// new-tab rule below, so they are removed.
const FORBID_TAGS = ['style', 'form', 'svg', 'math', 'map', 'area'];

// An instance of its own, so the new-tab hook changes only comment and note rendering, not other sanitizing.
let purifier: ReturnType<typeof DOMPurify> | null = null;
function sanitizer() {
  if (!purifier) {
    purifier = DOMPurify(window);
    purifier.addHook('afterSanitizeAttributes', (node) => {
      if (node.nodeName.toLowerCase() === 'a' && node.hasAttribute('href')) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    });
  }
  return purifier;
}

function cached(cache: Map<string, string>, key: string, compute: () => string): string {
  let value = cache.get(key);
  if (value === undefined) {
    if (cache.size >= MAX_CACHED) cache.delete(cache.keys().next().value!);
    value = compute();
    cache.set(key, value);
  }
  return value;
}

// GitHub keeps single line breaks in comments, unlike in Markdown files.
export function renderMarkdown(body: string): string {
  return cached(htmlCache, body, () => {
    const html = marked.parse(stripHtmlComments(body), { gfm: true, breaks: true, async: false });
    // Page classes and ids are dropped too, so a comment cannot borrow the board's own styles or anchors.
    return sanitizer().sanitize(html, { FORBID_TAGS, FORBID_ATTR: ['style', 'class', 'id', 'usemap'] });
  });
}

// The comment as one line of plain text, for the preview in the table cell.
export function markdownText(body: string): string {
  return cached(textCache, body, () => {
    const doc = new DOMParser().parseFromString(renderMarkdown(body).replace(BLOCK_END, ' $&'), 'text/html');
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
  });
}
