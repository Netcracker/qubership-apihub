import { DEFAULT_REFETCH_INTERVAL, requestJson } from './requests'
import type { UseQueryOptions } from '@tanstack/react-query'

const VERSION_INFO_QUERY_KEY = 'version-info'
const BUILD_INFO_QUERY_KEY = 'build-info'

export type VersionInfoDto = {
  frontendVersion: string
  apiProcessorVersion: string
}
export type VersionInfo = VersionInfoDto

// Written by the image entrypoint from GIT_BRANCH, GIT_HASH, and COMMIT_TIME, which the branch tag adds on top of the
// content image. The file does not exist outside the image, for example on a dev server.
export type BuildInfoDto = {
  branch: string
  commit: string
  // UTC, yyyymmddHHMMSS: the time of the commit. The entrypoint writes an empty string when the image has no COMMIT_TIME.
  committedAt: string
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
    select: buildInfo => (buildInfo ? formatImageVersion(buildInfo) : undefined),
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

// `develop.a1b2c3d.20261026104501`: the same form that the backends report, so the rows of System Information read alike.
function formatImageVersion({ branch, commit, committedAt }: BuildInfoDto): string {
  return committedAt ? `${branch}.${commit}.${committedAt}` : `${branch}.${commit}`
}
