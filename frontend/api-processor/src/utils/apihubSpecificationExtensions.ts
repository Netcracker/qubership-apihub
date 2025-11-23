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

import { isObject } from '@netcracker/qubership-apihub-json-crawl'
import { CUSTOM_PARAMETER_API_AUDIENCE, FILE_FORMAT_JSON, FILE_FORMAT_YAML } from '../consts'
import { API_AUDIENCE_EXTERNAL, API_AUDIENCE_INTERNAL, API_AUDIENCE_UNKNOWN, ApiAudience } from '../types'
import YAML from 'js-yaml'

export type CustomTags = Record<string, unknown>

/**
 * Extracts all custom extension properties (starting with 'x-') from an object
 * @param data - Object to extract extensions from
 * @returns Object containing all x-* properties
 */
export function getCustomTags(data: object): CustomTags {
  const initialValue: CustomTags = {}
  if (!data || typeof data !== 'object') {
    return initialValue
  }

  return Object.entries(data)
    .filter(([key]) => key.startsWith('x-'))
    .reduce((acc, [key, value]) => {
      acc[key] = value
      return acc
    }, { ...initialValue })
}

/**
 * Resolves the API audience from specification info object
 * Looks for x-api-audience extension property
 * @param info - Info object from specification
 * @returns API audience (internal, external, or unknown)
 */
export const resolveApiAudience = (info: unknown): ApiAudience => {
  if (!isObject(info)) {
    return API_AUDIENCE_EXTERNAL
  }
  if (!(CUSTOM_PARAMETER_API_AUDIENCE in info)) {
    return API_AUDIENCE_EXTERNAL
  }
  let apiAudience = Object.entries(info).find(([key, _]) => key === CUSTOM_PARAMETER_API_AUDIENCE)!.pop() as ApiAudience
  apiAudience = [API_AUDIENCE_INTERNAL, API_AUDIENCE_EXTERNAL].includes(apiAudience) ? apiAudience : API_AUDIENCE_UNKNOWN
  return apiAudience
}

type TextBlobConstructorParameters = [[string], BlobPropertyBag]

/**
 * Serializes a value to YAML or JSON format for Blob construction
 * @param value - Value to serialize
 * @param format - Target format (yaml or json)
 * @returns Parameters for Blob constructor
 */
export const dump = (value: unknown, format: typeof FILE_FORMAT_YAML | typeof FILE_FORMAT_JSON): TextBlobConstructorParameters => {
  if (format === FILE_FORMAT_YAML) {
    return [[YAML.dump(value)], { type: 'application/yaml' }]
  }
  if (format === FILE_FORMAT_JSON) {
    return [[JSON.stringify(value, undefined, 2)], { type: 'application/json' }]
  }
  throw new Error(`Unsupported format: ${format}`)
}

// Extension constant keys (generic for all API types)
export const API_KIND_KEY = 'x-api-kind'
export const DEPRECATED_META_KEY = 'x-deprecated-meta'

