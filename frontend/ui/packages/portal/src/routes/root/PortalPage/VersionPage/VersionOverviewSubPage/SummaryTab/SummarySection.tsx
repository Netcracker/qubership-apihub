import { Box, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import type { TestableProps } from '@netcracker/qubership-apihub-ui-shared/components/Testable'
import { type FC, memo, type ReactNode } from 'react'

import { SUMMARY_SECTION_SPACING } from './consts'

type SummarySectionProps =
  & Readonly<{
    title?: string
    children: ReactNode
  }>
  & TestableProps

export const SummarySection: FC<SummarySectionProps> = memo(({
  title,
  children,
  'data-testid': dataTestId,
}) => (
  <SummarySectionContents data-testid={dataTestId}>
    <SummarySectionOffset>
      {title && <Typography variant="subtitle1">{title}</Typography>}
    </SummarySectionOffset>
    {children}
  </SummarySectionContents>
))

SummarySection.displayName = 'SummarySection'

const SummarySectionContents = styled(Box)({
  display: 'contents',
})

const SummarySectionOffset = styled(Box)(({ theme }) => ({
  gridColumn: '1 / -1',
  marginTop: theme.spacing(SUMMARY_SECTION_SPACING),
}))
