import { FormControl, FormControlLabel, FormLabel, RadioGroup } from '@mui/material'
import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'

import { RadioCustom } from './RadioCustom'

const meta: Meta<typeof RadioCustom> = {
  title: 'Inputs/RadioCustom',
  component: RadioCustom,
  parameters: {
    layout: 'centered',
  },
}

export default meta

type Story = StoryObj<typeof meta>

function RadioCustomGroupDemo(): JSX.Element {
  const [value, setValue] = useState('female')

  return (
    <FormControl>
      <FormLabel>Radio group</FormLabel>
      <RadioGroup value={value} onChange={(_, newValue) => setValue(newValue)}>
        <FormControlLabel value="female" control={<RadioCustom />} label="Option 1" />
        <FormControlLabel value="male" control={<RadioCustom />} label="Option 2" />
        <FormControlLabel value="other" control={<RadioCustom />} label="Option 3" />
      </RadioGroup>
    </FormControl>
  )
}

export const Default: Story = {
  render: () => <RadioCustomGroupDemo />,
}

export const Disabled: Story = {
  render: () => (
    <FormControl>
      <FormLabel>Disabled radio group</FormLabel>
      <RadioGroup value="disabled">
        <FormControlLabel value="disabled" control={<RadioCustom disabled />} label="Option 1" />
        <FormControlLabel value="disabled" control={<RadioCustom disabled />} label="Option 2" checked={false} />
      </RadioGroup>
    </FormControl>
  ),
}
