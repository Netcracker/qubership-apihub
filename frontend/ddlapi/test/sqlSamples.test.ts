import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { assertValidSql } from './helpers/assertValidSql'

const resourcesDir = join(__dirname, 'resources')

function collectSqlFiles(dir: string): string[] {
  const results: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...collectSqlFiles(fullPath))
    } else if (entry.name.endsWith('.sql')) {
      results.push(fullPath)
    }
  }
  return results
}

const sqlFiles = collectSqlFiles(resourcesDir)

test.each(sqlFiles.map(f => [f.replace(resourcesDir + '\\', '').replace(resourcesDir + '/', ''), f]))(
  'SQL syntax valid: %s',
  async (_label, filePath) => {
    const sql = readFileSync(filePath as string, 'utf-8')
    await assertValidSql(sql, _label as string)
  },
)
