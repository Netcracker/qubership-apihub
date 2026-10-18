import type { Meta, StoryObj } from '@storybook/react'
import type { ReactElement, SyntheticEvent } from 'react'
import React, { useState } from 'react'
import { Box, TextField, ThemeProvider } from '@mui/material'
import { theme } from '../../../themes/theme'
import type { LabellessAutocompleteProps } from './LabellessAutocomplete'
import { LabellessAutocomplete } from './LabellessAutocomplete'

type Option = string

const options: Option[] = [
  'Option 1',
  'Option 2',
  'Option 3',
  'Option 4',
  'Option 5',
]

const meta = {
  title: 'Autocompletes/Labelless Autocomplete',
  component: LabellessAutocomplete,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <ThemeProvider theme={theme}>
        <Box sx={{ width: '600px', p: 2 }}>
          <Story/>
        </Box>
      </ThemeProvider>
    ),
  ],
  argTypes: {
    options: {
      control: 'object',
      description: 'Array of options to display in the dropdown',
    },
    freeSolo: {
      control: 'boolean',
      description: 'Allow free text input that is not in the options list',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable the component',
    },
    maxWidth: {
      control: { type: 'number' },
      description: 'Maximum width of the component (e.g., "300px", "50%")',
    },
    value: {
      control: 'object',
      description: 'Initial selected value(s)',
    },
    multiple: {
      control: 'boolean',
      table: { disable: true },
      description: 'Allow multiple selections',
    },
    renderInput: {
      table: { disable: true },
      description: 'Render the input. Used to customize the TextField.',
    },
    ref: {
      table: { disable: true },
    },
  },
} satisfies Meta<typeof LabellessAutocomplete>

export default meta
type Story = StoryObj<typeof meta>

const RenderWithState = (args: LabellessAutocompleteProps<unknown>): ReactElement => {
  const [selectedValues, setSelectedValues] = useState<string[]>(args.value as string[] || [])

  const handleChange = (_: SyntheticEvent, newValue: unknown): void => {
    setSelectedValues(newValue as string[])
  }

  return (
    <LabellessAutocomplete
      {...args}
      value={selectedValues}
      onChange={handleChange}
      getOptionLabel={(option) => String(option)}
    />
  )
}

export const Default: Story = {
  args: {
    options: options,
    multiple: false,
    freeSolo: false,
    disabled: false,
    renderInput: (params) => <TextField {...params} />,
  },
  render: RenderWithState,
}

export const MultipleSelection: Story = {
  args: {
    options: options,
    multiple: true,
    freeSolo: false,
    disabled: false,
    value: ['Option 1'],
    renderInput: (params) => <TextField {...params} />,
  },
  render: RenderWithState,
}
