import { cn } from '@apihub/utils/common/cn'
import { DiffRecord, isDiff, isDiffMetaRecord } from "@netcracker/qubership-apihub-api-data-model"
import { DiffAction } from '@netcracker/qubership-apihub-api-diff'
import type { FC, ReactNode } from 'react'
import { INLINE_CONTENT_DIFF_COLOR_SCHEMAS } from '../../../../../consts/changes'
import { useChangeSeverityFilters } from '../../../../../contexts/ChangeSeverityFiltersContext'
import { LayoutMode } from '../../../../../types/LayoutMode'
import { LayoutSide } from '../../../../../types/internal/LayoutSide'
import {
  getLayoutModeFlags,
  getLayoutSideFlags,
  isDiffTypeIncluded
} from '../../../../../utils/common/changes'

export type DirectivesSubtitleProps = {
  values: string[]
  layoutMode: LayoutMode
  layoutSide: LayoutSide
  $metaChanges?: DiffRecord
}

export const DirectivesSubtitle: FC<DirectivesSubtitleProps> = (props) => {
  const { values, layoutMode, layoutSide, $metaChanges } = props

  const filters = useChangeSeverityFilters()

  const {
    isSideBySideDiffsLayoutMode: sideBySide,
    isInlineDiffsLayoutMode: inline
  } = getLayoutModeFlags(layoutMode)
  const { originSide, changedSide } = getLayoutSideFlags(layoutSide)

  const diffForAllDirectives = $metaChanges?.directives

  return (
    <div className={cn("flex gap-2")}>
      {values.map(directive => {
        const diffForCurrentDirective = isDiffMetaRecord(diffForAllDirectives)
          ? diffForAllDirectives[directive]
          : diffForAllDirectives
        const diffActionForDirective =
          isDiff(diffForCurrentDirective) ? diffForCurrentDirective.action : undefined
        const diffTypeForDirective =
          isDiff(diffForCurrentDirective) ? diffForCurrentDirective.type : undefined
        const diffTypeForDirectiveIncluded = isDiffTypeIncluded(diffTypeForDirective, filters)

        const { added, removed } = {
          added: diffActionForDirective === DiffAction.add,
          removed: diffActionForDirective === DiffAction.remove,
        }

        let result: ReactNode | null = <Value key={directive} value={directive} />

        // TODO 23.11.23 // Attempt to de-duplicate with ArgumentsSubtitle, DirectiveLocations
        if (sideBySide) {
          if (removed) {
            if (originSide) {
              const diffColorSchema =
                diffActionForDirective ? INLINE_CONTENT_DIFF_COLOR_SCHEMAS[diffActionForDirective] : ''
              result =
                <Value
                  key={directive}
                  value={directive}
                  colorSchema={diffTypeForDirectiveIncluded ? diffColorSchema : ''}
                />
            }
            if (changedSide) {
              result = null
            }
          }
          if (added) {
            if (originSide) {
              result = null
            }
            if (changedSide) {
              const diffColorSchema =
                diffActionForDirective ? INLINE_CONTENT_DIFF_COLOR_SCHEMAS[diffActionForDirective] : ''
              result =
                <Value
                  key={directive}
                  value={directive}
                  colorSchema={diffTypeForDirectiveIncluded ? diffColorSchema : ''}
                />
            }
          }
        }

        if (inline) {
          if (added || removed) {
            const diffColorSchema =
              INLINE_CONTENT_DIFF_COLOR_SCHEMAS[diffActionForDirective!]
            result =
              <Value
                key={directive}
                value={directive}
                colorSchema={diffTypeForDirectiveIncluded ? diffColorSchema : ''}
              />
          }
        }

        return result
      })}
    </div>
  )
}

type ValueProps = {
  value: string
  colorSchema?: string
}

const DEFAULT_DIRECTIVE_COLOR_SCHEMA = 'text-sky-500'

const Value: FC<ValueProps> = props => {
  const {
    value,
    colorSchema = DEFAULT_DIRECTIVE_COLOR_SCHEMA,
  } = props
  return (
    <div key={value} className={cn(`inline-block text-xs ${colorSchema}`)}>
      {`@${value}`}
    </div>
  )
}