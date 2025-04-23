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

import { DiffNodeMeta, DiffRecord, isDiff, isDiffMetaRecord, isObject, NodeChange, NodeChangesSummary } from '@netcracker/qubership-apihub-api-data-model'
import { startFromOpenApiComponents } from '@netcracker/qubership-apihub-api-unifier'
import {
  Diff,
  DiffAdd,
  DiffRemove,
  DiffRename,
  DiffReplace,
  DiffType,
  isDiffAdd,
  isDiffRemove,
  isDiffRename,
  isDiffReplace
} from '@netcracker/qubership-apihub-api-diff'
import { IModelStateNode } from '../../api-model-state'
import { CHANGE_SEVERITIES } from '../../consts/changes'
import {
  DOCUMENT_LAYOUT_MODE,
  INLINE_DIFFS_LAYOUT_MODE,
  LayoutMode,
  SIDE_BY_SIDE_DIFFS_LAYOUT_MODE
} from '../../types/LayoutMode'
import { CHANGED_LAYOUT_SIDE, LayoutSide, ORIGIN_LAYOUT_SIDE } from '../../types/internal/LayoutSide'
import { ArrayUtils } from './arrays'
import { isDefined } from './checkers'

export function diffAdd(diff?: Diff): diff is DiffAdd {
  return !!diff && isDiffAdd(diff)
}

export function diffRemove(diff?: Diff): diff is DiffRemove {
  return !!diff && isDiffRemove(diff)
}

export function diffReplace(diff?: Diff): diff is DiffReplace {
  return !!diff && isDiffReplace(diff)
}

export function diffRename(diff?: Diff): diff is DiffRename {
  return !!diff && isDiffRename(diff)
}

export function buildOpenApiDiffCause(diff: Diff | undefined): string | undefined {
  if (!diff) {
    return undefined
  }
  const paths = []
  if (hasAfterDeclarationPaths(diff)) {
    let path = diff.afterDeclarationPaths?.[0]
    path = path && startFromOpenApiComponents(path) ? path : []
    paths.push(...path)
  } else if (hasBeforeDeclarationPaths(diff)) {
    let path = diff.beforeDeclarationPaths?.[0]
    path = path && startFromOpenApiComponents(path) ? path : []
    paths.push(...path)
  }
  return paths.length ? `caused by ${paths.join('.')} change` : ''
}

export function maxDiffType(...changes: Array<Diff | undefined>): [DiffType | undefined, string | undefined] {
  let diff: Diff | undefined
  for (const change of changes) {
    if (change && compareDiffTypes(change.type, diff?.type) > 0) {
      diff = change
    }
  }
  return [diff?.type, buildOpenApiDiffCause(diff)]
}

export function maxDiffTypeFromNodeSummary(summary?: NodeChangesSummary): DiffType | undefined {
  let diffType: DiffType | undefined
  const diffTypes = summary ? Array.from(summary).map(key => key as DiffType) : []
  if (ArrayUtils.isEmpty(diffTypes)) {
    return undefined
  }
  for (const currentDiffType of diffTypes) {
    if (compareDiffTypes(currentDiffType, diffType) > 0) {
      diffType = currentDiffType
    }
  }
  return diffType
}

export function maxDiffTypeFromNestedNodesSummary(summaries?: Record<string, NodeChangesSummary>): DiffType | undefined {
  let diffType: DiffType | undefined
  if (!summaries) {
    return undefined
  }
  const diffTypes: Set<DiffType> = new Set<DiffType>()
  Object.entries(summaries).forEach(([, data]) => {
    const nestedNodeDiffType = maxDiffTypeFromNodeSummary(data)
    nestedNodeDiffType && diffTypes.add(nestedNodeDiffType)
  })
  if (diffTypes.size === 0) {
    return undefined
  }
  for (const currentDiffType of diffTypes) {
    if (compareDiffTypes(currentDiffType, diffType) > 0) {
      diffType = currentDiffType
    }
  }
  return diffType
}

export function compareDiffTypes(a: DiffType | undefined, b: DiffType | undefined): number {
  if (!a && !b) {
    return 0
  }
  if (!a && b) {
    return CHANGE_SEVERITIES[b]
  }
  if (a && !b) {
    return CHANGE_SEVERITIES[a]
  }
  return CHANGE_SEVERITIES[a!] - CHANGE_SEVERITIES[b!]
}

export const DEFAULT_DIFF_TYPE_AND_CAUSE_PAIR: [DiffType | undefined, string | undefined] = [undefined, undefined]

export function getLayoutModeFlags(mode?: LayoutMode) {
  return {
    isDocumentLayoutMode: mode === DOCUMENT_LAYOUT_MODE,
    isInlineDiffsLayoutMode: mode === INLINE_DIFFS_LAYOUT_MODE,
    isSideBySideDiffsLayoutMode: mode === SIDE_BY_SIDE_DIFFS_LAYOUT_MODE
  }
}

export function getLayoutSideFlags(side?: LayoutSide) {
  return {
    originSide: side === ORIGIN_LAYOUT_SIDE,
    changedSide: side === CHANGED_LAYOUT_SIDE,
  }
}

const jsonSchemaAllowedMetaProps: string[] = [
  'deprecated', 'readOnly', 'writeOnly', 'required'
]
const jsonSchemaAllowedValueProps: string[] = [
  'type', 'title', 'format', 'nullable'
]

const graphApiAllowedMetaProps: string[] = [
  'deprecated', 'directives', 'args', 'required'
]
const graphApiAllowedValueProps: string[] = [
  ...jsonSchemaAllowedValueProps
]

export const API_TYPE_REST = 'rest'
export const API_TYPE_GRAPHQL = 'graphql'
export type ApiType =
  | typeof API_TYPE_REST
  | typeof API_TYPE_GRAPHQL

export function toChangesList(
  $changes: DiffRecord | undefined,
  $metaChanges: DiffRecord | undefined,
  apiType: ApiType
): Diff[] {
  let allowedMetaProps: string[]
  let allowedValueProps: string[]

  switch (apiType) {
    case API_TYPE_REST:
      allowedMetaProps = jsonSchemaAllowedMetaProps
      allowedValueProps = jsonSchemaAllowedValueProps
      break
    case API_TYPE_GRAPHQL:
      allowedMetaProps = graphApiAllowedMetaProps
      allowedValueProps = graphApiAllowedValueProps
      break
    default:
      return []
  }

  const list: Diff[] = []
  if ($changes) {
    Object.entries($changes)
      .filter(([, change]) => isDiff(change))
      .filter(([property]) => allowedValueProps.includes(property))
      .forEach(([, change]) => {
        list.push(change as Diff)
      })
  }
  if ($metaChanges) {
    Object.entries($metaChanges)
      .filter(([property]) => allowedMetaProps.includes(property))
      .forEach(([, change]) => {
        if (isDiff(change)) {
          list.push(change)
        }
        if (isDiffMetaRecord(change)) {
          Object.values(change ?? {})
            .forEach(recordItemChange => {
              if (isDiff(recordItemChange)) {
                list.push(recordItemChange)
              }
            })
        }
      })
  }
  return list
}

export function takeNodeChangeIfAllChildrenChanged(
  children: IModelStateNode<any>[]
): NodeChange | undefined {
  const firstChild = children[0]

  let nodeChange: NodeChange | undefined =
    firstChild
      ? (firstChild.node.meta as DiffNodeMeta)?.$nodeChange
      : undefined

  if (!nodeChange) {
    return undefined
  }

  for (const child of children) {
    if (child.type === 'combinary') {
      continue
    }
    const currentNodeChange = (child.node.meta as DiffNodeMeta)?.$nodeChange
    if (
      !currentNodeChange ||
      currentNodeChange.action !== nodeChange.action
    ) {
      return undefined
    }
    nodeChange = currentNodeChange
  }

  return nodeChange
}

export function takeNodeChangeIfWholeNodeChanged(
  nodeChange: NodeChange | undefined
): NodeChange | undefined {
  // For OAS path parameters we consider changing original property "name"
  // as a whole node change with type = annotation, action = rename.
  // In one hand this is really whole node change,
  // but in another hand this doesn't affect node annotations and validation.
  // So, in such case we don't need to show this change in UI for them.
  return diffRename(nodeChange) ? undefined : nodeChange
}

export function inferRowChange(
  itemsCount: number,
  $rowChanges: Diff | DiffRecord | undefined
): Diff | undefined {
  if (!isDiffMetaRecord($rowChanges)) {
    return undefined
  }

  const arrayMeta = $rowChanges
  const arrayKeys: number[] = Object.keys(arrayMeta).map(Number)

  if (!isObject(arrayMeta) || arrayKeys.length === 0 || arrayKeys.length !== itemsCount) {
    return undefined
  }

  const firstItemChange = arrayMeta[arrayKeys[0]]

  if (!isDiff(firstItemChange)) {
    return undefined
  }

  for (let i = 1; i < arrayKeys.length; i++) {
    const itemChange = arrayMeta[arrayKeys[i]]
    if (
      !itemChange ||
      isDiffMetaRecord(itemChange) ||
      isDiff(itemChange) &&
      (
        itemChange.type !== firstItemChange.type ||
        itemChange.action !== firstItemChange.action
      )
    ) {
      return undefined
    }
  }

  return firstItemChange
}

export function isDiffTypeIncluded(
  diffType: DiffType | undefined,
  filters: readonly DiffType[]
): boolean {
  if (filters.length === 0) {
    return true
  }

  return filters.some(filter => filter === diffType)
}

export function filterChangesList(changesList: Diff[], filters: readonly DiffType[]): Diff[] {
  return filters.length === 0
    ? changesList
    : changesList.filter(change => isDiffTypeIncluded(change.type, filters))
}

export function getDiffTypesFromSummary(summary: NodeChangesSummary | undefined): DiffType[] | undefined {
  if (!summary) {
    return undefined
  }
  return Array.from(summary).map(key => key as DiffType)
}

export function hasBeforeDeclarationPaths(diff: Diff | undefined): diff is DiffRemove | DiffReplace | DiffRename {
  return diffReplace(diff) || diffRename(diff) || diffRemove(diff)
}

export function hasAfterDeclarationPaths(diff: Diff | undefined): diff is DiffAdd | DiffReplace | DiffRename {
  return diffReplace(diff) || diffRename(diff) || diffAdd(diff)
}

export function filterChangeKeys(data: Record<PropertyKey, unknown> | undefined, originalChangeKeys: string[]): string[] {
  return Object.entries(data ?? {})
    .reduce((result, [key, value]) => {
      isDefined(value) && originalChangeKeys.includes(key) && result.push(key)
      return result
    }, Array<string>(0))
}

// Deprecation Changes Resolver
// FIXME 04.07.24 // IT IS NOT COMPLETED YET!

// type DeprecationChangesResolverOptions = {
//   deprecationValue?: boolean | { reason?: string }
//   deprecationChange?: Diff | undefined
//   deprecationReasonChange?: Diff | undefined
//   layoutMode: LayoutMode
// }
//
// export type DeprecationChangesResolverResult = {
//   hasDeprecationChanges: boolean
//   onlyDeprecationChanged: boolean
//   onlyDeprecationReasonChanged: boolean
//   everythingChanged: boolean
// }

// export function resolveDeprecationChanges(
//   options: DeprecationChangesResolverOptions
// ): DeprecationChangesResolverResult | null {
//   const {
//     deprecationValue,
//     deprecationChange,
//     deprecationReasonChange,
//     layoutMode
//   } = options
//
//   if (!deprecationChange && !deprecationReasonChange) {
//     return null
//   }
//
//   const {
//     isDocumentLayoutMode: documentView,
//     // eslint-disable-next-line
//     isInlineDiffsLayoutMode: inlineDiffsView,
//     // eslint-disable-next-line
//     isSideBySideDiffsLayoutMode: sideBySideView
//   } = getLayoutModeFlags(layoutMode)
//
//   if (documentView) {
//     return null
//   }
//
//   const { deprecationAdded, deprecationRemoved, deprecationReplaced } = {
//     deprecationAdded: !!deprecationChange && (
//       deprecationChange.action === DiffAction.add ||
//       deprecationChange.action === DiffAction.replace && deprecationValue !== false
//     ),
//     deprecationRemoved: !!deprecationChange && (
//       deprecationChange.action === DiffAction.remove ||
//       deprecationChange.action === DiffAction.replace && deprecationValue === false
//     ),
//     deprecationReplaced: !!deprecationChange && (
//       deprecationChange.action === DiffAction.replace &&
//       isObject(deprecationValue) &&
//       isObject(deprecationChange.beforeValue)
//     )
//   }
//
//   const {
//     deprecationReasonAdded,
//     deprecationReasonRemoved,
//     deprecationReasonReplaced,
//   } = {
//     deprecationReasonAdded: (
//       !!deprecationReasonChange && deprecationReasonChange.action === DiffAction.add ||
//       !!deprecationChange && isObject(deprecationValue) && !!deprecationValue.reason && typeof deprecationChange.beforeValue === 'boolean'
//     ),
//     deprecationReasonRemoved: (
//       !!deprecationReasonChange && deprecationReasonChange.action === DiffAction.remove ||
//       !!deprecationChange && typeof deprecationValue === 'boolean' && isObject(deprecationChange.beforeValue)
//     ),
//     deprecationReasonReplaced: (
//       deprecationReplaced && isObject(deprecationValue) && !!deprecationValue.reason ||
//       !deprecationAdded &&
//       !deprecationRemoved &&
//       !!deprecationReasonChange &&
//       deprecationReasonChange.action === DiffAction.replace &&
//       typeof deprecationReasonChange.beforeValue === 'string'
//     )
//   }
//
//   const onlyDeprecationChanged =
//     (deprecationAdded || deprecationRemoved) &&
//     !deprecationReasonAdded &&
//     !deprecationReasonRemoved &&
//     !deprecationReasonReplaced
//
//   const onlyDeprecationReasonChanged =
//     (deprecationReasonAdded || deprecationReasonRemoved || deprecationReasonReplaced) &&
//     !deprecationAdded &&
//     !deprecationRemoved
//
//   const everythingChanged =
//     (deprecationAdded || deprecationRemoved) &&
//     (deprecationReasonAdded || deprecationReasonRemoved || deprecationReasonReplaced)
//
//   const hasDeprecationChanges =
//     onlyDeprecationChanged ||
//     onlyDeprecationReasonChanged ||
//     everythingChanged
//
//   return {
//     hasDeprecationChanges: hasDeprecationChanges,
//     onlyDeprecationChanged: onlyDeprecationChanged,
//     onlyDeprecationReasonChanged: onlyDeprecationReasonChanged,
//     everythingChanged: everythingChanged
//   }
// }