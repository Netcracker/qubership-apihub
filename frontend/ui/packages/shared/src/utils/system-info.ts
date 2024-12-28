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

import type { Key } from './types'
import { DEFAULT_REFETCH_INTERVAL, requestJson } from './requests'
import type { UseQueryOptions } from '@tanstack/react-query'

const SYSTEM_INFO_QUERY_KEY = 'system-info'

export type Link = {
  title: string
  url: string
}

export type SystemInfo = {
  backendVersionKey: Key
  frontendVersionKey: Key
  productionMode: boolean
  externalLinks: Link[]
  notification?: string
}

export type SystemInfoDto = {
  backendVersion: string
  frontendVersion: string
  productionMode: boolean
  externalLinks: string[]
  notification?: string
}

export const EMPTY_SYSTEM_INFO: SystemInfo = {
  backendVersionKey: '0.0.0',
  frontendVersionKey: '0.0.0',
  productionMode: false,
  externalLinks: [],
}

export function toSystemInfo(value: SystemInfoDto): SystemInfo {
  const externalLinks = value.externalLinks.reduce<Link[]>((filteredLinks, externalLink) => {
    const verticalBarIndex = externalLink.indexOf('|')
    if (verticalBarIndex === -1) {
      return filteredLinks
    }
    filteredLinks.push({
      title: externalLink.slice(0, verticalBarIndex),
      url: externalLink.slice(verticalBarIndex),
    })
    return filteredLinks
  }, [])

  return {
    backendVersionKey: value.backendVersion,
    frontendVersionKey: value.frontendVersion,
    productionMode: value.productionMode,
    externalLinks: externalLinks,
    notification: value.notification,
  }
}

export function getSystemInfoOptions(enabled = true): UseQueryOptions<SystemInfoDto, Error, SystemInfo> {
  return {
    queryKey: [SYSTEM_INFO_QUERY_KEY],
    queryFn: getSystemInfo,
    select: toSystemInfo,
    enabled: enabled,
    refetchInterval: DEFAULT_REFETCH_INTERVAL,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  }
}

export async function getSystemInfo(): Promise<SystemInfoDto> {
  return await requestJson<SystemInfoDto>('/api/v1/system/info', {
    method: 'get',
  })
}
