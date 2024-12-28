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

import jwtDecode from 'jwt-decode'
import type { TokenPayload, TokenPayloadDto } from '../types/authorization'

export function getTokenPayload(token: string): TokenPayload {
  let tokenPayload
  try {
    tokenPayload = toTokenPayload(jwtDecode<TokenPayloadDto>(token))
  } catch (e) {
    console.error(e)
  }
  return tokenPayload ?? DEFAULT_TOKEN_PAYLOAD
}

const DEFAULT_TOKEN_PAYLOAD: TokenPayload = {
  id: 'sysadm',
  exp: new Date(),
  extensions: {
    gitIntegration: false,
  },
  groups: [],
  name: 'sysadm',
}

export function isTokenExpired(token?: string): boolean {
  if (!token) {
    return true
  }

  return getTokenPayload(token).exp < new Date()
}

function toTokenPayload(value: TokenPayloadDto): TokenPayload {
  const [gitIntegration] = value.Extensions?.gitIntegration ?? ['true']
  const [systemRole] = value.Extensions?.systemRole ?? ['']

  return {
    id: value.ID,
    name: value.Name,
    groups: value.Groups,
    extensions: {
      gitIntegration: gitIntegration === 'true',
      systemAdmin: systemRole === 'System administrator',
    },
    exp: new Date(value.exp * 1000),
  }
}
