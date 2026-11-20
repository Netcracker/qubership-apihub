import { useQuery } from '@tanstack/react-query'
import type { SystemInfo, SystemInfoDto } from '../../../utils/system-info'
import { EMPTY_SYSTEM_INFO, getSystemInfoOptions } from '../../../utils/system-info'

export function useSystemInfo(enabled = true): SystemInfo {
  const { data } = useQuery<SystemInfoDto, Error, SystemInfo>(
    getSystemInfoOptions(enabled),
  )

  // TODO: WA for OT
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  window.apihubProductionMode = data?.productionMode ?? false

  return data ?? EMPTY_SYSTEM_INFO
}
