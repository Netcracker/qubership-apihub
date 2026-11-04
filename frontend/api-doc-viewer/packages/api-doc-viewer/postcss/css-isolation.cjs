/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* Build half of CSS isolation (docs/design/shared/features/css-isolation.md); the runtime half is
   cn() in src/utils/common/cn.ts, which applies the same prefix to every class token. Runs after
   tailwindcss and autoprefixer, on the stylesheets of `include` directories only. */

/* CommonJS so that both postcss.config.js and jest (which compiles tests to CommonJS) can load it. */
/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('node:path')
const selectorParser = require('postcss-selector-parser')

/* Same value as CSS_CLASS_PREFIX in src/utils/common/cn.ts; tests/css-isolation.test.ts checks it. */
const CSS_CLASS_PREFIX = 'api-doc-viewer-'

const DOCUMENT_ROOT_TAGS = new Set(['html', 'body'])
const DOCUMENT_ROOT_PSEUDOS = new Set([':root', ':host'])
const LEGACY_PSEUDO_ELEMENTS = new Set([':before', ':after', ':first-line', ':first-letter'])
const ANIMATION_PROPERTY = /^(-webkit-)?animation(-name)?$/

function cssIsolation(options = {}) {
  const { include = [], fontFamilies = [], prefix = CSS_CLASS_PREFIX } = options
  const includeDirectories = include.map(directory => path.resolve(directory) + path.sep)
  const renamedFontFamilies = new Set(fontFamilies)
  const rootClass = `${prefix}root`

  const isIncluded = (file) => {
    if (!file) {
      return false
    }
    const resolved = path.resolve(file)
    return includeDirectories.some(directory => resolved.startsWith(directory))
  }

  const prefixed = (name) => (name.startsWith(prefix) ? name : `${prefix}${name}`)

  const parseNode = (source) => selectorParser().astSync(source).first.first
  const documentRootScope = parseNode(`:where(.${rootClass})`)
  const descendantScope = parseNode(`:where(.${rootClass}, .${rootClass} *)`)

  const isPseudoElement = (node) =>
    node.type === 'pseudo' && (node.value.startsWith('::') || LEGACY_PSEUDO_ELEMENTS.has(node.value))

  const isDocumentRoot = (node) =>
    (node.type === 'tag' && DOCUMENT_ROOT_TAGS.has(node.value.toLowerCase())) ||
    (node.type === 'pseudo' && DOCUMENT_ROOT_PSEUDOS.has(node.value))

  // A complex selector without a class of its own (classes inside :not() / :is() do not count) can
  // match host elements: scope its first compound to the viewer root. :where() adds no specificity.
  const scopeGlobalSelector = (selector) => {
    const firstCompound = []
    for (const node of selector.nodes) {
      if (node.type === 'combinator') {
        break
      }
      firstCompound.push(node)
    }
    // The whitespace after a comma belongs to the selector's first node; it must stay in front of
    // the selector, or `*, ::before` would become the descendant combinator `:where(…) ::before`.
    const originalFirst = selector.first
    const leadingSpace = originalFirst.spaces.before
    const documentRoot = firstCompound.find(isDocumentRoot)
    const pseudoElement = firstCompound.find(isPseudoElement)
    const scope = (documentRoot ? documentRootScope : descendantScope).clone()
    if (documentRoot) {
      documentRoot.replaceWith(scope)
    } else if (pseudoElement) {
      selector.insertBefore(pseudoElement, scope)
    } else {
      selector.insertAfter(firstCompound[firstCompound.length - 1], scope)
    }
    if (selector.first !== originalFirst) {
      originalFirst.spaces.before = ''
      selector.first.spaces.before = leadingSpace
    }
  }

  const selectorProcessor = selectorParser((selectors) => {
    selectors.each((selector) => {
      selector.walkClasses((node) => {
        node.value = prefixed(node.value)
      })
      if (!selector.nodes.some(node => node.type === 'class')) {
        scopeGlobalSelector(selector)
      }
    })
  })

  const renameFontFamilies = (value) => value
    .split(',')
    .map((family) => {
      const name = family.trim().replace(/^(['"])(.*)\1$/, '$2')
      return renamedFontFamilies.has(name) ? ` "${prefix.replace(/-$/, '')} ${name}"` : family
    })
    .join(',')
    .trim()

  return {
    postcssPlugin: 'api-doc-viewer-css-isolation',
    OnceExit(root) {
      if (!isIncluded(root.source?.input?.file)) {
        return
      }

      const keyframes = new Set()
      root.walkAtRules(/^(-webkit-)?keyframes$/, (atRule) => {
        keyframes.add(atRule.params)
        atRule.params = prefixed(atRule.params)
      })

      root.walkRules((rule) => {
        if (rule.parent?.type === 'atrule' && /keyframes$/.test(rule.parent.name)) {
          return
        }
        rule.selector = selectorProcessor.processSync(rule.selector)
      })

      root.walkDecls((decl) => {
        if (decl.prop === 'font-family') {
          decl.value = renameFontFamilies(decl.value)
        } else if (ANIMATION_PROPERTY.test(decl.prop) && keyframes.size > 0) {
          decl.value = decl.value.replace(/[\w-]+/g, token => (keyframes.has(token) ? prefixed(token) : token))
        }
      })
    },
  }
}

cssIsolation.postcss = true

module.exports = cssIsolation
module.exports.CSS_CLASS_PREFIX = CSS_CLASS_PREFIX
