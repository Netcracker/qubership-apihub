#!/usr/bin/env node
// Remove sourcemap FILES from a built Storybook before it goes into the store.
//
//   storybook-strip-maps.js <dir>
//
// Measured on the stored builds, 2026-09-14: apispec-view carried 64 maps, 22.1 of its 42.8 MiB,
// and rest-playground 101 maps, 18.8 of 34.0 MiB. graphapi carries 28 `.d.ts.map` files, a few KiB.
// Every published build's size counts against GitHub Pages' 1 GB, and a map is only ever fetched
// by someone with devtools open.
//
// The trailing `sourceMappingURL` comment naming a removed map is removed with it, so devtools does
// not request a file that no longer exists. Only a comment at the very END of a file, naming a map
// that is in this build, is touched: that is where bundlers put it, and anything else in a bundle
// is code. INLINE maps (`sourceMappingURL=data:…`) are left alone. They are part of the JavaScript
// itself; class-view has two, inside Storybook's own prebuilt manager chunks.
//
// Prints one line for the job summary. Exits non-zero if a map survives, or if a comment still
// names a map that is gone — both would mean this did not do what it reports.
'use strict'

const fs = require('fs')
const path = require('path')

const dir = path.resolve(process.argv[2] || '')
if (!process.argv[2] || !fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
  console.error('usage: storybook-strip-maps.js <dir>')
  process.exit(2)
}

const walk = (d, out = []) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

// `//# sourceMappingURL=x.map` for scripts and declarations, `/*# sourceMappingURL=x.map */` for
// CSS. `@` is the older spelling of `#`. Anchored to the end of the file.
const TRAILING = [
  { ext: /\.(m?js|cjs|ts)$/, re: /(\r?\n)?\/\/[#@] sourceMappingURL=([^\s'"]+)\s*$/ },
  { ext: /\.css$/, re: /(\r?\n)?\/\*[#@] sourceMappingURL=([^\s*]+)\s*\*\/\s*$/ },
]
const ANY_REF = /sourceMappingURL=([^\s'"*]+)/g

const files = walk(dir)
const maps = new Set(files.filter((f) => f.endsWith('.map')))
let bytes = 0
for (const m of maps) bytes += fs.statSync(m).size

let comments = 0
for (const f of files) {
  if (maps.has(f)) continue
  const rule = TRAILING.find((r) => r.ext.test(f))
  if (!rule) continue
  const text = fs.readFileSync(f, 'utf8')
  const m = text.match(rule.re)
  if (!m || m[2].startsWith('data:')) continue
  // Resolve the reference the way a browser would, relative to the file. Strip only when it names
  // a map that is in this build and about to be deleted.
  const target = path.resolve(path.dirname(f), decodeURIComponent(m[2].split(/[?#]/)[0]))
  if (!maps.has(target)) continue
  fs.writeFileSync(f, text.slice(0, m.index) + (m[1] || ''))
  comments++
}

for (const m of maps) fs.rmSync(m)

// Validate the result, not the counters above.
const after = walk(dir)
const survivors = after.filter((f) => f.endsWith('.map'))
const dangling = []
for (const f of after) {
  if (!TRAILING.some((r) => r.ext.test(f))) continue
  for (const [, ref] of fs.readFileSync(f, 'utf8').matchAll(ANY_REF)) {
    if (ref.startsWith('data:')) continue
    const target = path.resolve(path.dirname(f), decodeURIComponent(ref.split(/[?#]/)[0]))
    if (maps.has(target)) dangling.push(`${path.relative(dir, f)} -> ${ref}`)
  }
}
if (survivors.length || dangling.length) {
  for (const s of survivors) console.error(`::error::map survived: ${path.relative(dir, s)}`)
  for (const d of dangling) console.error(`::error::still names a removed map: ${d}`)
  process.exit(1)
}

console.log(`stripped ${maps.size} sourcemaps (${(bytes / 1024 / 1024).toFixed(1)} MiB) and ${comments} references to them`)
