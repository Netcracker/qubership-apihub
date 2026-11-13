import { Box, styled } from '@mui/material'
import { type FC, memo, type ReactNode } from 'react'

import type { TestableProps } from '../Testable'

import failedIllustration from './failed.svg'
import noDataIllustration from './no-data.svg'

export const NO_DATA_EMPTY_STATE_VARIANT = 'no-data'
export const FAILED_EMPTY_STATE_VARIANT = 'failed'

type EmptyStateVariant =
  | typeof NO_DATA_EMPTY_STATE_VARIANT
  | typeof FAILED_EMPTY_STATE_VARIANT

type EmptyStateProps = {
  variant: EmptyStateVariant
  title: string
  /** The lines of the description, each rendered on a line of its own. */
  lines: ReadonlyArray<string>
  action?: ReactNode
} & TestableProps

const EMPTY_STATE_VARIANT_TO_ILLUSTRATION_MAP: Record<EmptyStateVariant, string> = {
  [NO_DATA_EMPTY_STATE_VARIANT]: noDataIllustration,
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

// `flex` fills the parent when it is a flex column, and `height` when it is any other box
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

// The theme has no 20 px variant, so the title sets the size on h5, as the titles of ErrorPage and
// PackageRedirectPage do
const EmptyStateTitle = styled(Box)(({ theme }) => ({
  ...theme.typography.h5,
  fontSize: 20,
  fontWeight: 500,
}))

const EmptyStateDescription = styled(Box)(({ theme }) => ({
  ...theme.typography.h6,
  display: 'flex',
  flexDirection: 'column',
  lineHeight: '22px',
  color: theme.palette.text.secondary,
}))
