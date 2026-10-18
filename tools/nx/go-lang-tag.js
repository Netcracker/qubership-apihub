/*
 * Tags every Go module `lang:go`. nx-go sets no tags, and without this plugin each module would need a
 * project.json for one tag. CI's `go` job selects the tag and the `js` job excludes it. Nx merges this
 * with what nx-go infers for the same root.
 */
const { dirname } = require('node:path')

module.exports.createNodesV2 = [
  '**/go.mod',
  async (files) =>
    files.map((file) => [file, { projects: { [dirname(file)]: { tags: ['lang:go'] } } }]),
]
