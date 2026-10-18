import fs from 'fs'
import path from 'path'

export function loadFile(filename: string): string {
  const resPath = path.join(__dirname, '../resources/', filename)
  return fs.readFileSync(resPath, 'utf8')
}
