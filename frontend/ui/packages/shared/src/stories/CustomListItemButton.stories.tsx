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

import type { Meta, StoryObj } from '@storybook/react'
import { Box } from '@mui/material'
import type { CustomListItemButtonProps } from '../components/CustomListItemButton'
import { CustomListItemButton, LIST_ITEM_SIZE_BIG, LIST_ITEM_SIZE_SMALL } from '../components/CustomListItemButton'
import { GREEN_SECTION_COLOR } from './commons/placeholder-colors'

type SomeBusinessData = {
  id: string
  name: string
}

const meta: Meta<CustomListItemButtonProps<SomeBusinessData>> = {
  title: 'Custom List Item Button',
  component: CustomListItemButton,
}
export default meta
type Story = StoryObj<typeof meta>

export const SmallListItemButton: Story = {
  args: {
    itemComponent: <Box sx={{ backgroundColor: GREEN_SECTION_COLOR }}>Item Component of a Cat List</Box>,
    isSelected: true,
    isSubListItem: false,
    keyProp: 'item-1',
    size: LIST_ITEM_SIZE_SMALL,
    data: { id: 'entity-1', name: 'Cat' },
  },
}

export const BigListItemButton: Story = {
  args: {
    itemComponent: <Box sx={{ backgroundColor: GREEN_SECTION_COLOR }}>Item Component of a Cat List</Box>,
    isSelected: true,
    isSubListItem: false,
    keyProp: 'item-1',
    size: LIST_ITEM_SIZE_BIG,
    data: { id: 'entity-1', name: 'Cat' },
  },
}
