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

import { ApiAudienceTransition, RISKY_CHANGE_TYPE } from './../types/external/comparison'
import {
  ANNOTATION_CHANGE_TYPE,
  BREAKING_CHANGE_TYPE,
  ChangeSummary,
  DEPRECATED_CHANGE_TYPE,
  ImpactedOperationSummary,
  NON_BREAKING_CHANGE_TYPE,
  UNCLASSIFIED_CHANGE_TYPE,
} from '../types'
import { Diff, DiffType } from '@netcracker/qubership-apihub-api-diff'
import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'
import { OperationPair } from '../components'
import { isString } from './objects'
import {
  APIHUB_API_COMPATIBILITY_KIND_BWC,
  APIHUB_API_COMPATIBILITY_KIND_EXPERIMENTAL,
  APIHUB_API_COMPATIBILITY_KIND_NO_BWC,
  ApihubApiCompatibilityKind,
} from '../consts'

export type ObjPath = (string | number)[]

export const assert = (value: any, message: string): void => {
  if (!value) {
    throw new Error(message)
  }
}

export const removeFirstSlash = (input: string): string => {
  return input.startsWith('/') ? input.substring(1) : input
}

export function trimSlashes(input: string): string {
  return input.replace(/^\/+|\/+$/g, '')
}

export type NormalizedPath = string

export const normalizePath = (path: string): NormalizedPath => {
  return hidePathParamNames(path)
}

export function hidePathParamNames(path: string): string {
  return path.replace(PATH_PARAMETER_REGEXP, PATH_PARAM_UNIFIED_PLACEHOLDER)
}

const PATH_PARAMETER_REGEXP = /\{.*?\}/g
const PATH_PARAM_UNIFIED_PLACEHOLDER = '*'

export const filesDiff = (files1: { fileId: string }[], files2: { fileId: string }[]): { fileId: string }[] => {
  return files1.filter((f1) => !files2.find((f2) => f1.fileId === f2.fileId))
}

export const setValueByPath = (obj: any, path: JsonPath, value: any, i = 0): void => {
  if (i >= path.length) { return }

  const key = path[i]
  if (typeof obj[key] !== 'object') {
    obj[key] = {}
  }

  if (i === path.length - 1) {
    obj[key] = value
  } else {
    setValueByPath(obj[key], path, value, i + 1)
  }
}

export const getExternalFilePath = (source: string | undefined, path: ObjPath): string => {
  return `${source ? `${source}` : ''}#/${jsonPathToString(path)}`
}

export const jsonPathToString = (path: ObjPath): string => {
  return path
    .map(segment => `${segment}`.replace(/~/g, '~0').replace(/\//g, '~1'))
    .join('/')
}

export const removeObjectDuplicates = (originalArray: any[], by: string | ((item: any) => any)): any[] => {
  const unique = new Map()

  for (const item of originalArray) {
    const value = typeof by === 'function' ? by(item) : item[by]
    if (!value || unique.has(value)) {
      continue
    }

    unique.set(value, item)
  }

  return Array.from(unique.values())
}

export const removeSecurityDuplicates = (originalArray: any[]): any[] => {
  const unique = new Map()
  for (const item of originalArray) {
    const itemKeys = Object.keys(item)

    if (!itemKeys.length || unique.has(itemKeys[0])) {
      continue
    }

    unique.set(itemKeys[0], item)
  }

  return Array.from(unique.values())
}

export const calculateChangeSummary = (changes: Diff[]): ChangeSummary => ({
  [BREAKING_CHANGE_TYPE]: countByType(BREAKING_CHANGE_TYPE, changes),
  [NON_BREAKING_CHANGE_TYPE]: countByType(NON_BREAKING_CHANGE_TYPE, changes),
  [UNCLASSIFIED_CHANGE_TYPE]: countByType(UNCLASSIFIED_CHANGE_TYPE, changes),
  [RISKY_CHANGE_TYPE]: countByType(RISKY_CHANGE_TYPE, changes),
  [DEPRECATED_CHANGE_TYPE]: countByType(DEPRECATED_CHANGE_TYPE, changes),
  [ANNOTATION_CHANGE_TYPE]: countByType(ANNOTATION_CHANGE_TYPE, changes),
})

export const countByType = (changeType: string, changes: Diff[]): number => {
  return changes.filter(({ type }) => type === changeType).length
}

export const calculateImpactedSummary = (changeSummaries: ChangeSummary[]): ImpactedOperationSummary => ({
  [BREAKING_CHANGE_TYPE]: checkIfHaveChanges(BREAKING_CHANGE_TYPE, changeSummaries),
  [NON_BREAKING_CHANGE_TYPE]: checkIfHaveChanges(NON_BREAKING_CHANGE_TYPE, changeSummaries),
  [UNCLASSIFIED_CHANGE_TYPE]: checkIfHaveChanges(UNCLASSIFIED_CHANGE_TYPE, changeSummaries),
  [RISKY_CHANGE_TYPE]: checkIfHaveChanges(RISKY_CHANGE_TYPE, changeSummaries),
  [DEPRECATED_CHANGE_TYPE]: checkIfHaveChanges(DEPRECATED_CHANGE_TYPE, changeSummaries),
  [ANNOTATION_CHANGE_TYPE]: checkIfHaveChanges(ANNOTATION_CHANGE_TYPE, changeSummaries),
})

export const checkIfHaveChanges = (changeType: DiffType, changeSummaries: ChangeSummary[]): boolean => {
  return changeSummaries.some((summary) => summary[changeType] > 0)
}

export const paginateArray = <T>(items: T[], pageNumber: number, pageSize: number): T[] => {
  const startIndex = (pageNumber - 1) * pageSize
  const endIndex = startIndex + pageSize

  return items.slice(startIndex, endIndex)
}

export const getValueByOpenAPIPath = (obj: any, path: string): any => {
  const parts = path.split('.')
  let value: any = obj

  parts.forEach((part) => {
    if (part === '$') {
      return
    } else if (part === '*') {
      const keys = Object.keys(value)
      if (keys.length > 0) {
        value = value[keys[0]]
      } else {
        value = undefined
      }
    } else {
      value = value?.[part]
    }
  })

  return value
}

export const rawToApiKind = <T extends ApihubApiCompatibilityKind | undefined>(apiKindLike: unknown, defaultApiKind: T): ApihubApiCompatibilityKind | T => {
  if (!isString(apiKindLike)) {
    return defaultApiKind
  }
  const candidate = apiKindLike.toLowerCase() as ApihubApiCompatibilityKind
  return [APIHUB_API_COMPATIBILITY_KIND_BWC, APIHUB_API_COMPATIBILITY_KIND_NO_BWC, APIHUB_API_COMPATIBILITY_KIND_EXPERIMENTAL].includes(candidate) ? candidate : defaultApiKind
}

export const calculateApiAudienceTransitions = (
  operationPair: OperationPair,
  apiAudienceTransitions: ApiAudienceTransition[],
): void => {
  const { previous, current } = operationPair
  const previousAudience = previous?.apiAudience
  const currentAudience = current?.apiAudience
  if (!currentAudience || !previousAudience) {
    return
  }
  if (currentAudience === previousAudience) {
    return
  }
  const existingTransition = apiAudienceTransitions.find(
    (transion) => transion.currentAudience === currentAudience && transion.previousAudience === previousAudience,
  )
  if (!existingTransition) {
    apiAudienceTransitions.push(
      {
        previousAudience: previousAudience,
        currentAudience: currentAudience,
        operationsCount: 1,
      },
    )
    return
  }
  existingTransition.operationsCount += 1
}
