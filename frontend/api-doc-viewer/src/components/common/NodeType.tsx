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

import { isDiff } from '@netcracker/qubership-apihub-api-data-model'
import { DiffAction } from '@netcracker/qubership-apihub-api-diff'
import type { FC, ReactNode } from 'react'
import { DEFAULT_STRIKETHROUGH_VALUE_CLASS, INLINE_CONTENT_DIFF_COLOR_SCHEMAS } from '../../consts/changes'
import { NULLABLE_TYPE_SUFFIX_TEXT, UNKNOWN_TYPE_TEXT } from '../../consts/types'
import { useChangeSeverityFilters } from '../../contexts/ChangeSeverityFiltersContext'
import { useItemChangedFlags } from '../../hooks/changes'
import { NodeTypeData } from '../../types/NodeTypeData'
import { PropsWithoutChangesSummary } from '../../types/PropsWithoutChangesSummary'
import { LayoutSide } from '../../types/internal/LayoutSide'
import { PropsWithChanges } from '../../types/internal/PropsWithChanges'
import {
  diffReplace,
  getLayoutModeFlags,
  getLayoutSideFlags,
  isDiffTypeIncluded
} from '../../utils/common/changes'
import { WarningIcon } from '../kit/icons/WarningIcon'

export type NodeTypeProps = PropsWithoutChangesSummary<
  NodeTypeData &
  Partial<{
    layoutSide: LayoutSide
    contentChangesColorizing: boolean
    contentChangesStrikethrough: boolean
    showNullable: boolean
  }> &
  PropsWithChanges
>

const SEPARATOR = ' '

/* FIXME 30.08.24 //
    There are a lot of places in NodeType when we use hardcoded action, not calculated from real data.
    So it may sweep a bug under the rug.
    But it's not so simple as seems to use real data because of remapping.
    Possibly, it must be fixed in refactoring AMT.
 */

export const NodeType: FC<NodeTypeProps> = (props) => {
  const {
    brokenRef,
    type,
    nullable,
    entity,
    combiner,
    // diffs
    layoutMode,
    layoutSide,
    contentChangesColorizing = true,
    contentChangesStrikethrough = true,
    showNullable = false,
    $changes,
  } = props

  const filters = useChangeSeverityFilters()

  const wrappedEntity = entity ? wrapAsEntity(entity) : null
  const resolvedNullableText = nullable ? NULLABLE_TYPE_SUFFIX_TEXT : null

  const $typeChange = isDiff($changes?.type) ? $changes?.type : undefined
  const $nullableChange = isDiff($changes?.nullable) ? $changes?.nullable : undefined
  const $formatChange = isDiff($changes?.format) ? $changes?.format : undefined
  const $titleChange = isDiff($changes?.title) ? $changes?.title : undefined

  const diffTypeForType = $typeChange?.type
  const diffTypeForNullable = $nullableChange?.type
  const diffTypeForFormat = $formatChange?.type
  const diffTypeForTitle = $titleChange?.type

  const diffTypeForTypeIncluded = isDiffTypeIncluded(diffTypeForType, filters)
  const diffTypeForNullableIncluded = isDiffTypeIncluded(diffTypeForNullable, filters)
  const diffTypeForFormatIncluded = isDiffTypeIncluded(diffTypeForFormat, filters)
  const diffTypeForTitleIncluded = isDiffTypeIncluded(diffTypeForTitle, filters)

  const {
    isDocumentLayoutMode,
    isInlineDiffsLayoutMode,
    isSideBySideDiffsLayoutMode,
  } = getLayoutModeFlags(layoutMode)

  const {
    itemAdded: typeAdded,
    itemRemoved: typeRemoved,
    itemReplaced: typeReplaced,
  } = useItemChangedFlags($typeChange?.action)
  const {
    itemAdded: nullableAdded,
    itemRemoved: nullableRemoved,
  } = useItemChangedFlags($nullableChange?.action, {
    [DiffAction.add]: {
      actualReplacedValue: diffReplace($nullableChange) ? $nullableChange.beforeValue : undefined,
      expectedReplacedValue: false
    },
    [DiffAction.remove]: {
      actualReplacedValue: diffReplace($nullableChange) ? $nullableChange.beforeValue : undefined,
      expectedReplacedValue: true
    },
  })
  const {
    itemAdded: formatAdded,
    itemRemoved: formatRemoved,
    itemReplaced: formatReplaced,
  } = useItemChangedFlags($formatChange?.action)
  const {
    itemAdded: titleAdded,
    itemRemoved: titleRemoved,
    itemReplaced: titleReplaced,
  } = useItemChangedFlags($titleChange?.action)

  const { originSide, changedSide } = getLayoutSideFlags(layoutSide)

  // Calculate rendering for diffs

  let actualType: string | ReactNode = type
  let actualNullable: string | ReactNode = resolvedNullableText
  let actualEntity: ReactNode | null = wrappedEntity
  if (!isDocumentLayoutMode) {
    // Node Type
    if (isSideBySideDiffsLayoutMode) {
      let diffStyles: unknown = null
      if (typeRemoved) {
        if (originSide) {
          diffStyles = classes(
            getIf(
              diffTypeForTypeIncluded && contentChangesStrikethrough,
              DEFAULT_STRIKETHROUGH_VALUE_CLASS
            ),
            getIf(
              diffTypeForTypeIncluded && contentChangesColorizing,
              $typeChange?.action ? INLINE_CONTENT_DIFF_COLOR_SCHEMAS[$typeChange.action] : ''
            )
          )
          actualType =
            <div className={`inline ${diffStyles}`}>
              {type}
            </div>
        }
        if (changedSide) {
          diffStyles = getIf(
            diffTypeForTypeIncluded && contentChangesColorizing,
            INLINE_CONTENT_DIFF_COLOR_SCHEMAS[DiffAction.add]
          )
          actualType =
            <div className={`inline ${diffStyles}`}>
              {UNKNOWN_TYPE_TEXT}
            </div>
        }
      }
      if (typeAdded) {
        if (originSide) {
          diffStyles = classes(
            getIf(
              diffTypeForTypeIncluded && contentChangesStrikethrough,
              DEFAULT_STRIKETHROUGH_VALUE_CLASS
            ),
            getIf(
              diffTypeForTypeIncluded && contentChangesColorizing,
              INLINE_CONTENT_DIFF_COLOR_SCHEMAS[DiffAction.remove]
            )
          )
          actualType =
            <div className={`inline ${diffStyles}`}>
              {UNKNOWN_TYPE_TEXT}
            </div>
        }
        if (changedSide) {
          diffStyles = getIf(
            diffTypeForTypeIncluded && contentChangesColorizing,
            $typeChange?.action ? INLINE_CONTENT_DIFF_COLOR_SCHEMAS[$typeChange.action] : ''
          )
          actualType =
            <div className={`inline ${diffStyles}`}>
              {type}
            </div>
        }
      }
      if (typeReplaced) {
        if (originSide) {
          diffStyles = classes(
            getIf(
              diffTypeForTypeIncluded && contentChangesStrikethrough,
              DEFAULT_STRIKETHROUGH_VALUE_CLASS
            ),
            getIf(
              diffTypeForTypeIncluded && contentChangesColorizing,
              INLINE_CONTENT_DIFF_COLOR_SCHEMAS[DiffAction.remove]
            )
          )
          actualType =
            <div className={`inline ${diffStyles}`}>
              {diffReplace($typeChange) ? `${$typeChange.beforeValue}` : null}
            </div>
        }
        if (changedSide) {
          diffStyles = getIf(
            diffTypeForTypeIncluded && contentChangesColorizing,
            INLINE_CONTENT_DIFF_COLOR_SCHEMAS[DiffAction.add]
          )
          actualType =
            <div className={`inline ${diffStyles}`}>
              {type}
            </div>
        }
      }
    }

    if (isInlineDiffsLayoutMode) {
      let diffStylesBefore: unknown = null
      let diffStylesAfter: unknown = null
      if (typeRemoved) {
        diffStylesBefore = classes(
          getIf(
            diffTypeForTypeIncluded && contentChangesStrikethrough,
            DEFAULT_STRIKETHROUGH_VALUE_CLASS
          ),
          getIf(
            diffTypeForTypeIncluded && contentChangesColorizing,
            INLINE_CONTENT_DIFF_COLOR_SCHEMAS[DiffAction.remove]
          )
        )
        diffStylesAfter = getIf(
          diffTypeForTypeIncluded && contentChangesColorizing,
          INLINE_CONTENT_DIFF_COLOR_SCHEMAS[DiffAction.add]
        )
        actualType = <>
          <div className={`inline ${diffStylesBefore}`}>
            {type}
          </div>
          <div className={`inline ${diffStylesAfter}`}>
            {UNKNOWN_TYPE_TEXT}
          </div>
        </>
      }
      if (typeAdded) {
        diffStylesBefore = classes(
          getIf(
            diffTypeForTypeIncluded && contentChangesStrikethrough,
            DEFAULT_STRIKETHROUGH_VALUE_CLASS
          ),
          getIf(
            diffTypeForTypeIncluded && contentChangesColorizing,
            INLINE_CONTENT_DIFF_COLOR_SCHEMAS[DiffAction.remove]
          )
        )
        diffStylesAfter = getIf(
          diffTypeForTypeIncluded && contentChangesColorizing,
          $typeChange?.action ? INLINE_CONTENT_DIFF_COLOR_SCHEMAS[$typeChange.action] : ''
        )
        actualType = <>
          <div className={`inline ${diffStylesBefore}`}>
            {UNKNOWN_TYPE_TEXT}
          </div>
          <div className={`inline ${diffStylesAfter}`}>
            {type}
          </div>
        </>
      }
      if (typeReplaced) {
        diffStylesBefore = classes(
          getIf(
            diffTypeForTypeIncluded && contentChangesStrikethrough,
            DEFAULT_STRIKETHROUGH_VALUE_CLASS
          ),
          getIf(
            diffTypeForTypeIncluded && contentChangesColorizing,
            INLINE_CONTENT_DIFF_COLOR_SCHEMAS[DiffAction.remove]
          )
        )
        diffStylesAfter = getIf(
          diffTypeForTypeIncluded && contentChangesColorizing,
          INLINE_CONTENT_DIFF_COLOR_SCHEMAS[DiffAction.add]
        )
        actualType = <>
          <div className={`inline ${diffStylesBefore}`}>
            {diffReplace($typeChange) ? `${$typeChange.beforeValue}` : null}
          </div>
          <div className={`inline ${diffStylesAfter}`}>
            {type}
          </div>
        </>
      }
    }

    // Nullable
    if (showNullable) {
      if (isSideBySideDiffsLayoutMode) {
        if (nullableRemoved) {
          if (originSide) {
            const diffStyles = classes(
              getIf(
                diffTypeForNullableIncluded && contentChangesStrikethrough,
                DEFAULT_STRIKETHROUGH_VALUE_CLASS
              ),
              getIf(
                diffTypeForNullableIncluded && contentChangesColorizing,
                INLINE_CONTENT_DIFF_COLOR_SCHEMAS[DiffAction.remove]
              )
            )
            actualNullable =
              <div className={`inline ${diffStyles}`}>
                {NULLABLE_TYPE_SUFFIX_TEXT}
              </div>
          }
          if (changedSide) {
            actualNullable = null
          }
        }
        if (nullableAdded) {
          if (originSide) {
            actualNullable = null
          }
          if (changedSide) {
            const diffStyles = getIf(
              diffTypeForNullableIncluded && contentChangesColorizing,
              INLINE_CONTENT_DIFF_COLOR_SCHEMAS[DiffAction.add]
            )
            actualNullable =
              <div className={`inline ${diffStyles}`}>
                {NULLABLE_TYPE_SUFFIX_TEXT}
              </div>
          }
        }
      }

      if (isInlineDiffsLayoutMode) {
        if (nullableRemoved) {
          const diffStylesBefore = classes(
            getIf(
              diffTypeForNullableIncluded && contentChangesStrikethrough,
              DEFAULT_STRIKETHROUGH_VALUE_CLASS
            ),
            getIf(
              diffTypeForNullableIncluded && contentChangesColorizing,
              INLINE_CONTENT_DIFF_COLOR_SCHEMAS[DiffAction.remove]
            )
          )
          actualNullable =
            <div className={`inline ${diffStylesBefore}`}>
              {NULLABLE_TYPE_SUFFIX_TEXT}
            </div>
        }
        if (nullableAdded) {
          const diffStylesAfter = getIf(
            diffTypeForNullableIncluded && contentChangesColorizing,
            INLINE_CONTENT_DIFF_COLOR_SCHEMAS[DiffAction.add]
          )
          actualNullable =
            <div className={`inline ${diffStylesAfter}`}>
              {NULLABLE_TYPE_SUFFIX_TEXT}
            </div>
        }
      }
    }

    // Entity
    const entityRemoved = formatRemoved || titleRemoved
    const entityAdded = formatAdded || titleAdded
    const entityReplaced = formatReplaced || titleReplaced

    const diffTypeForEntityIncluded = diffTypeForFormatIncluded || diffTypeForTitleIncluded

    if (isSideBySideDiffsLayoutMode) {
      let diffStyles: unknown = null
      if (entityRemoved) {
        if (originSide) {
          diffStyles = classes(
            getIf(
              diffTypeForEntityIncluded && contentChangesStrikethrough,
              DEFAULT_STRIKETHROUGH_VALUE_CLASS
            ),
            getIf(
              diffTypeForEntityIncluded && contentChangesColorizing,
              INLINE_CONTENT_DIFF_COLOR_SCHEMAS[DiffAction.remove]
            )
          )
          actualEntity =
            <div className={`inline ${diffStyles}`}>
              {wrappedEntity}
            </div>
        }
        if (changedSide) {
          actualEntity = null
        }
      }
      if (entityAdded) {
        if (originSide) {
          actualEntity = null
        }
        if (changedSide) {
          diffStyles = getIf(
            diffTypeForEntityIncluded && contentChangesColorizing,
            INLINE_CONTENT_DIFF_COLOR_SCHEMAS[DiffAction.add]
          )
          actualEntity =
            <div className={`inline ${diffStyles}`}>
              {wrappedEntity}
            </div>
        }
      }
      if (entityReplaced) {
        if (originSide) {
          diffStyles = classes(
            getIf(
              diffTypeForEntityIncluded && contentChangesStrikethrough,
              DEFAULT_STRIKETHROUGH_VALUE_CLASS
            ),
            getIf(
              diffTypeForEntityIncluded && contentChangesColorizing,
              INLINE_CONTENT_DIFF_COLOR_SCHEMAS[DiffAction.remove]
            )
          )
          const replacedFormatValue =
            diffReplace($formatChange)
              ? $formatChange.beforeValue
              : undefined
          const replacedTitleValue =
            diffReplace($titleChange)
              ? $titleChange.beforeValue
              : undefined
          actualEntity =
            <div className={`inline ${diffStyles}`}>
              {wrapAsEntity(replacedFormatValue ?? replacedTitleValue)}
            </div>
        }
        if (changedSide) {
          diffStyles = getIf(
            diffTypeForEntityIncluded && contentChangesColorizing,
            INLINE_CONTENT_DIFF_COLOR_SCHEMAS[DiffAction.add]
          )
          actualEntity =
            <div className={`inline ${diffStyles}`}>
              {wrappedEntity}
            </div>
        }
      }
    }

    if (isInlineDiffsLayoutMode) {
      if (entityRemoved) {
        const diffStylesBefore = classes(
          getIf(
            diffTypeForEntityIncluded && contentChangesStrikethrough,
            DEFAULT_STRIKETHROUGH_VALUE_CLASS
          ),
          getIf(
            diffTypeForEntityIncluded && contentChangesColorizing,
            INLINE_CONTENT_DIFF_COLOR_SCHEMAS[DiffAction.remove]
          )
        )
        actualEntity =
          <div className={`inline ${diffStylesBefore}`}>
            {wrappedEntity}
          </div>
      }
      if (entityAdded) {
        const diffStylesAfter = getIf(
          diffTypeForEntityIncluded && contentChangesColorizing,
          INLINE_CONTENT_DIFF_COLOR_SCHEMAS[DiffAction.add]
        )
        actualEntity =
          <div className={`inline ${diffStylesAfter}`}>
            {wrappedEntity}
          </div>
      }
      if (entityReplaced) {
        const diffStylesBefore = classes(
          getIf(
            diffTypeForEntityIncluded && contentChangesStrikethrough,
            DEFAULT_STRIKETHROUGH_VALUE_CLASS
          ),
          getIf(
            diffTypeForEntityIncluded && contentChangesColorizing,
            INLINE_CONTENT_DIFF_COLOR_SCHEMAS[DiffAction.remove]
          )
        )
        const diffStylesAfter = getIf(
          diffTypeForEntityIncluded && contentChangesColorizing,
          INLINE_CONTENT_DIFF_COLOR_SCHEMAS[DiffAction.add]
        )
        const replacedFormatValue =
          diffReplace($formatChange)
            ? $formatChange.beforeValue
            : undefined
        const replacedTitleValue =
          diffReplace($titleChange)
            ? $titleChange.beforeValue
            : undefined
        actualEntity = <>
          <div className={`inline ${diffStylesBefore}`}>
            {wrapAsEntity(replacedFormatValue ?? replacedTitleValue)}
          </div>
          <div className={`inline ${diffStylesAfter}`}>
            {wrappedEntity}
          </div>
        </>
      }
    }
  }

  return (
    <div className="inline-flex flex-row gap-1 items-center">
      {brokenRef && <WarningIcon/>}
      {actualType && <div className="inline">{actualType}{actualEntity} {showNullable ? actualNullable : null}</div>}
      {combiner && <div className="inline">({combiner})</div>}
    </div>
  )
}

function wrapAsEntity(entity: unknown): ReactNode {
  return <>{'<'}{entity}{'>'}</>
}

function getIf<T>(condition: boolean, value: T | undefined): T | null {
  return condition ? value ?? null : null
}

function classes(...classes: (string | null)[]): string {
  return classes.filter(clazz => !!clazz).join(SEPARATOR)
}
