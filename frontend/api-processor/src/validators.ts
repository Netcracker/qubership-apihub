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

import { BuildConfig, BuilderVersionInfo, PackageConfig, VERSION_VALIDATION_LEVEL, VersionCache, VersionValidationLevel } from './types'
import { assert } from './utils'
import { BUILD_TYPE } from './consts'
import { version as apiProcessorVersion } from '../package.json'

export function validateConfig(config: BuildConfig): void {
  assert(config.packageId, 'builder config: packageId required')
  assert(config.version, 'builder config: version required')

  const filesCount = config?.files?.length
  const refsCount = config?.refs?.length
  if (!filesCount && !refsCount && config.buildType === BUILD_TYPE.BUILD) {
    throw new Error('Incorrect config. Got no files and refs')
  }

  // A changelog is the comparison and nothing else, so without a baseline there is nothing to compute.
  if (config.buildType === BUILD_TYPE.CHANGELOG && !config.previousVersion) {
    throw new Error('Incorrect config. A changelog build requires previousVersion')
  }
}

export function validateApiProcessorVersion(
  resolvedVersion: VersionCache | null,
  validationLevel: VersionValidationLevel,
  errorPrefix?: string,
): void {

  if (!resolvedVersion) {
    return
  }

  if (validationLevel === VERSION_VALIDATION_LEVEL.MAJOR) {
    const resolvedMajor = parseMajorVersion(resolvedVersion.apiProcessorVersion)
    const currentMajor = parseMajorVersion(apiProcessorVersion)
    if (resolvedMajor === null || currentMajor === null) {
      return
    }
    if (resolvedMajor !== currentMajor) {
      errorPrefix = errorPrefix ? `${errorPrefix} ` : ''
      throw new Error(`${errorPrefix}Expected api-processor major version: ${currentMajor}, got ${resolvedMajor} for package ${resolvedVersion.packageId} version ${resolvedVersion.version}`)
    }
    return
  }

  if (resolvedVersion.apiProcessorVersion !== apiProcessorVersion) {
    errorPrefix = errorPrefix ? `${errorPrefix} ` : ''
    throw new Error(`${errorPrefix}Expected api-processor version: ${apiProcessorVersion}, got ${resolvedVersion.apiProcessorVersion} for package ${resolvedVersion.packageId} version ${resolvedVersion.version}`)
  }
}

export function getMismatchedBuilderVersion(versionData: VersionCache | null | undefined): string | undefined {
  if (!versionData?.apiProcessorVersion || versionData.apiProcessorVersion === apiProcessorVersion) {
    return undefined
  }
  return versionData.apiProcessorVersion
}

export function applyBuilderVersionInfo(config: PackageConfig, source: BuilderVersionInfo): void {
  if (source.previousVersionBuilderVersion) {
    config.previousVersionBuilderVersion = source.previousVersionBuilderVersion
  } else {
    delete config.previousVersionBuilderVersion
  }
  if (source.currentVersionBuilderVersion) {
    config.currentVersionBuilderVersion = source.currentVersionBuilderVersion
  } else {
    delete config.currentVersionBuilderVersion
  }
}

function parseMajorVersion(version: string): number | null {
  const match = version.match(/^(\d+)\./)
  return match ? parseInt(match[1], 10) : null
}
