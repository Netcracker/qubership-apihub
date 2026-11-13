// Prints the selected issues for reading: a header line with the state, board status, labels, and title, then the
// body without images and HTML comments, cut to a length. Downloaded comments follow when --comments is passed.
// Usage: node dump-issues.js <work-dir> <max-characters> --config <file> [--comments] <repo#number> [<repo#number> ...]
const fs = require('fs')
const { commentsFile, loadMergedIssues, parseArgs, requireConfig, usage } = require('./lib')

const { args, config: maybeConfig } = parseArgs()
const config = requireConfig(maybeConfig, 'node dump-issues.js <work-dir> <max-characters> <repo#number> ...')
const withComments = args.includes('--comments')
const [dir, maxChars, ...ids] = args.filter(a => a !== '--comments')
if (!dir || !(+maxChars > 0) || !ids.length) {
  usage('node dump-issues.js <work-dir> <max-characters> --config <file> [--comments] <repo#number> ...')
}

function clean(text) {
  return text
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '[img]')
    .replace(/<img[^>]*>/g, '[img]')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function cut(text) {
  return text.length > +maxChars ? text.slice(0, +maxChars) + ' […]' : text
}

const issues = loadMergedIssues(config, dir)
for (const id of ids) {
  const i = issues.get(id)
  if (!i) {
    console.log(`### ${id}: not in merged.json`)
    continue
  }
  console.log(`### ${id} | ${i.state || '-'} ${i.stateReason || ''} | ${i.status || '-'} | ${i.labels.join(',')} | ` +
    i.title)
  console.log(cut(clean(i.body || '')))
  const comments = commentsFile(dir, id)
  if (withComments && fs.existsSync(comments)) {
    console.log('#### Comments')
    console.log(cut(clean(fs.readFileSync(comments, 'utf8'))))
  }
  console.log()
}
