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

import type { Key } from '../entities/keys'

export const IdentityProviderTypes = {
  INTERNAL: 'internal',
  EXTERNAL: 'external',
} as const

export type IdentityProviderType = (typeof IdentityProviderTypes)[keyof typeof IdentityProviderTypes]

export type IdentityProviderDto = Readonly<{
  id: Key
  type: IdentityProviderType
  displayName: string
  loginStartEndpoint?: string
  imageSvg?: string
}>

export type InternalIdentityProvider = Omit<IdentityProviderDto, 'type'> & { type: typeof IdentityProviderTypes.INTERNAL }
export type ExternalIdentityProvider = Omit<IdentityProviderDto, 'type'> & { type: typeof IdentityProviderTypes.EXTERNAL }

export type SystemConfigurationDto = Readonly<{
  defaultWorkspaceId: string
  authConfig: {
    identityProviders: ReadonlyArray<IdentityProviderDto>
    autoLogin?: boolean
  }
}>

export type SystemConfiguration = SystemConfigurationDto

export function isInternalIdentityProvider(idp: IdentityProviderDto): idp is InternalIdentityProvider {
  return idp.type === IdentityProviderTypes.INTERNAL
}

export function isExternalIdentityProvider(idp: IdentityProviderDto): idp is ExternalIdentityProvider {
  return idp.type === IdentityProviderTypes.EXTERNAL
}
