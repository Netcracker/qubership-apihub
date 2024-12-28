/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { Meta, StoryFn } from '@storybook/react'
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
  badgeText: 'Some barge text',
}
OperationTitleWithMetaStory.storyName = 'Operation Title With Meta'
