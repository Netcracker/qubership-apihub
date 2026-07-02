import { Box } from '@mui/material'
import { styled } from '@mui/material/styles'
import { type FC, memo, type ReactNode } from 'react'

import { SUMMARY_METRIC_COLUMN_GAP, SUMMARY_PANEL_GAP_COLUMN, SUMMARY_ROW_GAP } from './consts'

type ContractsSummaryProps = Readonly<{
  children: ReactNode
}>

export const ContractsSummary: FC<ContractsSummaryProps> = memo(({ children }) => (
  <ContractsSummaryGrid>
    {children}
  </ContractsSummaryGrid>
))

ContractsSummary.displayName = 'ContractsSummary'

const ContractsSummaryGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: `
    max-content
    max-content
    ${theme.spacing(SUMMARY_PANEL_GAP_COLUMN)}
    max-content
    max-content
  `,
  rowGap: theme.spacing(SUMMARY_ROW_GAP),
  columnGap: theme.spacing(SUMMARY_METRIC_COLUMN_GAP),
}))
