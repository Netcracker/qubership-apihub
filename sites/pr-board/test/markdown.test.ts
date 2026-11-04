import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

// DOMPurify binds to the global window when it loads, so the DOM must exist before the import.
const { window } = new JSDOM('');
Object.assign(globalThis, { window, document: window.document, DOMParser: window.DOMParser });
const { markdownText, renderMarkdown } = await import('../src/markdown.ts');

function render(body: string) {
  return JSDOM.fragment(renderMarkdown(body));
}

test('SEC-4: scripts, event handlers, styles, and forms are removed', () => {
  const html = renderMarkdown('<script>alert(1)</script><img src="x" onerror="alert(1)"><style>body{}</style>'
    + '<form action="https://evil.test"><button>Go</button></form><p style="position:fixed">styled</p>');
  assert.doesNotMatch(html, /<script|onerror|<style|<form|style=/i);
});

test('SEC-4: javascript: links never become hrefs', () => {
  for (const body of ['[x](javascript:alert%281%29)', '<a href="javascript:alert(1)">x</a>']) {
    const hrefs = Array.from(render(body).querySelectorAll('a')).map((a) => a.getAttribute('href') || '');
    assert.ok(hrefs.every((href) => !href.toLowerCase().startsWith('javascript')), body);
  }
});

test('SEC-4: page classes and ids are dropped', () => {
  assert.doesNotMatch(renderMarkdown('<div class="popover" id="app">x</div>'), /class=|id=/);
});

test('SEC-4 PANEL-14: links open in a new tab without an opener', () => {
  const link = render('See [the guide](https://github.com/acme/widgets).').querySelector('a');
  assert.equal(link?.getAttribute('target'), '_blank');
  assert.equal(link?.getAttribute('rel'), 'noopener noreferrer');
});

test('SEC-4: SVG, MathML, and image maps are removed, so every link that stays opens in a new tab', () => {
  const html = renderMarkdown('<svg><a href="https://evil.test"><text y="20">Open the report</text></a></svg>'
    + '<math><mi>x</mi></math><img src="x.png" usemap="#m"><map name="m"><area href="https://evil.test" shape="rect" coords="0,0,9,9"></map>');
  assert.doesNotMatch(html, /<svg|<math|<map|<area|usemap/i);
  for (const link of Array.from(JSDOM.fragment(html).querySelectorAll('[href]'))) {
    assert.equal(link.getAttribute('target'), '_blank', link.outerHTML);
  }
});

test('PANEL-14: GFM tables, task lists, details, and single line breaks render like on GitHub', () => {
  const fragment = render('| a | b |\n| - | - |\n| 1 | 2 |\n\n- [x] done\n\none\ntwo\n\n<details><summary>More</summary>\n\nhidden\n\n</details>');
  assert.equal(fragment.querySelectorAll('td').length, 2);
  assert.equal(fragment.querySelector('input[type="checkbox"]')?.hasAttribute('checked'), true);
  assert.ok(fragment.querySelector('br'));
  assert.equal(fragment.querySelector('summary')?.textContent, 'More');
});

test('TABLE-11: the preview is plain text with blocks separated by spaces', () => {
  assert.equal(markdownText('<!-- marker -->\n### Report\n\n- **one**\n- `two`'), 'Report one two');
});
