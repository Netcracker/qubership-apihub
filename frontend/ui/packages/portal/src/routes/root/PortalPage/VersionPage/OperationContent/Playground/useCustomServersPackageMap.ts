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

import { useCallback, useState } from 'react'
import { safeParse } from '@stoplight/json'
import { useSetCustomServersContext } from './CustomServersProvider'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'

export function getCustomServersPackageMapFromLocalStorage(): CustomServersPackageMap {
  return safeParse(localStorage.getItem(CUSTOM_SERVERS_KEY) ?? '') ?? {}
}

export function useCustomServersPackageMap(): [CustomServersPackageMap, SetCustomServersPackageMap] {
  const [customServers, setCustomServers] = useState<CustomServersPackageMap>(getCustomServersPackageMapFromLocalStorage)
  const setCustomServersMap = useSetCustomServersContext()

  const updateCustomServers = useCallback((key: string, value: CustomServer[]) => {
    const data = { ...customServers, [key]: value }

    localStorage.setItem(CUSTOM_SERVERS_KEY, JSON.stringify(data))
    setCustomServers(data)
    setCustomServersMap(data)
  }, [customServers, setCustomServersMap])

  return [
    customServers,
    updateCustomServers,
  ]
}

export const CUSTOM_SERVERS_KEY = 'custom-servers'
export type CustomServersPackageMap = Record<Key, CustomServer[]>
export type SetCustomServersPackageMap = (key: string, value: CustomServer[]) => void

export type CustomServer = {
  url: string
  description?: string
}
