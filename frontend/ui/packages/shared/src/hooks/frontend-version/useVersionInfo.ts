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

import { useQuery } from '@tanstack/react-query'
import type { AppTypeApiHub, VersionInfo, VersionInfoDto } from '../../utils/version-info'
import { portal } from '../../utils/version-info'
import { getVersionInfoOptions } from '../../utils/version-info'
import * as packageJson from '../../../../portal/package.json'

const emptyVersion: VersionInfo = { frontendVersion: packageJson.version, apiProcessorVersion: 'unknown' }

export function useVersionInfo(appType: AppTypeApiHub = portal): VersionInfo {
  const { data } = useQuery<VersionInfoDto, Error, VersionInfo>(
    getVersionInfoOptions(appType),
  )

  return data ?? emptyVersion
}
