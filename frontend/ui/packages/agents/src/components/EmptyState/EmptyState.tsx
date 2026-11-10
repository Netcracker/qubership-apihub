import { Box, styled, Typography } from '@mui/material'
import { type FC, memo, type ReactNode } from 'react'

import type { TestableProps } from '@netcracker/qubership-apihub-ui-shared/components/Testable'

import failedIllustration from './empty-state-failed.svg'
import readyIllustration from './empty-state-ready.svg'

export const READY_EMPTY_STATE_VARIANT = 'ready'
export const FAILED_EMPTY_STATE_VARIANT = 'failed'

type EmptyStateVariant =
  | typeof READY_EMPTY_STATE_VARIANT
  | typeof FAILED_EMPTY_STATE_VARIANT

type EmptyStateProps = {
  variant: EmptyStateVariant
  title: string
  // Each line starts on a line of its own, as the mockups break the description
  lines: ReadonlyArray<string>
  action?: ReactNode
} & TestableProps

const EMPTY_STATE_VARIANT_TO_ILLUSTRATION_MAP: Record<EmptyStateVariant, string> = {
  [READY_EMPTY_STATE_VARIANT]: readyIllustration,
  [FAILED_EMPTY_STATE_VARIANT]: failedIllustration,
}

export const EmptyState: FC<EmptyStateProps> = memo<EmptyStateProps>(({
  variant,
  title,
  lines,
  action,
  'data-testid': dataTestId,
}) => (
  <EmptyStateBox data-testid={dataTestId}>
    <img src={EMPTY_STATE_VARIANT_TO_ILLUSTRATION_MAP[variant]} alt="" />
    <EmptyStateText>
      <EmptyStateTitle>{title}</EmptyStateTitle>
      <EmptyStateDescription>
        {lines.map(line => <span key={line}>{line}</span>)}
      </EmptyStateDescription>
    </EmptyStateText>
    {action}
  </EmptyStateBox>
))

EmptyState.displayName = 'EmptyState'

// Fills the flex column of a wizard step as well as the plain box of the welcome page
const EmptyStateBox = styled(Box)(({ theme }) => ({
  flex: 1,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(1),
}))

const EmptyStateText = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: theme.spacing(1),
  textAlign: 'center',
}))

const EmptyStateTitle = styled(Typography)(({ theme }) => ({
  fontSize: 20,
  fontWeight: 500,
  lineHeight: '28px',
  color: theme.palette.common.black,
}))

const EmptyStateDescription = styled(Typography)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  fontSize: 15,
  lineHeight: '22px',
  color: theme.palette.text.secondary,
}))
