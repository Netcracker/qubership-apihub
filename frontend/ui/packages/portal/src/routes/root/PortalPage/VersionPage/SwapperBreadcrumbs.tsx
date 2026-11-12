import { Box, Typography } from '@mui/material'
import { type FC, memo, type ReactElement } from 'react'

import { TextWithOverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/TextWithOverflowTooltip'

import { ComparedPackagesBreadcrumbs } from '../../ComparedPackagesBreadcrumbs'
import type { ComparedPackagesBreadcrumbsData } from './breadcrumbs'
import { isLinkedComparedBreadcrumbPathItem } from './breadcrumbs'

type SwapperBreadcrumbsProps = {
  side: 'before' | 'after'
  data: ComparedPackagesBreadcrumbsData | null
  customComponentAfterContent?: ReactElement
}

const SWAPPER_TEXT_STYLES = {
  width: 'calc(100% - 32px - 28px)',
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
}

export const SwapperBreadcrumbs: FC<SwapperBreadcrumbsProps> = memo<SwapperBreadcrumbsProps>(({ side, data, customComponentAfterContent }) => {
  const breadcrumbsList = (side === 'before' ? data?.origin : side === 'after' ? data?.changed : null) ?? []
  const linkedBreadcrumbs = breadcrumbsList.slice(0, -1).filter(isLinkedComparedBreadcrumbPathItem)
  const textBreadcrumb = breadcrumbsList.at(-1)

  return (
    <>
      <ComparedPackagesBreadcrumbs data={linkedBreadcrumbs}/>
      <Box sx={SWAPPER_TEXT_STYLES} data-testid="SwapperTitle">
        <TextWithOverflowTooltip
          tooltipText={textBreadcrumb?.name}
          variant="body1"
          sx={{ fontWeight: 600 }}
        >
          {textBreadcrumb?.name}
        </TextWithOverflowTooltip>
        <Typography variant="subtitle2" fontSize={13}>{textBreadcrumb?.description}</Typography>
        {customComponentAfterContent}
      </Box>
    </>
  )
})

SwapperBreadcrumbs.displayName = 'SwapperBreadcrumbs'
