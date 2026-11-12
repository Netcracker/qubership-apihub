import { BuildConfig } from '@netcracker/qubership-apihub-api-processor'
import { parse } from 'parse-multipart-data'
import FormData from 'form-data'
import fs from 'fs/promises'
import path from 'path'

export const loadFile = async (filePath: string, folder: string, fileName: string): Promise<string> => {
  const filepath = path.join(process.cwd(), filePath, folder, fileName)
  const file = await fs.readFile(filepath, 'utf8')
  return file.toString()
}

export const loadConfig = async (filePath: string, folder: string): Promise<BuildConfig> => {
  const data = await loadFile(filePath, folder, 'config.json')
  return JSON.parse(data)
}

export const parseFormData = (data: FormData) => {
  const parts = parse(data.getBuffer(), data.getBoundary())
  const result: any = {}
  for (const part of parts) {
    result[part.name] = part.type ? part : part.data.toString()
  }
  return result
}
