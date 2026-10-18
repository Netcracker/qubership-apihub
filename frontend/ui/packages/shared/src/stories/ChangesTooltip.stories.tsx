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
import type { ChangesTooltipProps } from '../components/ChangesTooltip'
import { ChangesTooltip } from '../components/ChangesTooltip'
import { Box, Button } from '@mui/material'
import { BREAKING_CHANGE_SEVERITY, CHANGE_SEVERITIES } from '../entities/change-severities'

export default {
  title: 'Changes Tooltip',
} as Meta

const ChangesTooltipFn: StoryFn<ChangesTooltipProps> = (args) => (
  <Box display="flex" justifyContent="center">
    <ChangesTooltip {...args}>
      <Button variant="contained">Navigate to show tooltip</Button>
    </ChangesTooltip>
  </Box>
)

export const ChangesTooltipStory = ChangesTooltipFn.bind({})

ChangesTooltipStory.argTypes = {
  changeType: {
    control: { type: 'radio' },
    options: Array.from(CHANGE_SEVERITIES),
  },
}

ChangesTooltipStory.args = {
  changeType: BREAKING_CHANGE_SEVERITY,
  disableHoverListener: false,
}
