// Packages made of copied samples ("versions" packages): special regression samples and backlog issue samples. The
// files are copied byte for byte; only their names change, so that a document keeps one name across versions, as a
// real update does. A package holds one or more items; an item is a single document (one version) or a before and
// after pair (two versions, the second with the first as its previous version). A package with one item uses the
// versions 1.0 and 2.0; with several items, each item gets its own versions "<item>-1.0" and "<item>-2.0", because
// the samples of one issue often share paths and would give duplicate operation IDs within one version.
//
// Source paths are relative to the QA plan folder (for example `samples/backlog/apihub-627/before.yaml`).
import fs from 'node:fs'
import path from 'node:path'
import { QA_ROOT } from '../lib.mjs'

// The name of a document in the package: the item name with the extension of the source (.yml becomes .yaml).
function documentName(name, source) {
  return `${name}${path.extname(source).toLowerCase().replace('.yml', '.yaml')}`
}

// A before and after pair, and a single document.
export const pair = (name, before, after) => ({ name, before, after })
export const single = (name, file) => ({ name, file })

// The before and after pair of a folder whose two files have "before" and "after" in their names.
export function folderPair(name, dir) {
  const files = fs.readdirSync(path.join(QA_ROOT, dir)).filter(f => /\.(ya?ml|json|graphql|sql)$/.test(f))
  const before = files.find(f => /before/i.test(f))
  const after = files.find(f => /after/i.test(f))
  if (!before || !after) throw new Error(`${dir}: no before and after files`)
  return pair(name, `${dir}/${before}`, `${dir}/${after}`)
}

// The versions of a package: [{ name, item, previous, files: [{ from, as }] }]. `documentBase` names the document
// of a one-item package.
export function versionsOf(items, documentBase) {
  const several = items.length > 1
  return items.flatMap(item => {
    const prefix = several ? `${item.name}-` : ''
    const as = source => documentName(several ? item.name : documentBase, source)
    if (item.file) return [{ name: `${prefix}1.0`, item: item.name, files: [{ from: item.file, as: as(item.file) }] }]
    return [
      { name: `${prefix}1.0`, item: item.name, files: [{ from: item.before, as: as(item.before) }] },
      {
        name: `${prefix}2.0`,
        item: item.name,
        previous: `${prefix}1.0`,
        files: [{ from: item.after, as: as(item.after) }],
      },
    ]
  })
}

// A package definition of copied samples. `cases` names the plan cases that use it (shown in its README).
export function copiedPackage({ name, description, cases, items, documentBase }) {
  return { name, description, cases, format: 'versions', versions: versionsOf(items, documentBase) }
}
