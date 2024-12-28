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

import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import type { BranchCache } from './useBranchCache'
import { BRANCH_CACHE_QUERY_KEY, useBranchCache } from './useBranchCache'
import type { JsonPath } from '@stoplight/types'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { BwcProblems } from './useBwcProblems'
import { useBwcProblems } from './useBwcProblems'
import type { ValidationDiagnostic, ValidationWorker } from './spectral-worker'
import { MAX_CONCURRENT_WORKERS_COUNT } from './spectral-worker'
import { useBranchSearchParam } from '../../useBranchSearchParam'
import { useBwcVersionKey } from './BwcVersionKeyProvider'
import Worker from './spectral-worker?worker'
import { wrap } from 'comlink'
import pLimit from 'p-limit'
import type { FileKey, Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { FileProblem } from '@apihub/entities/file-problems'
import {
  ERROR_FILE_PROBLEM_TYPE,
  INFO_FILE_PROBLEM_TYPE,
  WARN_FILE_PROBLEM_TYPE,
} from '@apihub/entities/file-problems'
import type { InvalidateQuery, IsFetching } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { deduplicate, isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import type { SpecType } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import { UNKNOWN_SPEC_TYPE } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import type { FileFormat } from '@netcracker/qubership-apihub-ui-shared/utils/files'
import { JSON_FILE_FORMAT, UNKNOWN_FILE_FORMAT, YAML_FILE_FORMAT } from '@netcracker/qubership-apihub-ui-shared/utils/files'
import type { SpecContent } from '@apihub/entities/specs'
import type { AddedLineCount } from '@apihub/utils/specifications'
import { generateSpecificationByPathItems } from '@apihub/utils/specifications'

const FILE_PROBLEMS_QUERY_KEY = 'file-problems'
const FILE_PROBLEMS_MAP: Record<FileKey, FileProblem[]> = {}

const { validate } = wrap<ValidationWorker>(new Worker())
export function useFileProblems(
  fileKey?: FileKey | null,
  withoutCache = false,
): [FileProblem[], IsFetching] {
  const { projectId } = useParams()
  const [branchName] = useBranchSearchParam()

  const bwcVersionKey = useBwcVersionKey()
  const [bwcProblems, , isBwcChecking] = useBwcProblems(bwcVersionKey)
  const [, isBranchCacheLoading] = useBranchCache()
  const client = useQueryClient()

  const { data, isLoading, isFetching } = useQuery<FileProblem[], Error>({
    queryKey: [FILE_PROBLEMS_QUERY_KEY, projectId, branchName, fileKey, withoutCache],
    queryFn: async () => {
      const branchCache = client.getQueryData<BranchCache>([BRANCH_CACHE_QUERY_KEY, projectId, branchName])!
      return getValidationMessages(
        bwcProblems,
        fileKey!,
        branchCache,
        withoutCache,
      )
    },
    enabled: !!projectId && !!branchName && !!fileKey && !isBwcChecking && !isBranchCacheLoading,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  })

  return [data ?? [], isFetching || isLoading]
}

export function useFileProblemsMap(
  fileKeys?: FileKey[],
  fileKeysHash?: Key,
): [Record<Key, FileProblem[]>, IsFetching] {
  const { projectId } = useParams()
  const [branchName] = useBranchSearchParam()

  const bwcVersionKey = useBwcVersionKey()
  const [bwcProblems, , isBwcChecking] = useBwcProblems(bwcVersionKey)
  const [branchCache, isBranchCacheLoading] = useBranchCache()

  const { data, isFetching } = useQuery<Record<Key, FileProblem[]>, Error>({
    queryKey: [FILE_PROBLEMS_QUERY_KEY, projectId, branchName, bwcVersionKey, fileKeysHash],
    queryFn: async () => {
      const result: Record<Key, FileProblem[]> = {}

      if (!fileKeys) {
        return result
      }

      const limit = pLimit(MAX_CONCURRENT_WORKERS_COUNT)
      const promises = []

      for (const fileKey of fileKeys) {
        promises.push(limit(async () => {
          result[fileKey] = await getValidationMessages(bwcProblems, fileKey, branchCache)
        }))
      }

      await Promise.all(promises)

      return result
    },
    enabled: !!projectId && !!branchName && !!fileKeys && !isBwcChecking && !isBranchCacheLoading,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  })

  return [data ?? {}, isFetching]
}

export function useUpdateBwcFileProblems(): InvalidateQuery<{ fileKey: FileKey; bwcProblems: FileProblem[] }> {
  const { projectId } = useParams()
  const [branch] = useBranchSearchParam()

  const client = useQueryClient()

  return ({ fileKey, bwcProblems }) => {
    client.setQueryData<FileProblem[]>([FILE_PROBLEMS_QUERY_KEY, projectId, branch, fileKey], oldData => {
      if (!oldData) {
        return oldData
      }
      return [
        ...oldData,
        ...bwcProblems,
      ]
    })
  }
}

export function useInvalidateValidationMessages(): InvalidateQuery<FileKey> {
  const { projectId } = useParams()
  const [branch] = useBranchSearchParam()
  const [branchCache] = useBranchCache()

  const client = useQueryClient()

  return (key: FileKey) => {
    Object.entries(branchCache).forEach(([fileKey, fileData]) => {
      if (fileData?.refFileKeys.includes(key) || fileKey === key) {
        client.invalidateQueries([FILE_PROBLEMS_QUERY_KEY, projectId, branch, fileKey]).then()
      }
    })
  }
}

export async function getValidationMessages(
  bwcProblems: BwcProblems,
  fileKey: FileKey,
  branchCache: BranchCache,
  withoutCache = false,
): Promise<FileProblem[]> {
  if (!withoutCache && FILE_PROBLEMS_MAP[fileKey]) {
    const result = [...FILE_PROBLEMS_MAP[fileKey]]
    const bwcFileProblems = bwcProblems.get(fileKey)
    bwcFileProblems && isNotEmpty(bwcFileProblems) && result.push(...bwcFileProblems)
    return deduplicate<FileProblem>(result)
  }

  const fileData = branchCache[fileKey]?.content
  const type = branchCache[fileKey]?.type || UNKNOWN_SPEC_TYPE
  const format = branchCache[fileKey]?.format
  if (!fileData || !format || format === UNKNOWN_FILE_FORMAT) {
    return []
  }

  const partialBranchCache: BranchCache = {}
  for (const ref of branchCache[fileKey]?.refFileKeys ?? []) {
    partialBranchCache[ref] = branchCache[ref]
  }

  const [initialFileContent, addedLineCount] = prepareValidationData(type, format, fileData)

  const data = await validate(fileKey, initialFileContent, partialBranchCache)

  const messages = toValidationMessages(data, fileKey, addedLineCount)
  if (!withoutCache) {
    FILE_PROBLEMS_MAP[fileKey] = messages
  }

  const bwcValidationMessages = bwcProblems.get(fileKey)
  if (!bwcValidationMessages) {
    return messages
  }

  return [...bwcValidationMessages, ...messages]
}

export function useErrorFileProblemCount(value: FileProblem[]): number {
  return useMemo(
    () => value.filter(({ type }) => type === ERROR_FILE_PROBLEM_TYPE).length,
    [value],
  )
}

export function useWarnFileProblemCount(value: FileProblem[]): number {
  return useMemo(
    () => value.filter(({ type }) => type === WARN_FILE_PROBLEM_TYPE).length,
    [value],
  )
}

export function useInfoFileProblemCount(value: FileProblem[]): number {
  return useMemo(
    () => value.filter(({ type }) => type === INFO_FILE_PROBLEM_TYPE).length,
    [value],
  )
}

export function toValidationMessages(
  data: ValidationDiagnostic[],
  fileKey: FileKey,
  lineNumberCorrection: number,
): FileProblem[] {
  return data.map(({
    code,
    message,
    source,
    path,
    range: { start: { line } },
    fileProblemType,
  }: ValidationDiagnostic) => ({
    type: fileProblemType,
    critical: code === 'invalid-ref',
    text: message,
    filePath: fileKey,
    externalFilePath: isExternalFile(source, fileKey) ? getExternalFilePath(source, path) : undefined,
    lineNumber: line + 1 - lineNumberCorrection,
  }))
}

function isExternalFile(
  currentFilePath: string | undefined,
  rootFilePath: string,
): boolean {
  return currentFilePath !== rootFilePath
}

function getExternalFilePath(
  source: string | undefined,
  path: JsonPath,
): string {
  return `${source ? `${source}` : ''}#/${jsonPathToString(path)}`
}

export function jsonPathToString(path: JsonPath): string {
  return path
    .map(segment => `${segment}`.replaceAll('~', '~0').replaceAll('/', '~1'))
    .join('/')
}

function prepareValidationData(
  type: SpecType,
  format: FileFormat,
  value: string,
): [SpecContent, AddedLineCount] {
  if (type === UNKNOWN_SPEC_TYPE && (format === JSON_FILE_FORMAT || format === YAML_FILE_FORMAT)) {
    const specification = generateSpecificationByPathItems(format, value)
    if (specification) {
      const [content, addedLineCount] = specification
      return [content, addedLineCount]
    }
  }

  return [value, 0]
}
