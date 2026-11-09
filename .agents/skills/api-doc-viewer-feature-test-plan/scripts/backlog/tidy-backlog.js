// Tidies the downloaded samples: removes macOS metadata, moves the content of a folder that holds only one folder
// one level up, and removes spaces and "$" from file and folder names so that shells and linters handle them.
// Usage: node tidy-backlog.js <samples-dir>
// Run it from a directory outside <samples-dir>: Windows cannot remove a folder that is the current directory of a
// shell (EBUSY), and the script then leaves a "<folder>.__tmp" folder behind.
const fs = require('fs')
const path = require('path')
const { usage } = require('./lib')

const [root] = process.argv.slice(2)
if (!root) usage('node tidy-backlog.js <samples-dir>')

function removeMetadata(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.name === '__MACOSX' || e.name === '.DS_Store') {
      fs.rmSync(p, { recursive: true, force: true })
    } else if (e.isDirectory()) {
      removeMetadata(p)
    }
  }
}

function safeName(name) {
  return name.replace(/\$/g, '').replace(/\s+/g, '-')
}

function renameAll(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    let p = path.join(dir, e.name)
    const name = safeName(e.name)
    if (name !== e.name) {
      const renamed = path.join(dir, name)
      fs.renameSync(p, renamed)
      p = renamed
    }
    if (e.isDirectory()) renameAll(p)
  }
}

// An archive often wraps its files in one or more folders; repeated until the folder holds more than one entry.
function collapse(dir) {
  for (;;) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    if (entries.length !== 1 || !entries[0].isDirectory()) break
    const tmp = dir + '.__tmp'
    fs.renameSync(path.join(dir, entries[0].name), tmp)
    fs.rmdirSync(dir)
    fs.renameSync(tmp, dir)
  }
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) collapse(path.join(dir, e.name))
  }
}

removeMetadata(root)
renameAll(root)
for (const e of fs.readdirSync(root, { withFileTypes: true })) {
  if (e.isDirectory()) collapse(path.join(root, e.name))
}
