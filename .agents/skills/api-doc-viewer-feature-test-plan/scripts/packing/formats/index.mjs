// The document formats of "files" packages (one document per case). Every other module of this folder default-exports
// one format; a new API type adds a module here and a builder in ../builders/ (see references/extending.md).
//
// A format is an object:
//   name                                   a short name for messages
//   matches(content, item)                 whether a written case side (object or string) is of this format
//   lookFor(content)                       what QA searches for in the portal: operation keys, tables, root fields
//   ids(content, item)                     async; the IDs APIHUB builds from the document, unique within a version
//   compare({ content, item, side, fixtureFile, prefix })
//                                          async; a message when the document differs from its fixture beyond the
//                                          renaming the builder did, or undefined; `fixtureFile` is the fixture
//                                          file of that side, when the case comes from a fixture folder
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

let formats

export async function loadFormats() {
  if (formats) return formats
  const dir = path.dirname(fileURLToPath(import.meta.url))
  const files = fs.readdirSync(dir).filter(file => file.endsWith('.mjs') && file !== 'index.mjs').sort()
  formats = []
  for (const file of files) formats.push((await import(pathToFileURL(path.join(dir, file)).href)).default)
  return formats
}

// The format of a written case side, or undefined (an OpenAPI document or a standalone file without checks).
export async function formatOf(content, item) {
  return (await loadFormats()).find(format => format.matches(content, item))
}
