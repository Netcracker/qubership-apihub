import { applyDiffReplaceAlias, applyDiffReplaceAliasBooleanProperty, DiffNodeMeta, DiffNodeValue, inverDiffAction, isDiff, NodeChange } from '@netcracker/qubership-apihub-api-data-model'
import { Diff } from "@netcracker/qubership-apihub-api-diff"
import type { FC } from 'react'
import {
  AMBER_TAG_COLOR_SCHEMA,
  BLUE_TAG_COLOR_SCHEMA,
  DEPRECATED_TAG,
  READ_ONLY_TAG,
  REQUIRED_TAG,
  WRITE_ONLY_TAG
} from '../../../consts/tags'
import { useLayoutMode } from '../../../contexts/LayoutModeContext'
import { LayoutSide } from '../../../types/internal/LayoutSide'
import { diffReplace } from "../../../utils/common/changes"
import { isDefined } from '../../../utils/common/checkers'
import { DiffBadge } from './DiffBadge'

export type DiffTagsProps = {
  requiredChanged?: boolean // only for OpenAPI
  nullableChanged?: boolean // only for GraphQL
  readOnly: boolean | undefined
  writeOnly: boolean | undefined
  deprecated?: boolean // only for OpenAPI
  deprecationReason?: string // only for GraphQL
  // changes
  layoutSide: LayoutSide
  isNodeChanged: boolean
  isContentChanged: boolean
  // GraphQL/legacy-only component (see shared-components/diffs/TagsWithDiffs.tsx for the
  // next-data-model-typed equivalent used by JSON Schema and DDL).
  $nodeChange?: NodeChange
  $metaChanges?: DiffNodeMeta['$metaChanges']
  $valueChanges?: DiffNodeValue['$changes']
}

export const DiffTags: FC<DiffTagsProps> = (props) => {
  const {
    requiredChanged,
    nullableChanged,
    readOnly,
    writeOnly,
    deprecated, // OpenAPI
    deprecationReason, // GraphAPI
    // changes
    layoutSide,
    isNodeChanged,
    isContentChanged,
    $nodeChange,
    $metaChanges,
    $valueChanges
  } = props

  const layoutMode = useLayoutMode()

  const $readOnly = applyDiffReplaceAliasBooleanProperty($nodeChange as Diff ?? $metaChanges?.readOnly)
  const $writeOnly = applyDiffReplaceAliasBooleanProperty($nodeChange as Diff ?? $metaChanges?.writeOnly)
  const $deprecated = $nodeChange ?? $metaChanges?.deprecated
  const $deprecationReason = $nodeChange ?? $metaChanges?.deprecationReason

  const { showReadOnly, showWriteOnly, showDeprecated, showDeprecationReason } = {
    showReadOnly: isDefined(readOnly) && !!$readOnly || !!readOnly,
    showWriteOnly: isDefined(writeOnly) && !!$writeOnly || !!writeOnly,
    showDeprecated: deprecated || isDiff($deprecated) && diffReplace($deprecated) && !!$deprecated.beforeValue,
    showDeprecationReason: isDefined(deprecationReason),
  }

  return <>
    {(requiredChanged || nullableChanged || showReadOnly || showWriteOnly || showDeprecated || showDeprecationReason) && (
      <div className="flex flex-row gap-2 justify-between">
        {(requiredChanged || nullableChanged) && (
          <DiffBadge
            label={REQUIRED_TAG}
            layoutMode={layoutMode}
            layoutSide={layoutSide}
            isNodeChanged={isNodeChanged}
            isContentChanged={isContentChanged}
            $changes={
              applyDiffReplaceAliasBooleanProperty(
                $metaChanges?.required as Diff
              )
              ??
              inverDiffAction(
                applyDiffReplaceAliasBooleanProperty(
                  $valueChanges?.nullable as Diff
                )
              )
            }
          />
        )}
        {showReadOnly && (
          <DiffBadge
            label={READ_ONLY_TAG}
            colorSchema={BLUE_TAG_COLOR_SCHEMA}
            layoutMode={layoutMode}
            layoutSide={layoutSide}
            isNodeChanged={isNodeChanged}
            isContentChanged={isContentChanged}
            $changes={$readOnly}
          />
        )}
        {showWriteOnly && (
          <DiffBadge
            label={WRITE_ONLY_TAG}
            colorSchema={BLUE_TAG_COLOR_SCHEMA}
            layoutMode={layoutMode}
            layoutSide={layoutSide}
            isNodeChanged={isNodeChanged}
            isContentChanged={isContentChanged}
            $changes={$writeOnly}
          />
        )}
        {(showDeprecated || showDeprecationReason) && (
          <DiffBadge
            label={DEPRECATED_TAG}
            colorSchema={AMBER_TAG_COLOR_SCHEMA}
            layoutMode={layoutMode}
            layoutSide={layoutSide}
            isNodeChanged={isNodeChanged}
            isContentChanged={isContentChanged}
            $changes={
              applyDiffReplaceAliasBooleanProperty($deprecated as Diff) as Diff ??
              applyDiffReplaceAlias(undefined, $deprecationReason as Diff)
            }
          />
        )}
      </div>
    )}
  </>
}
