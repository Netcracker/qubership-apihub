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
import { Diff, DiffAction } from '@netcracker/qubership-apihub-api-diff'
import type { FC, ReactNode } from 'react'
import { INLINE_CONTENT_DIFF_COLOR_SCHEMAS } from '../../consts/changes'
import { NULLABLE_TYPE_SUFFIX_TEXT, UNKNOWN_TYPE_TEXT } from '../../consts/types'
import { useChangeSeverityFilters } from '../../contexts/ChangeSeverityFiltersContext'
import { useItemChangedFlags } from '../../hooks/changes'
import { NodeTypeData } from '../../types/NodeTypeData'
import { PropsWithoutChangesSummary } from '../../types/PropsWithoutChangesSummary'
import { LayoutSide } from '../../types/internal/LayoutSide'
import { PropsWithChanges } from '../../types/internal/PropsWithChanges'
import {
  diffRemove,
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
    title,
    qualifier,
    combiner,
    // diffs
    layoutMode,
    layoutSide,
    contentChangesColorizing = true,
    showNullable = false,
    $changes,
  } = props

  const filters = useChangeSeverityFilters()

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
  // Rendered as `<type>[(<qualifier>)][<<title>>]`, e.g. `string(date-time)<MyTitle>`:
  // the qualifier (for a JSON type, its `format`) is a parenthesized suffix,
  // title an angle-bracketed suffix after it.
  let actualQualifier: ReactNode | null = hasText(qualifier) ? `(${qualifier})` : null
  let actualTitle: ReactNode | null = hasText(title) ? `<${title}>` : null
  if (!isDocumentLayoutMode) {
    // Node Type
    if (isSideBySideDiffsLayoutMode) {
      let diffStyles: unknown = null
      if (typeRemoved) {
        if (originSide) {
          diffStyles = classes(
            getIf(
              diffTypeForTypeIncluded && contentChangesColorizing,
              INLINE_CONTENT_DIFF_COLOR_SCHEMAS[DiffAction.replace]
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
            INLINE_CONTENT_DIFF_COLOR_SCHEMAS[DiffAction.replace]
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
              diffTypeForTypeIncluded && contentChangesColorizing,
              INLINE_CONTENT_DIFF_COLOR_SCHEMAS[DiffAction.replace]
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
            INLINE_CONTENT_DIFF_COLOR_SCHEMAS[DiffAction.replace]
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
              diffTypeForTypeIncluded && contentChangesColorizing,
              INLINE_CONTENT_DIFF_COLOR_SCHEMAS[DiffAction.replace]
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
            INLINE_CONTENT_DIFF_COLOR_SCHEMAS[DiffAction.replace]
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
            diffTypeForTypeIncluded && contentChangesColorizing,
            INLINE_CONTENT_DIFF_COLOR_SCHEMAS[DiffAction.replace]
          )
        )
        diffStylesAfter = getIf(
          diffTypeForTypeIncluded && contentChangesColorizing,
          INLINE_CONTENT_DIFF_COLOR_SCHEMAS[DiffAction.replace]
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
            diffTypeForTypeIncluded && contentChangesColorizing,
            INLINE_CONTENT_DIFF_COLOR_SCHEMAS[DiffAction.replace]
          )
        )
        diffStylesAfter = getIf(
          diffTypeForTypeIncluded && contentChangesColorizing,
          INLINE_CONTENT_DIFF_COLOR_SCHEMAS[DiffAction.replace]
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
            diffTypeForTypeIncluded && contentChangesColorizing,
            INLINE_CONTENT_DIFF_COLOR_SCHEMAS[DiffAction.replace]
          )
        )
        diffStylesAfter = getIf(
          diffTypeForTypeIncluded && contentChangesColorizing,
          INLINE_CONTENT_DIFF_COLOR_SCHEMAS[DiffAction.replace]
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

    // The qualifier (`(...)`) and title (`<...>`) are independent suffix tokens,
    // each colorized as a whole (including its decoration) by its own change.
    // For a JSON type the qualifier slot is fed from the `format` keyword's change.
    const titleInput: QualifierPartInput = {
      value: title,
      beforeValue: beforeValueOf($titleChange),
      added: titleAdded,
      removed: titleRemoved,
      replaced: titleReplaced,
      included: diffTypeForTitleIncluded,
    }
    const qualifierInput: QualifierPartInput = {
      value: qualifier,
      beforeValue: beforeValueOf($formatChange),
      added: formatAdded,
      removed: formatRemoved,
      replaced: formatReplaced,
      included: diffTypeForFormatIncluded,
    }

    actualTitle = renderScalarDiff({
      input: titleInput,
      decorate: (text) => `<${text}>`,
      isSideBySide: isSideBySideDiffsLayoutMode,
      isInline: isInlineDiffsLayoutMode,
      originSide,
      colorizing: contentChangesColorizing,
    })
    actualQualifier = renderScalarDiff({
      input: qualifierInput,
      decorate: (text) => `(${text})`,
      isSideBySide: isSideBySideDiffsLayoutMode,
      isInline: isInlineDiffsLayoutMode,
      originSide,
      colorizing: contentChangesColorizing,
    })
  }

  return (
    <div className="inline-flex flex-row gap-1 items-center">
      {brokenRef && <WarningIcon />}
      {actualType && <div className="inline">{actualType}{actualQualifier}{actualTitle} {showNullable ? actualNullable : null}</div>}
      {combiner && <div className="inline">({combiner})</div>}
    </div>
  )
}

type QualifierPartInput = {
  value: string | undefined        // after-state value of this part
  beforeValue: string | undefined  // before-state value (for remove/replace)
  added: boolean
  removed: boolean
  replaced: boolean
  included: boolean                // is this part's change included by the active filters
}

// non-null and not blank (treats empty / whitespace-only as absent)
function hasText(value: string | undefined): value is string {
  return !!value && value.trim().length > 0
}

function beforeValueOf(change?: Diff): string | undefined {
  if (diffRemove(change) || diffReplace(change)) {
    return typeof change.beforeValue === 'string' ? change.beforeValue : undefined
  }
  return undefined
}

function partStyles(
  included: boolean,
  colorizing: boolean,
): { removeCls: string; addCls: string; replaceCls: string } {
  const removeCls = getIf(included && colorizing, INLINE_CONTENT_DIFF_COLOR_SCHEMAS[DiffAction.remove]) ?? ''
  const addCls = getIf(included && colorizing, INLINE_CONTENT_DIFF_COLOR_SCHEMAS[DiffAction.add]) ?? ''
  const replaceCls = getIf(included && colorizing, INLINE_CONTENT_DIFF_COLOR_SCHEMAS[DiffAction.replace]) ?? ''
  return { removeCls, addCls, replaceCls }
}

function styledText(text: string, cls: string): ReactNode {
  return <span className={`inline ${cls}`.trimEnd()}>{text}</span>
}

function joinInlineFragments(fragments: ReactNode[]): ReactNode {
  const out: ReactNode[] = []
  fragments.forEach((fragment, index) => {
    if (index > 0) {
      out.push(<span key={`gap-${index}`} className="inline">{' '}</span>)
    }
    out.push(<span key={`frag-${index}`} className="inline">{fragment}</span>)
  })
  return <span className="inline">{out}</span>
}

// Renders a single decorated scalar token (the title `<...>` or the qualifier `(...)`),
// colorizing the whole decorated token by its own change.
function renderScalarDiff(params: {
  input: QualifierPartInput
  decorate: (text: string) => string
  isSideBySide: boolean
  isInline: boolean
  originSide: boolean
  colorizing: boolean
}): ReactNode | null {
  const { input, decorate, isSideBySide, isInline, originSide, colorizing } = params
  const { value, beforeValue, added, removed, replaced, included } = input
  const { removeCls, addCls, replaceCls } = partStyles(included, colorizing)

  // Renders one decorated token, or null when the value is absent / blank.
  const renderToken = (raw: string | undefined, cls: string): ReactNode | null =>
    hasText(raw) ? styledText(decorate(raw), cls) : null

  if (isSideBySide) {
    if (originSide) {
      // origin shows the BEFORE state
      if (added) {
        return null
      }
      if (removed) {
        return renderToken(beforeValue ?? value, removeCls)
      }
      if (replaced) {
        return renderToken(beforeValue, replaceCls)
      }
      return renderToken(value, '')
    }
    // changed side shows the AFTER state
    if (removed) {
      return null
    }
    if (added) {
      return renderToken(value, addCls)
    }
    if (replaced) {
      return renderToken(value, replaceCls)
    }
    return renderToken(value, '')
  }

  if (isInline) {
    const fragments: ReactNode[] = []
    if (added) {
      const after = renderToken(value, addCls)
      if (after) {
        fragments.push(after)
      }
    } else if (removed) {
      const before = renderToken(beforeValue ?? value, removeCls)
      if (before) {
        fragments.push(before)
      }
    } else if (replaced) {
      const before = renderToken(beforeValue, replaceCls)
      const after = renderToken(value, replaceCls)
      if (before) {
        fragments.push(before)
      }
      if (after) {
        fragments.push(after)
      }
    } else {
      const neutral = renderToken(value, '')
      if (neutral) {
        fragments.push(neutral)
      }
    }
    return fragments.length > 0 ? joinInlineFragments(fragments) : null
  }

  return null
}

function getIf<T>(condition: boolean, value: T | undefined): T | null {
  return condition ? value ?? null : null
}

function classes(...classes: (string | null)[]): string {
  return classes.filter(clazz => !!clazz).join(SEPARATOR)
}
