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

import type { FileKey, ServiceKey, SpecKey } from './keys'
import type { FileExtension } from '../utils/files'
import type { SpecType } from '../utils/specs'

export type Spec = Readonly<{
  key: SpecKey
  serviceKey?: ServiceKey
  name: string
  extension: FileExtension
  type: SpecType
  proxyServerUrl?: string
}>

export type SpecDto = Readonly<{
  fileId: FileKey
  name: string
  format: 'json' | 'yaml' | 'graphql'
  type: SpecType
}>

export type SpecRaw = string

export function toSpec(value: SpecDto, serviceId: ServiceKey, proxyServerUrl?: string): Spec {
  return {
    key: value.fileId,
    serviceKey: serviceId,
    name: value.name,
    extension: `.${value.format}`,
    type: value.type,
    proxyServerUrl: proxyServerUrl,
  }
}
