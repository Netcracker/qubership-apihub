import { Box, Divider } from '@mui/material'
import { styled } from '@mui/material/styles'
import type { FC, ReactNode } from 'react'
import { memo } from 'react'

import { LoadingIndicator } from './LoadingIndicator'
import { NAVIGATION_PLACEHOLDER_AREA, Placeholder } from './Placeholder'
import type { TestableProps } from './Testable'
import { SMALL_TOOLBAR_SIZE, Toolbar } from './Toolbar'
import { ToolbarTitle } from './ToolbarTitle'

export type ContractPreviewPanelProps = {
  title: ReactNode
  action?: ReactNode
  isLoading: boolean
  hasContent: boolean
  maxWidthHeaderToolbar?: number
  children: ReactNode
  emptyMessage?: string
} & TestableProps

export const ContractPreviewPanel: FC<ContractPreviewPanelProps> = memo<ContractPreviewPanelProps>(({
  title,
  action,
  isLoading,
  hasContent,
  maxWidthHeaderToolbar,
  children,
  emptyMessage = 'No content',
  'data-testid': dataTestId,
}) => {
  if (isLoading) {
    return <LoadingIndicator />
  }

  if (!hasContent) {
    return (
      <Placeholder
        invisible={false}
        area={NAVIGATION_PLACEHOLDER_AREA}
        message={emptyMessage}
        data-testid="NoContentPlaceholder"
      />
    )
  }

  return (
    <PanelRoot data-testid={dataTestId}>
      <HeaderBox>
        <Toolbar
          maxWidthHeaderToolbar={maxWidthHeaderToolbar}
          size={SMALL_TOOLBAR_SIZE}
          header={<ToolbarTitle value={title} />}
          action={action}
        />
        <Divider orientation="horizontal" variant="fullWidth" />
      </HeaderBox>
      <BodyBox>{children}</BodyBox>
    </PanelRoot>
  )
})

ContractPreviewPanel.displayName = 'ContractPreviewPanel'

const PanelRoot = styled(Box)({
  height: 'inherit',
  display: 'grid',
  gridTemplateRows: 'auto 1fr',
})

const HeaderBox = styled(Box)({})

const BodyBox = styled(Box)({})
