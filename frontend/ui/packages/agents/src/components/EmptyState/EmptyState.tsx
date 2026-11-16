import { Box, styled } from '@mui/material'
import { type FC, memo, type ReactNode } from 'react'

import failedIllustration from '@netcracker/qubership-apihub-ui-shared/components/Placeholder/failed.svg'
import noDataIllustration from '@netcracker/qubership-apihub-ui-shared/components/Placeholder/no-data.svg'
import type { TestableProps } from '@netcracker/qubership-apihub-ui-shared/components/Testable'

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
  <EmptyStateScroll>
    <EmptyStateBox data-testid={dataTestId}>
      <EmptyStateIllustration src={EMPTY_STATE_VARIANT_TO_ILLUSTRATION_MAP[variant]} alt="" />
      <EmptyStateText>
        <EmptyStateTitle>{title}</EmptyStateTitle>
        <EmptyStateDescription>
          {lines.map(line => <span key={line}>{line}</span>)}
        </EmptyStateDescription>
      </EmptyStateText>
      {action}
    </EmptyStateBox>
  </EmptyStateScroll>
))

EmptyState.displayName = 'EmptyState'

const EmptyStateScroll = styled(Box)({
  height: '100%',
  overflowY: 'auto',
})

// `minHeight` centers the content, and the box grows past the scroll box when the content is taller. The padding
// gives the scroll its gap below the action
const EmptyStateBox = styled(Box)(({ theme }) => ({
  minHeight: '100%',
  padding: theme.spacing(3, 0),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(1),
}))

const EmptyStateIllustration = styled('img')({
  width: '100%',
  maxHeight: 300,
  objectFit: 'contain',
})

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
