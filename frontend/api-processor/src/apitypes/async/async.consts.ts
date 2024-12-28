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

export const ASYNC_OPERATIONS = {
  publish: 'publish',
  subscribe: 'subscribe',
}

export const ASYNC_SCOPES = {
  all: 'all',
  annotation: 'annotation',
  request: 'request',
  response: 'response',
  properties: 'properties',
  examples: 'examples',
} as const

export const ASYNC_DOCUMENT_TYPE = {
  AAS2: 'asyncapi-2-0',
  AAS3: 'asyncapi-3-0',
} as const

export const ASYNC_FILE_FORMAT = {
  YAML: 'yaml',
  JSON: 'json',
}
