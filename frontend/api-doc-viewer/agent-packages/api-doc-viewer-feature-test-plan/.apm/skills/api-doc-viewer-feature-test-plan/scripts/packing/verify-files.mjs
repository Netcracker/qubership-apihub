// Checks of the "files" packages, called by verify.mjs. Each written file must equal its case. For a document of a
// known format (formats/), the IDs APIHUB builds must not repeat within one version, and the document must equal its
// fixture apart from the renaming its builder did.
import fs from 'node:fs'
import path from 'node:path'
import { OUTPUT_ROOT, SAMPLES_ROOT, VERSIONS, caseFileContent } from './lib.mjs'
import { formatOf } from './formats/index.mjs'

const SIDE_FILES = { plain: ['sample', 'document'], diffs: ['before', 'after'] }

// The fixture file of a case side, when the case comes from a fixture folder of api-doc-viewer.
function fixtureFile(item, layout, side) {
  const dir = path.join(SAMPLES_ROOT, item.fixture)
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return undefined
  const names = layout === 'plain' ? SIDE_FILES.plain : [SIDE_FILES.diffs[side]]
  for (const name of names) {
    const file = fs.readdirSync(dir).find(f => f.startsWith(`${name}.`))
    if (file) return path.join(dir, file)
  }
  return undefined
}

export async function checkFilesPackage(definition, cases, fail) {
  const versions = VERSIONS[definition.layout]
  let checked = 0
  for (const [side, version] of versions.entries()) {
    const ids = new Map()
    for (const item of cases) {
      const file = path.join(OUTPUT_ROOT, definition.name, version, `${item.id}.${item.extension}`)
      if (!fs.existsSync(file)) {
        fail(`${definition.name}: ${file} is missing`)
        continue
      }
      if (fs.readFileSync(file, 'utf8') !== caseFileContent(item, side)) fail(`${definition.name}: ${file} differs`)
      const content = item.sides[side]
      const format = await formatOf(content, item)
      if (format) {
        try {
          for (const id of await format.ids(content, item)) {
            if (ids.has(id)) fail(`${definition.name} ${version}: ${id} of ${item.id} repeats ${ids.get(id)}`)
            ids.set(id, item.id)
          }
          const problem = await format.compare({
            content, item, side, fixtureFile: fixtureFile(item, definition.layout, side),
          })
          if (problem) fail(`${definition.name} ${item.id} ${version}: ${problem}`)
        } catch (error) {
          fail(`${definition.name} ${item.id} ${version}: ${format.name}: ${error.message}`)
        }
      }
      checked++
    }
  }
  return checked
}
