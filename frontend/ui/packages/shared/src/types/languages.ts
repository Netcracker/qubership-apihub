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

import type { FileExtension } from '../utils/files'
import {
  GRAPHQL_FILE_EXTENSION,
  JSON_FILE_EXTENSION,
  MD_FILE_EXTENSION,
  PROTO_FILE_EXTENSION,
  YAML_FILE_EXTENSION,
  YML_FILE_EXTENSION,
} from '../utils/files'

export const LANGUAGE_TYPE_YAML = 'yaml'
export const LANGUAGE_TYPE_JSON = 'json'
export const LANGUAGE_TYPE_MARKDOWN = 'markdown'
export const LANGUAGE_TYPE_TEXT = 'text'
export const LANGUAGE_TYPE_GRAPHQL = 'graphql'
export const LANGUAGE_TYPE_PROTO = 'proto'

export type LanguageType =
  | typeof LANGUAGE_TYPE_YAML
  | typeof LANGUAGE_TYPE_JSON
  | typeof LANGUAGE_TYPE_MARKDOWN
  | typeof LANGUAGE_TYPE_TEXT
  | typeof LANGUAGE_TYPE_GRAPHQL
  | typeof LANGUAGE_TYPE_PROTO

export const EXTENSION_TO_TYPE_LANGUAGE_MAP: Partial<Record<FileExtension, LanguageType>> = {
  [YAML_FILE_EXTENSION]: LANGUAGE_TYPE_YAML,
  [YML_FILE_EXTENSION]: LANGUAGE_TYPE_YAML,
  [JSON_FILE_EXTENSION]: LANGUAGE_TYPE_JSON,
  [MD_FILE_EXTENSION]: LANGUAGE_TYPE_MARKDOWN,
  [GRAPHQL_FILE_EXTENSION]: LANGUAGE_TYPE_GRAPHQL,
  [PROTO_FILE_EXTENSION]: LANGUAGE_TYPE_PROTO,
}
