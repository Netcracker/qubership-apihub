import { ISSUE_SEVERITY_COLOR_MAP, IssueSeverities, type IssueSeverity } from '@apihub/entities/api-quality/issue-severities'
import { MarkerTooltip } from '@netcracker/qubership-apihub-ui-shared/components/MarkerTooltip'
import type { FC, PropsWithChildren } from 'react'
import { memo } from 'react'

export type ValidationIssuesTooltipProps = PropsWithChildren<{
  issueSeverity: IssueSeverity
  disableHoverListener?: boolean
}>

export const ValidationIssuesTooltip: FC<ValidationIssuesTooltipProps> = memo<ValidationIssuesTooltipProps>(props => {
  const {
    children,
    issueSeverity,
    disableHoverListener = false,
  } = props

  return (
    <MarkerTooltip<IssueSeverity>
      disableHoverListener={disableHoverListener}
      variant={issueSeverity}
      variantToDescription={ISSUE_SEVERITY_DESCRIPTION_MAP}
      variantToTooltipTitle={ISSUE_SEVERITY_TOOLTIP_TITLE_MAP}
      variantToColor={ISSUE_SEVERITY_COLOR_MAP}
    >
      {children}
    </MarkerTooltip>
  )
})

const ISSUE_SEVERITY_DESCRIPTION_MAP: Record<IssueSeverity, string> = {
  [IssueSeverities.ERROR]: 'A critical violation of the OpenAPI specification that must be fixed. These issues break compliance and may prevent the API from functioning or integrating correctly.',
  [IssueSeverities.WARNING]: 'A significant deviation from recommended practices that should be addressed. While not invalid, it may lead to misunderstandings or misuse by API consumers.',
  [IssueSeverities.INFO]: 'A non-blocking suggestion to improve clarity, completeness, or usability. These enhancements help make the API more developer-friendly.',
  [IssueSeverities.HINT]: 'An optional recommendation for advanced design improvements or optimizations. Helps raise the overall quality, consistency, and maintainability of the API.',
}

const ISSUE_SEVERITY_TOOLTIP_TITLE_MAP: Record<IssueSeverity, string> = {
  [IssueSeverities.ERROR]: 'Error',
  [IssueSeverities.WARNING]: 'Warning',
  [IssueSeverities.INFO]: 'Info',
  [IssueSeverities.HINT]: 'Hint',
}
