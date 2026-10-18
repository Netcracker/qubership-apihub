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

import { DEFAULT_REFETCH_INTERVAL, requestJson } from './requests'
import type { UseQueryOptions } from '@tanstack/react-query'

const VERSION_INFO_QUERY_KEY = 'version-info'

export type VersionInfoDto = {
  frontendVersion: string
  apiProcessorVersion: string
}
export type VersionInfo = VersionInfoDto

export const Apps = {
  portal: 'portal',
  agent: 'agents',
} as const

export const { portal, agent } = Apps
export type AppTypeApiHub = typeof Apps[keyof typeof Apps]

export function getVersionInfoOptions(appType: AppTypeApiHub): UseQueryOptions<VersionInfoDto, Error, VersionInfo> {
  return {
    queryKey: [VERSION_INFO_QUERY_KEY],
    queryFn: () => getVersionInfo(appType),
    enabled: true,
    refetchInterval: DEFAULT_REFETCH_INTERVAL,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  }
}

export async function getVersionInfo(appType: AppTypeApiHub): Promise<VersionInfoDto> {
  return await requestJson<VersionInfoDto>(`/${appType}/version.json`, {
    method: 'get',
  })
}
