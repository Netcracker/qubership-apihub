import type { Meta, StoryFn } from '@storybook/react-vite'
import React from 'react'
import Box from '@mui/material/Box'
import { restDeprecatedOperations } from './samples/operations-samples'
import type { OperationData } from '../entities/operations'
import type { OperationWithMetaClickableListProps } from '../components/Operations/OperationWithMetaClickableList'
import { OperationWithMetaClickableList } from '../components/Operations/OperationWithMetaClickableList'
import type { OperationTitleWithMetaProps } from '../components/Operations/OperationTitleWithMeta'
import { OperationTitleWithMeta } from '../components/Operations/OperationTitleWithMeta'

export default {
  title: 'Operations',
} as Meta

const OperationWithMetaClickableListFn: StoryFn<OperationWithMetaClickableListProps> = (args) =>
  <OperationWithMetaClickableList {...args} />

export const OperationWithMetaClickableListStory = OperationWithMetaClickableListFn.bind({})
OperationWithMetaClickableListStory.args = {
  operations: restDeprecatedOperations,
  isExpandableItem: (operation: OperationData) => operation.deprecated,
  SubComponent: () => (
    <Box
      sx={{ backgroundColor: 'red' }}
      textAlign="center"
    >
      Sub Component
    </Box>
  ),
}

OperationWithMetaClickableListStory.storyName = 'Operation With Meta Clickable List'

const OperationTitleWithMetaFn: StoryFn<OperationTitleWithMetaProps> = (args) =>
  <OperationTitleWithMeta {...args} />

export const OperationTitleWithMetaStory = OperationTitleWithMetaFn.bind({})
OperationTitleWithMetaStory.args = {
  operation: restDeprecatedOperations[1],
  deprecated: true,
}
OperationTitleWithMetaStory.storyName = 'Operation Title With Meta'
