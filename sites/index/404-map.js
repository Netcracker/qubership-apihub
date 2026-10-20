// The routing of the root 404.html. GitHub Pages serves that one page for every path without a
// file, so it is where the URLs of the legacy site redirect, and where a missing Storybook branch
// gets an explanation instead of a bare "not found".
//
// Rules, for a path under the site root (/qubership-apihub/):
//
//   pages/erd/<rest>   -> erd/portal-backend/<rest>   the ERD the legacy site served
//   <guide>.md         -> docs/<guide>/               a guide the legacy site served as raw Markdown
//   README.md, any other .md -> docs/
//   images/<file>      -> docs/                       images of the legacy guides
//   storybook/...      the "not published" text and a link to storybook/
//   anything else      "not found"
//
// Redirects keep the query and the fragment. A plain browser script; the CommonJS export at the end
// lets tools/ci/pages-404.test.js check the rules in Node.
/* global window, document */
;(function () {
  'use strict'

  // The guides of the legacy site that keep a page of their own on the docs site.
  var GUIDES = ['installation-guide', 'configuration-reference', 'admin-guide', 'maintenance-guide', 'user-guide']

  // The site root of a path: its first segment, which a project site always has.
  function siteRoot(pathname) {
    var first = String(pathname).split('/')[1]
    return first ? '/' + first + '/' : '/'
  }

  // What the 404 page does for a location. Returns one of
  //   { kind: 'redirect', to }    to: the absolute path with the query and fragment
  //   { kind: 'storybook', home } home: the Storybook index
  //   { kind: 'missing', home }   home: the site root
  function route(pathname, search, hash) {
    var root = siteRoot(pathname)
    var rest = String(pathname).slice(root.length)
    var tail = (search || '') + (hash || '')
    var to = function (target) {
      return { kind: 'redirect', to: root + target + tail }
    }

    var erd = /^pages\/erd(?:\/(.*))?$/.exec(rest)
    if (erd) return to('erd/portal-backend/' + (erd[1] || ''))
    if (/^storybook(?:\/|$)/.test(rest)) return { kind: 'storybook', home: root + 'storybook/' }
    if (/^images\/[^/]+$/.test(rest)) return to('docs/')
    var md = /^(?:(.*)\/)?([^/]+)\.md$/i.exec(rest)
    if (md) {
      var name = md[2].toLowerCase()
      if (md[1] === undefined && GUIDES.indexOf(name) !== -1) return to('docs/' + name + '/')
      return to('docs/')
    }
    return { kind: 'missing', home: root }
  }

  function show(el) {
    el.hidden = false
    el.classList.remove('hidden')
  }

  function apply(doc, loc) {
    var r = route(loc.pathname, loc.search, loc.hash)
    if (r.kind === 'redirect') {
      loc.replace(r.to)
      return r
    }
    var message = doc.getElementById('message')
    var text = doc.getElementById('storybook-404-text')
    if (r.kind === 'storybook' && text) {
      if (message) message.textContent = 'No Storybook is published at ' + loc.pathname + '.'
      show(text)
      var home = doc.getElementById('storybook-home')
      if (home) home.href = r.home
    } else if (message) {
      message.textContent = 'Nothing is published at ' + loc.pathname + '. Pick one of the sites below.'
    }
    return r
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { route: route, apply: apply, siteRoot: siteRoot, GUIDES: GUIDES }
  } else if (typeof document !== 'undefined') {
    apply(document, window.location)
  }
})()
