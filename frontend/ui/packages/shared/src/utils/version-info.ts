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
const BUILD_INFO_QUERY_KEY = 'build-info'

export type VersionInfoDto = {
  frontendVersion: string
  apiProcessorVersion: string
}
export type VersionInfo = VersionInfoDto

// Written by the image entrypoint from GIT_BRANCH, GIT_HASH, and BUILD_TIME, which the branch tag adds on top of the
// content image. The file does not exist outside the image, for example on a dev server.
export type BuildInfoDto = {
  branch: string
  commit: string
  // UTC, yyyymmddHHMMSS: when the tag was published. Empty when the image has no BUILD_TIME.
  builtAt?: string
}

const BUILD_TIME_PATTERN = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})\d{2}$/

// `develop.a1b2c3d, 2026-10-26 10:45 UTC`
function formatBuildRef({ branch, commit, builtAt }: BuildInfoDto): string {
  const time = builtAt?.match(BUILD_TIME_PATTERN)
  return time
    ? `${branch}.${commit}, ${time[1]}-${time[2]}-${time[3]} ${time[4]}:${time[5]} UTC`
    : `${branch}.${commit}`
}

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

export function getBuildInfoOptions(appType: AppTypeApiHub): UseQueryOptions<BuildInfoDto | null, Error, string | undefined> {
  return {
    queryKey: [BUILD_INFO_QUERY_KEY, appType],
    queryFn: () => getBuildInfo(appType),
    select: buildInfo => (buildInfo ? formatBuildRef(buildInfo) : undefined),
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  }
}

async function getBuildInfo(appType: AppTypeApiHub): Promise<BuildInfoDto | null> {
  return await requestJson<BuildInfoDto | null>(`/${appType}/build-info.json`, {
    method: 'get',
  }, { ignoreNotFound: true })
}
