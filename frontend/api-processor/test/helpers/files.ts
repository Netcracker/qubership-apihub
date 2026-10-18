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

import JSZip from 'jszip'
import fs from 'fs/promises'
import path from 'path'
import mime from 'mime-types'
import {
  BuildConfig,
} from '../../src/processor'
import { getFileExtension } from '../../src/utils'
import { parse } from 'yaml'

/**
 * Read a file as string from the real filesystem (source/input files).
 * Use this to read original project files before the build.
 * For reading build result files from registry, use {@link loadFileAsStringFromRegistry} from `./registry/fs` instead.
 */
export const loadFileAsString = async (filePath: string, folder: string, fileName: string): Promise<string | null> => {
  return await (await loadFile(filePath, folder, fileName))?.text() ?? null
}

/**
 * Read a file from the real filesystem (source/input files).
 * Use this to read original project files before the build.
 * For reading build result files from registry, use {@link loadFileFromRegistry} from `./registry/fs` instead.
 */
export const loadFile = async (filePath: string, folder: string, fileName: string): Promise<File | null> => {
  try {
    const filepath = path.join(process.cwd(), filePath, folder, fileName)
    const mediaType = mime.lookup(fileName) || (['graphql', 'gql'].includes(getFileExtension(fileName)) ? 'text/plain' : false)
    if (!mediaType) {
      console.error('Can\'t lookup the media type')
    }
    return new File([await fs.readFile(filepath)], fileName, { type: mediaType || '' })
  } catch (error) {
    //throw new Error(`Error while reading file: ${error}`)
    return null
  }
}

/**
 * Throw unless every listed file exists in the fixture folder.
 * A build reports a missing file only as a `File was not parsed` notification, so a mistyped or renamed fixture path
 * would otherwise leave a test green with nothing built from it.
 */
export const assertFixtureFilesExist = async (filePath: string, folder: string, fileIds: string[]): Promise<void> => {
  const missing: string[] = []
  for (const fileId of fileIds) {
    // a directory would pass a plain existence check, and `loadFile` would then read it as nothing
    const isFile = await fs.stat(path.join(process.cwd(), filePath, folder, fileId))
      .then(stat => stat.isFile(), () => false)
    if (!isFile) { missing.push(`'${fileId}'`) }
  }
  if (missing.length) {
    throw new Error(`The fixture folder '${path.join(filePath, folder)}' has no file ${missing.join(', ')}`)
  }
}

export interface PackageInfo {
  packageName: string
}

/**
 * Read a JSON config from the real filesystem (source/input configs).
 * Use this to read original project configs before the build.
 * For reading build result configs from registry, use {@link loadConfigFromRegistry} from `./registry/fs` instead.
 */
export const loadConfig = async (filePath: string, folder: string, filename?: string): Promise<BuildConfig & PackageInfo | null> => {
  try {
    const filepath = path.join(process.cwd(), filePath, folder, filename ?? 'config.json')
    const file = await fs.readFile(filepath, 'utf8')
    return JSON.parse(file.toString())
  } catch (error) {
    return null
  }
}

export const loadYamlFile = async <T>(relativePath: string): Promise<T> => {
  const filePath = path.join(process.cwd(), 'test/projects', relativePath)
  const content = await fs.readFile(filePath, 'utf8')
  return parse(content) as T
}

export const readJsonFromZip = async <T>(zip: JSZip, name: string): Promise<T> => {
  const entry = zip.file(name)
  if (!entry) {
    throw new Error(`Cannot find ${name} in the build result`)
  }
  return JSON.parse(await entry.async('string')) as T
}
