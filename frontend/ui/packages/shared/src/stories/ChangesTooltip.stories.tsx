import type { Meta, StoryFn } from '@storybook/react-vite'
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
