import fs from 'fs'
import path from 'path'

export function generateRandomDigit(): number {
  return Math.floor(Math.random() * 10)
}

export function getFileContent(fileId: string): Buffer {
  try {
    return fs.readFileSync(path.join(__dirname, `./resources/${fileId}`))
  } catch (err) {
    const message = `Unable to load file '${fileId}'`
    console.error(message)
    throw Error(message)
  }
}
