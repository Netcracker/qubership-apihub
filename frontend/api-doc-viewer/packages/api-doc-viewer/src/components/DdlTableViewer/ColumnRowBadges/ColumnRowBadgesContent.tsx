import { DiffBadge } from "@apihub/components/common/diffs/DiffBadge"
import { useLayoutMode } from "@apihub/contexts/LayoutModeContext"
import { LayoutSide, ORIGIN_LAYOUT_SIDE } from "@apihub/types/internal/LayoutSide"
import { Diff } from "@netcracker/qubership-apihub-api-diff"
import { takeDiffSideTextHighlighterColor } from "@apihub/utils/diffs/take-diff-side-text-highlighter-color"
import { ChangedPropertyMetaData } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { isDdlFlagBadgeDiffHighlighted } from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/tree-with-diffs/property-row-diffs"
import { DdlApiForeignKeyTarget } from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/tree/node-value"
import { formatForeignKeyTargetKey } from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/tree-with-diffs/property-row-diffs"
import { FC, memo, ReactNode, useMemo } from "react"
import {
  DDL_API_FOREIGN_KEY_BADGE_COLOR_SCHEMA,
  DDL_API_GENERATED_BADGE_COLOR_SCHEMA,
  DDL_API_NOT_NULL_BADGE_COLOR_SCHEMA,
  DDL_API_PRIMARY_KEY_BADGE_COLOR_SCHEMA,
  DDL_API_UNIQUE_BADGE_COLOR_SCHEMA,
} from "../consts"
import { ForeignKey } from "../ForeignKey/ForeignKey"
import { formatForeignKeyTarget } from "../formatters"
import { ColumnRowBadgesContentProps, ColumnRowBadgesFlagDiffs } from "./types"

/** Keeps side-by-side columns aligned when a flag badge is hidden on one side. */
function emptyBadgePlaceholder(): ReactNode {
  return <span className="inline-block min-h-[19px]" aria-hidden="true" />
}

function isFlagBadgeVisible(
  flagValue: boolean | undefined,
  flagDiff: ChangedPropertyMetaData | undefined,
): boolean {
  return !!flagValue || !!flagDiff
}

function isContentVisibleOnSide(
  flagDiff: ChangedPropertyMetaData | undefined,
  layoutSide: LayoutSide,
): boolean {
  if (!flagDiff) {
    return true
  }
  return layoutSide === ORIGIN_LAYOUT_SIDE
    ? flagDiff.styles.before.isContentVisible
    : flagDiff.styles.after.isContentVisible
}

function isFlagBadgeContentVisible(
  flagValue: boolean | undefined,
  flagDiff: ChangedPropertyMetaData | undefined,
  layoutSide: LayoutSide,
): boolean {
  return isFlagBadgeVisible(flagValue, flagDiff) && isContentVisibleOnSide(flagDiff, layoutSide)
}

function renderFlagBadge(options: {
  columnId: string
  label: string
  colorSchema: string
  flagValue: boolean | undefined
  flagDiff: ChangedPropertyMetaData | undefined
  layoutMode: ReturnType<typeof useLayoutMode>
  layoutSide: LayoutSide
}): ReactNode {
  const { columnId, label, colorSchema, flagValue, flagDiff, layoutMode, layoutSide } = options

  if (!isFlagBadgeVisible(flagValue, flagDiff)) {
    return null
  }

  if (!isContentVisibleOnSide(flagDiff, layoutSide)) {
    return emptyBadgePlaceholder()
  }

  const $changes = isDdlFlagBadgeDiffHighlighted(flagDiff)
    ? flagDiff?.data as Diff | undefined
    : undefined

  return (
    <DiffBadge
      key={buildBadgeKey(columnId, label)}
      label={label}
      colorSchema={colorSchema}
      layoutMode={layoutMode}
      layoutSide={layoutSide}
      isNodeChanged={false}
      isContentChanged={!!$changes}
      $changes={$changes}
    />
  )
}

function renderForeignKeyTargetBadge(options: {
  columnId: string
  target: DdlApiForeignKeyTarget
  targetDiff: ChangedPropertyMetaData | undefined
  layoutMode: ReturnType<typeof useLayoutMode>
  layoutSide: LayoutSide
}): ReactNode {
  const { columnId, target, targetDiff, layoutMode, layoutSide } = options
  const badgeKey = buildForeignKeyBadgeKey(columnId, target)
  const textHighlighterColor = takeDiffSideTextHighlighterColor(targetDiff, layoutSide)

  if (targetDiff && !isContentVisibleOnSide(targetDiff, layoutSide)) {
    return <span key={badgeKey} className="inline-block min-h-[19px]" aria-hidden="true" />
  }

  if (!targetDiff) {
    return <ForeignKey key={badgeKey} target={target} />
  }

  const $changes = targetDiff.data as Diff

  return (
    <div key={badgeKey} className="ddlapi-foreign-key inline-flex flex-row items-center gap-1">
      <DiffBadge
        label="FK"
        colorSchema={DDL_API_FOREIGN_KEY_BADGE_COLOR_SCHEMA}
        layoutMode={layoutMode}
        layoutSide={layoutSide}
        isNodeChanged={false}
        isContentChanged={true}
        $changes={$changes}
      />
      <ForeignKey target={target} hideBadge textHighlighterColor={textHighlighterColor} />
    </div>
  )
}

export const ColumnRowBadgesContent: FC<ColumnRowBadgesContentProps> = memo<ColumnRowBadgesContentProps>(props => {
  const { columnId, value, flagDiffs, foreignKeyTargetDiffs, layoutSide } = props
  const layoutMode = useLayoutMode()

  const diffs: ColumnRowBadgesFlagDiffs = useMemo(() => flagDiffs ?? {}, [flagDiffs])
  const targetDiffs = useMemo(() => foreignKeyTargetDiffs ?? {}, [foreignKeyTargetDiffs])

  const primaryKeyBadge = useMemo(
    () => renderFlagBadge({
      columnId: columnId,
      label: "PK",
      colorSchema: DDL_API_PRIMARY_KEY_BADGE_COLOR_SCHEMA,
      flagValue: value.isPrimaryKey,
      flagDiff: diffs.isPrimaryKey,
      layoutMode,
      layoutSide,
    }),
    [columnId, diffs.isPrimaryKey, layoutMode, layoutSide, value.isPrimaryKey],
  )
  const isPrimaryKeyBadgeContentVisible = useMemo(
    () => isFlagBadgeContentVisible(value.isPrimaryKey, diffs.isPrimaryKey, layoutSide),
    [diffs.isPrimaryKey, layoutSide, value.isPrimaryKey],
  )

  const uniqueBadge = useMemo(
    () => renderFlagBadge({
      columnId: columnId,
      label: "unique",
      colorSchema: DDL_API_UNIQUE_BADGE_COLOR_SCHEMA,
      flagValue: value.isUnique,
      flagDiff: diffs.isUnique,
      layoutMode,
      layoutSide,
    }),
    [columnId, diffs.isUnique, layoutMode, layoutSide, value.isUnique],
  )

  const notNullBadge = useMemo(
    () => isPrimaryKeyBadgeContentVisible
      ? null
      : renderFlagBadge({
        columnId: columnId,
        label: "not null",
        colorSchema: DDL_API_NOT_NULL_BADGE_COLOR_SCHEMA,
        flagValue: value.isNotNull,
        flagDiff: diffs.isNotNull,
        layoutMode,
        layoutSide,
      }),
    [
      columnId,
      diffs.isNotNull,
      isPrimaryKeyBadgeContentVisible,
      layoutMode,
      layoutSide,
      value.isNotNull,
    ],
  )

  const generatedBadge = useMemo(
    () => renderFlagBadge({
      columnId: columnId,
      // Badge label is always "generated". `generatedBy` ('identity' | 'expression') is
      // preserved on the data model for consumers; the viewer does not distinguish them.
      label: "generated",
      colorSchema: DDL_API_GENERATED_BADGE_COLOR_SCHEMA,
      flagValue: value.isGenerated,
      flagDiff: diffs.isGenerated,
      layoutMode,
      layoutSide,
    }),
    [columnId, diffs.isGenerated, layoutMode, layoutSide, value.isGenerated],
  )

  const foreignKeyBadges = useMemo(() => {
    const targets = value.foreignKeyTargets ?? []
    if (targets.length === 0) {
      return []
    }

    return targets.map(target => renderForeignKeyTargetBadge({
      columnId,
      target,
      targetDiff: targetDiffs[formatForeignKeyTargetKey(target)],
      layoutMode,
      layoutSide,
    }))
  }, [columnId, layoutMode, layoutSide, targetDiffs, value.foreignKeyTargets])

  const badges = useMemo(
    () => [primaryKeyBadge, uniqueBadge, notNullBadge, generatedBadge, ...foreignKeyBadges].filter(Boolean),
    [foreignKeyBadges, generatedBadge, notNullBadge, primaryKeyBadge, uniqueBadge],
  )

  if (badges.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {badges}
    </div>
  )
})

function buildBadgeKey(columnId: string, label: string): string {
  return `${columnId}-${label}`
}

function buildForeignKeyBadgeKey(columnId: string, target: DdlApiForeignKeyTarget): string {
  return `${columnId}-FK-${formatForeignKeyTarget(target)}`
}
