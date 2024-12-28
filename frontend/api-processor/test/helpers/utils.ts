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

import fs from 'fs/promises'
import path from 'path'

import {
  BUILD_TYPE,
  BuildConfig,
  BuildConfigFile,
  BuildResult,
  ChangeSummary,
  EMPTY_CHANGE_SUMMARY,
  VERSION_STATUS,
} from '../../src'
import { buildSchema, introspectionFromSchema } from 'graphql/utilities'
import { LocalRegistry } from './registry'
import { Editor } from './editor'

export const loadFileAsString = async (filePath: string, folder: string, fileName: string): Promise<string | null> => {
  return (await loadFile(filePath, folder, fileName))?.text() ?? null
}

export const loadFile = async (filePath: string, folder: string, fileName: string): Promise<Blob | null> => {
  try {
    const filepath = path.join(process.cwd(), filePath, folder, fileName)
    return new Blob([await fs.readFile(filepath)])
  } catch (error) {
    //throw new Error(`Error while reading file: ${error}`)
    return null
  }
}

export const loadConfig = async (filePath: string, folder: string, filename?: string): Promise<BuildConfig | null> => {
  try {
    const filepath = path.join(process.cwd(), filePath, folder, filename ?? 'config.json')
    const file = await fs.readFile(filepath, 'utf8')
    return JSON.parse(file.toString())
  } catch (error) {
    return null
  }
}

export const convertToIntrospection = async (filePath: string, folder: string, filename?: string): Promise<void> => {
  try {
    const { files } = await loadConfig(filePath, folder, filename) ?? { files: [] }

    for (const { fileId } of files!) {
      const file = await loadFileAsString(filePath, folder, fileId)
      if (!file) {
        continue
      }

      const outputPath = path.join(filePath, 'cloud-graphql-intros', fileId)
      const schema = buildSchema(file, { assumeValid: true, assumeValidSDL: true })
      const introspection = introspectionFromSchema(schema)
      const data = JSON.stringify(introspection)
      await fs.writeFile(outputPath, data)
    }

  } catch (error) {
    console.error(error)
  }
}

export const getConfigFilesForDir = async (folder: string): Promise<Pick<BuildConfig, 'files'> | null> => {
  try {
    const filepath = path.join(process.cwd(), 'test/projects', folder)
    const dir = await fs.readdir(filepath)

    const files = []

    for (const filename of dir) {
      if (filename === 'config.json') {
        continue
      }

      files.push({ fileId: `${folder}/${filename}`, publish: true })
    }

    return {
      files: files,
    }
  } catch (error) {
    return null
  }
}

export const getVersionChanges = (result: BuildResult): { [key: string]: ChangeSummary } => {
  const summary: any = {}
  for (const comparison of result.comparisons) {
    for (const { apiType, changesSummary = {} } of comparison.operationTypes) {
      summary[apiType] = summary[apiType] || EMPTY_CHANGE_SUMMARY

      for (const [key, value] of Object.entries(changesSummary)) {
        summary[apiType][key] += value
      }
    }
  }
  return summary
}

const BEFORE_VERSION_ID = 'v1'
const AFTER_VERSION_ID = 'v2'

export async function buildChangelogPackage(
  packageId: string,
  filesBefore: BuildConfigFile[] = [{ fileId: 'before.yaml' }],
  filesAfter: BuildConfigFile[] = [{ fileId: 'after.yaml' }],
): Promise<BuildResult> {
  const pkg = LocalRegistry.openPackage(packageId)

  await pkg.publish(pkg.packageId, {
    packageId: pkg.packageId,
    version: BEFORE_VERSION_ID,
    files: filesBefore,
  })
  await pkg.publish(pkg.packageId, {
    packageId: pkg.packageId,
    version: AFTER_VERSION_ID,
    files: filesAfter,
  })

  const editor = new Editor(pkg.packageId, {
    version: AFTER_VERSION_ID,
    packageId: pkg.packageId,
    previousVersionPackageId: pkg.packageId,
    previousVersion: BEFORE_VERSION_ID,
    buildType: BUILD_TYPE.CHANGELOG,
    status: VERSION_STATUS.RELEASE,
  })
  return await editor.run()
}

export async function buildGqlChangelogPackage(
  packageId: string,
): Promise<BuildResult> {
  return buildChangelogPackage(packageId, [{ fileId: 'before.gql' }], [{ fileId: 'after.gql' }])
}
