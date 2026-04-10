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

import { fs as memfsModule } from 'memfs'
import * as realFs from 'fs/promises'
import path from 'path'
import mime from 'mime-types'
import { getFileExtension } from '../../../src/utils'

/**
 * Set FS_MODE=disk to write build results to disk instead of memory.
 * Useful for debugging test output.
 *
 * Usage:
 *   npm run test:disk
 */
const FS_MODE = process.env.FS_MODE ?? 'memory'
const useDisk = FS_MODE === 'disk'

if (useDisk) {
  console.warn('[registryFs] Running in DISK mode')
}

type FsPromises = typeof realFs

const registryFs: FsPromises = useDisk
  ? realFs
  : memfsModule.promises as unknown as FsPromises

/**
 * Read a file from the build result stored in registry filesystem (memfs or disk).
 * Use this to read files that were produced by the build process (e.g. operations, documents, configs).
 * For reading source/input files from the real filesystem, use {@link loadFile} from `../utils.ts` instead.
 */
export async function loadFileFromRegistry(filePath: string, folder: string, fileName: string): Promise<File | null> {
  try {
    const fullPath = registryPath(filePath, folder, fileName)
    const mediaType = mime.lookup(fileName) || (['graphql', 'gql'].includes(getFileExtension(fileName)) ? 'text/plain' : false)
    const buffer = await registryFs.readFile(fullPath)
    return new File([buffer], fileName, { type: mediaType || '' })
  } catch (error) {
    return null
  }
}

/**
 * Read a file as string from the build result stored in registry filesystem (memfs or disk).
 * Use this to read build output files as text.
 * For reading source/input files as string from the real filesystem, use {@link loadFileAsString} from `../utils.ts` instead.
 */
export async function loadFileAsStringFromRegistry(filePath: string, folder: string, fileName: string): Promise<string | null> {
  return (await loadFileFromRegistry(filePath, folder, fileName))?.text() ?? null
}

/**
 * Read a JSON config from the build result stored in registry filesystem (memfs or disk).
 * Use this to read config files produced by the build process.
 * For reading source/input configs from the real filesystem, use {@link loadConfig} from `../utils.ts` instead.
 */
export async function loadConfigFromRegistry(filePath: string, folder: string, filename?: string): Promise<any | null> {
  try {
    const fullPath = registryPath(filePath, folder, filename ?? 'config.json')
    const file = await registryFs.readFile(fullPath, 'utf8')
    return JSON.parse(file.toString())
  } catch (error) {
    return null
  }
}

/**
 * Build a path within the registry filesystem — absolute on disk, posix in memory.
 */
export function registryPath(...segments: string[]): string {
  return useDisk
    ? path.resolve(process.cwd(), ...segments)
    : path.posix.join(...segments)
}

export { registryFs }
