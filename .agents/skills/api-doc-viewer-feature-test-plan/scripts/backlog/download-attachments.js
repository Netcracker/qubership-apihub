// Downloads the attachments listed by list-attachments.js into one folder per issue, and extracts zip archives.
// Usage: node download-attachments.js <attachments.tsv> <samples-dir> [--config <file>]
// <samples-dir> is normally qa-<feature>/samples/backlog. With --config, GitLab URLs are fetched with the GitLab
// token. A file that already exists is skipped,
// so a second run downloads only new attachments. A zip archive is deleted after extraction, so it is skipped when
// its issue folder holds anything besides the other attachments of that issue. Run tidy-backlog.js afterwards.
// Extraction needs the unzip command (Git Bash and most Linux distributions have it).
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { issueFolder, parseArgs, usage } = require('./lib')

const { args, config } = parseArgs()
const [tsv, samplesDir] = args
if (!tsv || !samplesDir) usage('node download-attachments.js <attachments.tsv> <samples-dir>')

// Cyrillic letters that look like Latin ones (apihub#779 attaches "cc1.sql" whose first letter is a Cyrillic
// U+0441), written as escapes so that the source stays ASCII.
const LOOKALIKES = {
  '\u0430': 'a', '\u0435': 'e', '\u043e': 'o', '\u0440': 'p', '\u0441': 'c', '\u0445': 'x',
  '\u0410': 'A', '\u0415': 'E', '\u041e': 'O', '\u0420': 'P', '\u0421': 'C', '\u0425': 'X',
}
const LOOKALIKE = new RegExp(`[${Object.keys(LOOKALIKES).join('')}]`, 'g')

// File names as GitHub stores them may hold spaces, parentheses, quotes, and lookalike letters, which shells,
// linters, and searches handle badly.
function safeName(name) {
  return name
    .replace(/[()']/g, '')
    .replace(/ - /g, '-')
    .replace(/\s+/g, '-')
    .replace(LOOKALIKE, letter => LOOKALIKES[letter])
}

// True when the issue folder holds an entry that is not one of the plain (non-zip) attachments of the issue,
// which means that an archive of the issue was extracted there before.
function isExtracted(dir, plainNames) {
  return fs.existsSync(dir) && fs.readdirSync(dir).some(entry => !plainNames.has(entry))
}

async function main() {
  let failed = 0
  const rows = fs.readFileSync(tsv, 'utf8').split(/\r?\n/).filter(Boolean).map(line => line.split('\t'))
  const plainNames = new Map()
  for (const [id, name] of rows) {
    if (!plainNames.has(id)) plainNames.set(id, new Set())
    if (!name.endsWith('.zip')) plainNames.get(id).add(safeName(name))
  }
  for (const [id, name, url] of rows) {
    const dir = path.join(samplesDir, issueFolder(id))
    const file = path.join(dir, safeName(name))
    if (fs.existsSync(file)) continue
    if (file.endsWith('.zip') && isExtracted(dir, plainNames.get(id))) continue
    fs.mkdirSync(dir, { recursive: true })
    const gitlab = config?.gitlab && url.startsWith(config.gitlab.host)
    const token = gitlab ? process.env[config.gitlab.tokenEnv ?? 'GITLAB_TOKEN'] : undefined
    const response = await fetch(url, token ? { headers: { 'PRIVATE-TOKEN': token } } : undefined)
    if (!response.ok) {
      failed++
      console.error(`${id} ${name}: HTTP ${response.status}`)
      continue
    }
    fs.writeFileSync(file, Buffer.from(await response.arrayBuffer()))
    console.log(`${id} ${path.basename(file)}: ${fs.statSync(file).size} bytes`)
    if (file.endsWith('.zip')) {
      execFileSync('unzip', ['-q', '-o', file, '-d', dir], { stdio: 'inherit' })
      fs.rmSync(file)
      console.log(`${id} ${path.basename(file)}: extracted`)
    }
  }
  process.exit(failed ? 1 : 0)
}

main()
