const { test } = require('node:test')
const assert = require('node:assert/strict')
const { route, apply } = require('../../sites/index/404-map.js')

const R = '/qubership-apihub/'

// [path, search, hash, expected]: a string is a redirect target, an object any other outcome.
const CASES = [
  // the legacy ERD
  ['pages/erd/index.html', '', '', 'erd/portal-backend/index.html'],
  ['pages/erd/', '', '', 'erd/portal-backend/'],
  ['pages/erd', '', '', 'erd/portal-backend/'],
  ['pages/erd/tables/package_group.html', '?x=1', '#columns', 'erd/portal-backend/tables/package_group.html?x=1#columns'],
  ['pages/erd/diagrams/summary/relationships.real.large.svg', '', '', 'erd/portal-backend/diagrams/summary/relationships.real.large.svg'],
  // the legacy raw guides
  ['installation-guide.md', '', '', 'docs/installation-guide/'],
  ['configuration-reference.md', '', '#helm', 'docs/configuration-reference/#helm'],
  ['admin-guide.md', '?a=b', '', 'docs/admin-guide/?a=b'],
  ['maintenance-guide.md', '', '', 'docs/maintenance-guide/'],
  ['user-guide.md', '', '', 'docs/user-guide/'],
  ['User-Guide.md', '', '', 'docs/user-guide/'],
  ['README.md', '', '', 'docs/'],
  ['apihub-history.md', '', '', 'docs/'],
  ['development/release-process.md', '', '', 'docs/'],
  ['development/installation-guide.md', '', '', 'docs/'],
  // the legacy images
  ['images/arch.png', '', '', 'docs/'],
  // Storybooks
  ['storybook/ui/gone/', '', '', { kind: 'storybook', home: `${R}storybook/` }],
  ['storybook/ui/gone/iframe.html', '?id=x', '', { kind: 'storybook', home: `${R}storybook/` }],
  ['storybook', '', '', { kind: 'storybook', home: `${R}storybook/` }],
  // anything else
  ['nothing-here', '', '', { kind: 'missing', home: R }],
  ['landing/no-such-page/', '', '', { kind: 'missing', home: R }],
  ['erd/no-such-backend/', '', '', { kind: 'missing', home: R }],
  ['images/nested/x.png', '', '', { kind: 'missing', home: R }],
  ['storybooks/ui/', '', '', { kind: 'missing', home: R }],
  ['pages/erdx/index.html', '', '', { kind: 'missing', home: R }],
]

test('route() maps every legacy and missing path', () => {
  for (const [p, search, hash, expected] of CASES) {
    const want = typeof expected === 'string' ? { kind: 'redirect', to: R + expected } : expected
    assert.deepEqual(route(R + p, search, hash), want, p)
  }
})

test('route() takes the site root from the first path segment', () => {
  assert.deepEqual(route('/fork/installation-guide.md', '', ''), { kind: 'redirect', to: '/fork/docs/installation-guide/' })
  assert.deepEqual(route('/', '', ''), { kind: 'missing', home: '/' })
})

function fakeDom({ withText = true } = {}) {
  const classes = new Set(['hidden'])
  const els = {
    message: { textContent: 'This page does not exist.' },
    'storybook-home': { href: '/qubership-apihub/storybook/' },
  }
  if (withText) els['storybook-404-text'] = { hidden: true, classList: { remove: (c) => classes.delete(c) }, classes }
  return { getElementById: (id) => els[id] || null, els }
}

function fakeLocation(pathname, search = '', hash = '') {
  const loc = { pathname, search, hash, replaced: null }
  loc.replace = (to) => {
    loc.replaced = to
  }
  return loc
}

test('apply() redirects with location.replace, keeping the query and the fragment', () => {
  const doc = fakeDom()
  const loc = fakeLocation(`${R}pages/erd/tables/x.html`, '?q=1', '#h')
  apply(doc, loc)
  assert.equal(loc.replaced, `${R}erd/portal-backend/tables/x.html?q=1#h`)
  assert.equal(doc.els.message.textContent, 'This page does not exist.')
})

test('apply() shows the Storybook text, both ways it is hidden, and points the link home', () => {
  const doc = fakeDom()
  doc.els['storybook-home'].href = '/elsewhere/'
  const loc = fakeLocation(`${R}storybook/ui/gone/`)
  apply(doc, loc)
  const text = doc.els['storybook-404-text']
  assert.equal(text.hidden, false)
  assert.equal(text.classes.has('hidden'), false)
  assert.equal(doc.els['storybook-home'].href, `${R}storybook/`)
  assert.match(doc.els.message.textContent, /No Storybook is published at \/qubership-apihub\/storybook\/ui\/gone\//)
  assert.equal(loc.replaced, null)
})

test('apply() says "not found" in #message for anything else', () => {
  const doc = fakeDom()
  const loc = fakeLocation(`${R}nothing-here`)
  apply(doc, loc)
  assert.match(doc.els.message.textContent, /^Nothing is published at \/qubership-apihub\/nothing-here\./)
  assert.equal(doc.els['storybook-404-text'].hidden, true)
  assert.equal(loc.replaced, null)
})

test('apply() falls back to "not found" when the page has no Storybook text', () => {
  const doc = fakeDom({ withText: false })
  apply(doc, fakeLocation(`${R}storybook/ui/gone/`))
  assert.match(doc.els.message.textContent, /^Nothing is published at/)
})
