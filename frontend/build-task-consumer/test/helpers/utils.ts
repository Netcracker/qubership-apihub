/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
