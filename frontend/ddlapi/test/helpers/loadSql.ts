import { readFileSync } from 'fs'
import { join } from 'path'

export function loadSql(relativePath: string): string {
  return readFileSync(join(__dirname, '..', 'resources', relativePath), 'utf-8')
}
