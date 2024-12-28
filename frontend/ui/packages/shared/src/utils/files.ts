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

import { GRAPHQL_FILE_FORMAT } from '@netcracker/qubership-apihub-api-processor'
import type { Key } from './types'
import JSZip from 'jszip'
import type { SpecType } from './specs'
import {
  GRAPHAPI_SPEC_TYPE,
  GRAPHQL_INTROSPECTION_SPEC_TYPE,
  GRAPHQL_SCHEMA_SPEC_TYPE,
  JSON_SCHEMA_SPEC_TYPE,
  MARKDOWN_SPEC_TYPE,
  OPENAPI_2_0_SPEC_TYPE,
  OPENAPI_3_0_SPEC_TYPE,
  OPENAPI_3_1_SPEC_TYPE,
  PROTOBUF_3_SPEC_TYPE,
  UNKNOWN_SPEC_TYPE,
} from './specs'
import { isFastJsonSchema, toJsonSchema } from './specifications'

export const YAML_FILE_EXTENSION = '.yaml'
export const YML_FILE_EXTENSION = '.yml'
export const JSON_FILE_EXTENSION = '.json'
export const MD_FILE_EXTENSION = '.md'
export const HTML_FILE_EXTENSION = '.html'
export const GRAPHQL_FILE_EXTENSION = '.graphql'
export const GQL_FILE_EXTENSION = '.gql'
export const PROTO_FILE_EXTENSION = '.proto'

export type FileExtension =
  | typeof YAML_FILE_EXTENSION
  | typeof YML_FILE_EXTENSION
  | typeof JSON_FILE_EXTENSION
  | typeof MD_FILE_EXTENSION
  | typeof HTML_FILE_EXTENSION
  | typeof GRAPHQL_FILE_EXTENSION
  | typeof GQL_FILE_EXTENSION
  | typeof PROTO_FILE_EXTENSION

export function calculateSpecType(extension: Exclude<FileExtension, typeof YML_FILE_EXTENSION>, content: string): SpecType {
  if (extension === JSON_FILE_EXTENSION) {
    const schema = toJsonSchema(content)
    if (isFastJsonSchema(schema)) {
      return JSON_SCHEMA_SPEC_TYPE
    }

    return findOpenapiType(content) ?? UNKNOWN_SPEC_TYPE
  }

  if (extension === YAML_FILE_EXTENSION) {
    return findOpenapiType(content) ?? UNKNOWN_SPEC_TYPE
  }

  if (extension === MD_FILE_EXTENSION) {
    return MARKDOWN_SPEC_TYPE
  }

  if (extension === PROTO_FILE_EXTENSION) {
    return PROTOBUF_3_SPEC_TYPE
  }

  if (!extension) {
    const schema = toJsonSchema(content)
    if (isFastJsonSchema(schema)) {
      return JSON_SCHEMA_SPEC_TYPE
    }

    return findOpenapiType(content) ?? UNKNOWN_SPEC_TYPE
  }

  return findGraphQlSpecType(extension, content) ?? UNKNOWN_SPEC_TYPE
}

function findOpenapiType(content: string): SpecType | null {
  const schema = toJsonSchema(content)
  if (!schema || typeof schema !== 'object') {
    return null
  }

  if ('swagger' in schema) {
    return OPENAPI_2_0_SPEC_TYPE
  }
  if ('openapi' in schema && schema['openapi'] && typeof schema['openapi'] === 'string') {
    const openapi = schema['openapi'] as string
    if (openapi.startsWith('3.0')) {
      return OPENAPI_3_0_SPEC_TYPE
    }
    if (openapi.startsWith('3.1')) {
      return OPENAPI_3_1_SPEC_TYPE
    }
  }

  return null
}

export function findGraphQlSpecType(extension: string, raw: string): SpecType | null {
  if (extension === JSON_FILE_EXTENSION || (!extension && raw.trimStart().startsWith('{'))) {
    if (/"graphapi"(\s*)?:(\s*)"0.+"/g.test(raw)) {
      return GRAPHAPI_SPEC_TYPE
    }
    if (/{(\s*)"__schema"(\s*)?:(\s*){/g.test(raw)) {
      return GRAPHQL_INTROSPECTION_SPEC_TYPE
    }
  }
  if (extension === GQL_FILE_EXTENSION || extension === GRAPHQL_FILE_EXTENSION) {
    return GRAPHQL_SCHEMA_SPEC_TYPE
  }

  return null
}

export function isJsonFile(fileName: string | undefined): boolean {
  return fileName ? fileName.endsWith(JSON_FILE_EXTENSION) : false
}

export function isYamlFile(fileName: string | undefined): boolean {
  return fileName ? fileName?.endsWith(YAML_FILE_EXTENSION) || fileName?.endsWith(YML_FILE_EXTENSION) : false
}

export function isMarkdownFile(fileName: string | undefined): boolean {
  return fileName ? fileName?.endsWith(MD_FILE_EXTENSION) : false
}

export function getFileExtension(fileName: string = ''): Exclude<FileExtension, typeof YML_FILE_EXTENSION> {
  const fileExtension = fileName.substring(fileName.lastIndexOf('.'), fileName.length) as FileExtension
  return fileExtension === YML_FILE_EXTENSION ? YAML_FILE_EXTENSION : fileExtension
}

export function getFileName(key: Key): string {
  return key.substring(key.lastIndexOf('/') + 1)
}

export function getFilePath(key: Key): string {
  return key.substring(0, key.lastIndexOf('/') + 1)
}

export const JSON_FILE_FORMAT = 'json'
export const YAML_FILE_FORMAT = 'yaml'
export const PROTOBUF_FILE_FORMAT = 'proto'
export const MD_FILE_FORMAT = 'md'
export const UNKNOWN_FILE_FORMAT = 'unknown'

export type FileFormat =
  | typeof JSON_FILE_FORMAT
  | typeof YAML_FILE_FORMAT
  | typeof PROTOBUF_FILE_FORMAT
  | typeof MD_FILE_FORMAT
  | typeof GRAPHQL_FILE_FORMAT
  | typeof UNKNOWN_FILE_FORMAT

export function getFileFormat(fileName: string): FileFormat {
  const extension = getFileExtension(fileName)

  if (extension === YAML_FILE_EXTENSION) {
    return YAML_FILE_FORMAT
  }
  if (extension === JSON_FILE_EXTENSION) {
    return JSON_FILE_FORMAT
  }
  if (extension === PROTO_FILE_EXTENSION) {
    return PROTOBUF_FILE_FORMAT
  }
  if (extension === MD_FILE_EXTENSION) {
    return MD_FILE_FORMAT
  }
  if ([GRAPHQL_FILE_EXTENSION, GQL_FILE_EXTENSION].includes(extension)) {
    return GRAPHQL_FILE_FORMAT
  }

  return UNKNOWN_FILE_FORMAT
}

// Copy-pasted from `apihub-builder`
export const slugify = (text: string, slugs: string[] = []): string => {
  const slug = text
    .toString()
    .normalize('NFKD')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '-')
    .replace(/--+/g, '-')
  let suffix: string = ''
  // add suffix if not unique
  while (slugs.includes(slug + suffix)) { suffix = String(+suffix + 1) }
  return slug + suffix
}

export const transformFileListToFileArray = (fileList: FileList): File[] => {
  const acceptedFiles: File[] = []
  for (const file of fileList) {
    acceptedFiles.push(file)
  }
  return acceptedFiles
}

export const packToZip = (files: File[]): Promise<Blob> => {
  const zip = new JSZip()
  files.forEach(file => zip.file(file.name, file))
  return zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 9,
    },
  })
}
