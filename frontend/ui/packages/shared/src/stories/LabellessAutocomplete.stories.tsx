import type { Meta, StoryObj } from '@storybook/react'
import type { ReactElement, SyntheticEvent } from 'react'
import React, { useState } from 'react'
import { Box, ThemeProvider } from '@mui/material'
import { theme } from '../themes/theme'
import type { LabellessAutocompleteProps } from '../components/Autocompletes/LabellessAutocomplete'
import { LabellessAutocomplete } from '../components/Autocompletes/LabellessAutocomplete'

type Option = string

const options: Option[] = [
  'Option 1',
  'Option 2',
  'Option 3',
  'Option 4',
  'Option 5',
]

const meta = {
  title: 'LabellessAutocomplete',
  component: LabellessAutocomplete,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <ThemeProvider theme={theme}>
        <Box sx={{ width: '400px', p: 2 }}>
          <Story/>
        </Box>
      </ThemeProvider>
    ),
  ],
  argTypes: {
    open: {
      control: 'boolean',
      description: 'Controls whether the options dropdown is open',
    },
    multiple: {
      control: 'boolean',
      description: 'Allow multiple selections',
    },
    prefixText: {
      control: 'text',
      description: 'Text to display before input',
    },
    helperText: {
      control: 'text',
      description: 'Helper text shown below the component',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text for the input',
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
    placeholder: 'Select an option',
  },
  render: RenderWithState,
}

export const WithMultipleSelection: Story = {
  args: {
    options: options,
    placeholder: 'Select multiple options',
    multiple: true,
  },
  render: RenderWithState,
}

export const WithPrefixText: Story = {
  args: {
    options: options,
    placeholder: 'Select an option',
    prefixText: 'Prefix-',
  },
  render: RenderWithState,
}

export const WithHelperText: Story = {
  args: {
    options: options,
    placeholder: 'Type to see helper text',
    helperText: 'Choose from the available options',
  },
  render: RenderWithState,
}

export const WithError: Story = {
  args: {
    options: options,
    placeholder: 'Select an option',
    helperText: 'This field is required',
    inputProps: {
      error: true,
    },
  },
  render: RenderWithState,
}

export const Disabled: Story = {
  args: {
    options: options,
    placeholder: 'This field is disabled',
    disabled: true,
  },
  render: RenderWithState,
}

export const WithInitialValue: Story = {
  args: {
    options: options,
    placeholder: 'Select an option',
    value: ['Option 1'],
  },
  render: RenderWithState,
}

export const WithMultipleInitialValues: Story = {
  args: {
    options: options,
    placeholder: 'Select multiple options',
    multiple: true,
    value: ['Option 1', 'Option 3'],
  },
  render: RenderWithState,
}

export const FreeSoloWithMultipleSelection: Story = {
  args: {
    options: options,
    placeholder: 'Type to add an option',
    freeSolo: true,
    multiple: true,
  },
  render: RenderWithState,
}
