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

const SPECIFICATION_FILE_EXTENSIONS = [
  '.json',
  '.yaml',
  '.yml',
  '.graphql',
  '.gql',
  '.proto',
  '.sql',
  '.ddl',
]

const DOCUMENTATION_FILE_EXTENSIONS = [
  '.md',
  '.txt',
  '.html',
  '.pdf',
  '.docx',
  '.docm',
  '.xlsx',
]

const IMAGE_FILE_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
]

const ARCHIVE_FILE_EXTENSIONS = [
  '.zip',
  '.tgz',
]

export const ACCEPTABLE_VERSION_FILE_EXTENSIONS: readonly string[] = [
  ...SPECIFICATION_FILE_EXTENSIONS,
  ...DOCUMENTATION_FILE_EXTENSIONS,
  ...IMAGE_FILE_EXTENSIONS,
  ...ARCHIVE_FILE_EXTENSIONS,
]

// Null byte (raw or URL-encoded) can truncate the name on the server side: 'shell.php%00.jpg' -> 'shell.php'
const NULL_BYTE_MARKERS = ['%00', '\0']

export function isAcceptableFileName(fileName: string, acceptableExtensions: readonly string[]): boolean {
  if (NULL_BYTE_MARKERS.some(marker => fileName.includes(marker))) {
    return false
  }
  const extension = getLowerCaseFileExtension(fileName)
  return extension !== '' && acceptableExtensions.includes(extension)
}

export function partitionFilesByExtension(files: File[], acceptableExtensions: readonly string[]): { accepted: File[]; rejected: File[] } {
  const accepted: File[] = []
  const rejected: File[] = []
  for (const file of files) {
    if (isAcceptableFileName(file.name, acceptableExtensions)) {
      accepted.push(file)
    } else {
      rejected.push(file)
    }
  }
  return { accepted, rejected }
}

export function toAllowedFormatsEnumeration(acceptableExtensions: readonly string[]): string {
  return acceptableExtensions.map(extension => extension.slice(1)).join(', ')
}

export function createUnsupportedFilesMessage(rejectedFiles: File[], acceptableExtensions: readonly string[]): string {
  const rejectedFileNames = rejectedFiles.map(({ name }) => name).join(', ')
  return `The file format is not supported: ${rejectedFileNames}.\nAllowed formats: ${toAllowedFormatsEnumeration(acceptableExtensions)}`
}

// Only the last extension counts: 'file.jpg.php' -> '.php'
function getLowerCaseFileExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.')
  if (dotIndex <= 0 || dotIndex === fileName.length - 1) {
    return ''
  }
  return fileName.slice(dotIndex).toLowerCase()
}
