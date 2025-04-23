import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import { SettingsEditableParameter } from './SettingsEditableParameter'
import { Box, Chip, Skeleton, ThemeProvider, Typography } from '@mui/material'
import {
  CREATE_AND_UPDATE_PACKAGE_PERMISSION,
} from '@netcracker/qubership-apihub-ui-shared/entities/package-permissions'
import type { Package } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { theme } from '@netcracker/qubership-apihub-ui-shared/themes/theme'
import { OverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/OverflowTooltip'

const meta: Meta<typeof SettingsEditableParameter> = {
  title: 'Settings Editable Parameter',
  component: SettingsEditableParameter,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <ThemeProvider theme={theme}>
        <Box sx={{
          width: 280,
          display: 'flex',
          gap: 1,
        }}>
          <Story/>
        </Box>
      </ThemeProvider>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

// Mock package objects for different permission scenarios
const packageWithPermission: Package = {
  key: '1',
  alias: 'package-with-permission',
  name: 'Package With Permission',
  kind: 'package',
  permissions: [CREATE_AND_UPDATE_PACKAGE_PERMISSION],
}

const packageWithoutPermission: Package = {
  key: '2',
  alias: 'package-without-permission',
  name: 'Package Without Permission',
  kind: 'package',
  permissions: [],
}

export const ChipsWithEditPermission: Story = {
  name: 'Chips with Edit Permission',
  args: {
    title: 'Parameter with Chips',
    packageObject: packageWithPermission,
    onEdit: () => alert('Edit button clicked'),
    children: (
      <>
        <Chip label="api" size="small"/>
        <Chip label="rest" size="small"/>
        <Chip label="public" size="small"/>
      </>
    ),
  },
}

export const ChipsWithoutEditPermission: Story = {
  name: 'Chips without Edit Permission',
  args: {
    title: 'Parameter with Chips',
    packageObject: packageWithoutPermission,
    onEdit: () => alert('Edit button clicked'),
    children: (
      <>
        <Chip label="api" size="small"/>
        <Chip label="rest" size="small"/>
        <Chip label="public" size="small"/>
      </>
    ),
  },
}

export const ChipsWithLongName: Story = {
  name: 'Chips with Long Name',
  args: {
    title: 'Parameter with Chips',
    packageObject: packageWithPermission,
    onEdit: () => alert('Edit button clicked'),
    children: (
      <>
        <Chip label="api" size="small"/>
        <Chip label="rest" size="small"/>
        <Chip label="looooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooong" size="small"/>
      </>
    ),
  },
}

export const ChipsLoading: Story = {
  args: {
    title: 'Parameter with Chips',
    packageObject: packageWithPermission,
    onEdit: () => alert('Edit button clicked'),
    isLoading: true,
    children: (
      <Box display="flex" flexWrap="wrap" gap={1} width="100%">
        {[...Array(4)].map((_, index) => (
          <Skeleton key={index} variant="rectangular" width={80} height={20}/>
        ))}
      </Box>
    ),
  },
}

export const ChipsWithContentOverflow: Story = {
  name: 'Chips with Content Overflow',
  args: {
    title: 'Parameter with Chips',
    packageObject: packageWithPermission,
    onEdit: () => alert('Edit button clicked'),
    children: (
      <>
        {Array.from({ length: 30 }, (_, i) => (
          <Chip key={i} label={`tag-${i + 1}`} size="small"/>
        ))}
      </>
    ),
  },
}

export const TypographyWithShortText: Story = {
  name: 'Typography with Short Text',
  args: {
    title: 'Parameter with Typography',
    packageObject: packageWithPermission,
    onEdit: () => alert('Edit button clicked'),
    children: (
      <Typography variant="body2" textOverflow="ellipsis" overflow="hidden" noWrap>
        This is a short text
      </Typography>
    ),
  },
}

export const TypographyWithLongText: Story = {
  name: 'Typography with Long Text',
  args: {
    title: 'Parameter with Typography',
    packageObject: packageWithPermission,
    onEdit: () => alert('Edit button clicked'),
    children: (
      <OverflowTooltip
        title="This is a very long text that will overflow the container and trigger the ellipsis and tooltip behavior when hovered. The text is deliberately long to demonstrate how overflow works with Typography component.">
        <Typography variant="body2" textOverflow="ellipsis" overflow="hidden" noWrap>
          This is a very long text that will overflow the container and trigger the ellipsis and tooltip behavior when
          hovered. The text is deliberately long to demonstrate how overflow works with Typography component.
        </Typography>
      </OverflowTooltip>
    ),
  },
}
