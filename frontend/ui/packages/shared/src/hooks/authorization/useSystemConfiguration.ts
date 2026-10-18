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
import { useEffect } from 'react'
import type { IdentityProviderType, SystemConfiguration, SystemConfigurationDto } from '../../types/system-configuration'
import { IdentityProviderTypes } from '../../types/system-configuration'
import type { IsLoading } from '../../utils/aliases'
import { SESSION_STORAGE_KEY_SYSTEM_CONFIGURATION } from '../../utils/constants'
import { API_V2, requestJson } from '../../utils/requests'

const SYSTEM_CONGIGURATION_QUERY_KEY = 'system-configuration-query-key'

export function useSystemConfiguration(): [SystemConfiguration | null, IsLoading, Error | null] {
  const { data, isLoading, error } = useQuery<SystemConfigurationDto, Error, SystemConfiguration>({
    queryKey: [SYSTEM_CONGIGURATION_QUERY_KEY],
    queryFn: () => systemConfiguration(),
    enabled: true,
    select: toSystemConfiguration,
  })

  useEffect(() => {
    if (data) {
      sessionStorage.setItem(SESSION_STORAGE_KEY_SYSTEM_CONFIGURATION, JSON.stringify(data))
    } else {
      sessionStorage.removeItem(SESSION_STORAGE_KEY_SYSTEM_CONFIGURATION)
    }
  }, [data])

  return [data ?? null, isLoading, error]
}

export async function systemConfiguration(): Promise<SystemConfigurationDto> {
  return await requestJson<SystemConfigurationDto>(
    '/system/configuration',
    { method: 'GET' },
    { basePath: API_V2 },
  )
}

export function toSystemConfiguration(value: SystemConfigurationDto): SystemConfiguration {
  return {
    defaultWorkspaceId: value.defaultWorkspaceId,
    authConfig: {
      ...value.authConfig,
      identityProviders: [
        ...value.authConfig.identityProviders.map(idp => ({
          ...idp,
          displayName: idp.displayName || defaultProviderName(idp.type),
        })),
      ],
    },
    extensions: value.extensions,
  }
}

function defaultProviderName(idpType: IdentityProviderType): string {
  switch (idpType) {
    case IdentityProviderTypes.INTERNAL:
      return 'Log in'
    case IdentityProviderTypes.EXTERNAL:
      return 'SSO'
    default:
      return 'Unknown'
  }
}
