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
import mime from 'mime-types'

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
import { getFileExtension } from '../../src/utils'

export const loadFileAsString = async (filePath: string, folder: string, fileName: string): Promise<string | null> => {
  return (await loadFile(filePath, folder, fileName))?.text() ?? null
}

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

export interface PackageInfo {
  packageName: string
}

export const loadConfig = async (filePath: string, folder: string, filename?: string): Promise<BuildConfig & PackageInfo | null> => {
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

export async function buildPrefixGroupChangelogPackage(options: {
  packageId: string
  config?: Partial<BuildConfig>
}): Promise<BuildResult> {
  const {
    packageId,
    config: {
      files = [{ fileId: 'spec.yaml' }],
      currentGroup = '/api/v2/',
      previousGroup = '/api/v1/',
    } = {},
  } = options ?? {}

  const pkg = LocalRegistry.openPackage(packageId)

  await pkg.publish(pkg.packageId, {
    packageId: pkg.packageId,
    version: BEFORE_VERSION_ID,
    files: files,
  })

  const editor = new Editor(pkg.packageId, {
    version: BEFORE_VERSION_ID,
    packageId: pkg.packageId,
    currentGroup: currentGroup,
    previousGroup: previousGroup,
    buildType: BUILD_TYPE.PREFIX_GROUPS_CHANGELOG,
    status: VERSION_STATUS.RELEASE,
  })
  return await editor.run()
}

export async function buildGqlChangelogPackage(
  packageId: string,
): Promise<BuildResult> {
  return buildChangelogPackage(packageId, [{ fileId: 'before.gql' }], [{ fileId: 'after.gql' }])
}

export async function buildPackage(
  packageId: string,
): Promise<BuildResult> {
  const localRegistry: LocalRegistry = LocalRegistry.openPackage(packageId)
  const editor: Editor = await Editor.openProject(localRegistry.packageId, localRegistry)
  await localRegistry.publish(localRegistry.packageId, { packageId: localRegistry.packageId })
  return await editor.run({
    version: 'v1',
    status: VERSION_STATUS.RELEASE,
    buildType: BUILD_TYPE.BUILD,
  })
}

export async function buildChangelogDashboard(
  packageId1: string,
  packageId2: string,
  dashboardPackageId: string = 'dashboards/dashboard',
  filesBefore: BuildConfigFile[] = [{ fileId: 'v1.yaml' }],
  filesAfter: BuildConfigFile[] = [{ fileId: 'v2.yaml' }],
): Promise<BuildResult> {
  const editor = await prepareChangelogDashboard(packageId1, packageId2, dashboardPackageId, filesBefore, filesAfter)
  return await editor.run()
}

export async function prepareChangelogDashboard(
  packageId1: string,
  packageId2: string,
  dashboardPackageId: string = 'dashboards/dashboard',
  filesBefore: BuildConfigFile[] = [{ fileId: 'v1.yaml' }],
  filesAfter: BuildConfigFile[] = [{ fileId: 'v2.yaml' }],
): Promise<Editor> {
  const pkg1 = LocalRegistry.openPackage(packageId1)
  const pkg2 = LocalRegistry.openPackage(packageId2)

  await pkg1.publish(pkg1.packageId, {
    packageId: pkg1.packageId,
    version: BEFORE_VERSION_ID,
    files: filesBefore,
  })
  await pkg2.publish(pkg2.packageId, {
    packageId: pkg2.packageId,
    version: AFTER_VERSION_ID,
    files: filesAfter,
  })

  const dashboard = LocalRegistry.openPackage(dashboardPackageId)
  await dashboard.publish(dashboard.packageId, {
    packageId: dashboardPackageId,
    version: BEFORE_VERSION_ID,
    apiType: 'rest',
    refs: [
      { refId: pkg1.packageId, version: BEFORE_VERSION_ID },
    ],
  })

  await dashboard.publish(dashboard.packageId, {
    packageId: dashboardPackageId,
    version: AFTER_VERSION_ID,
    apiType: 'rest',
    refs: [
      { refId: pkg2.packageId, version: AFTER_VERSION_ID },
    ],
  })

  return new Editor(dashboard.packageId, {
    version: AFTER_VERSION_ID,
    packageId: dashboard.packageId,
    previousVersionPackageId: dashboard.packageId,
    previousVersion: BEFORE_VERSION_ID,
    buildType: BUILD_TYPE.CHANGELOG,
    status: VERSION_STATUS.RELEASE,
  })
}
