import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import MenuItem from '@mui/material/MenuItem'
import type { SvgIconProps } from '@mui/material/SvgIcon'
import Typography from '@mui/material/Typography'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { type FC, Fragment } from 'react'

import { ChevronDownIcon } from '../../icons/ChevronDownIcon'
import { DefaultTextField } from './DefaultTextField'
import { OutlinedTextField } from './OutlinedTextField'

type FieldComponent = typeof DefaultTextField

type FieldState = {
  title: string
  value?: string
  error?: boolean
  disabled?: boolean
}

const FIELD_WIDTH = 200
const SIZES = ['medium', 'small'] as const
const OPTIONS = ['Text', 'Another text']
const [VALUE] = OPTIONS
const STATES: readonly FieldState[] = [
  { title: 'Empty' },
  { title: 'Filled', value: VALUE },
  { title: 'Error', error: true },
  { title: 'Error, filled', value: VALUE, error: true },
  { title: 'Disabled', disabled: true },
  { title: 'Disabled, filled', value: VALUE, disabled: true },
]

const meta: Meta<typeof DefaultTextField> = {
  title: 'Inputs/Text Fields',
  component: DefaultTextField,
  parameters: {
    layout: 'padded',
  },
}

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => <FieldMatrix Field={DefaultTextField} />,
}

export const Outlined: Story = {
  render: () => <FieldMatrix Field={OutlinedTextField} />,
}

const FieldMatrix: FC<{ Field: FieldComponent }> = ({ Field }) => (
  <Box display="grid" gridTemplateColumns={`120px repeat(${STATES.length}, ${FIELD_WIDTH}px)`} gap={2}>
    <span />
    {STATES.map(({ title }) => <Typography key={title} variant="subtitle2">{title}</Typography>)}
    {SIZES.map(size => (
      <Fragment key={size}>
        <RowTitle title={`Text, ${size}`} />
        {STATES.map(({ title, value, error, disabled }) => (
          <Field
            key={title}
            size={size}
            label="Label"
            required
            defaultValue={value}
            error={error}
            disabled={disabled}
            helperText={error ? 'Error text' : undefined}
          />
        ))}

        <RowTitle title={`Select, ${size}`} />
        {STATES.map(({ title, value, error, disabled }) => (
          <Field
            key={title}
            select
            size={size}
            label="Label"
            required
            defaultValue={value ?? ''}
            error={error}
            disabled={disabled}
            SelectProps={{ IconComponent: SelectIcon }}
          >
            {OPTIONS.map(option => <MenuItem key={option} value={option}>{option}</MenuItem>)}
          </Field>
        ))}

        <RowTitle title={`Autocomplete, ${size}`} />
        {STATES.map(({ title, value, error, disabled }) => (
          <Autocomplete
            key={title}
            size={size}
            options={OPTIONS}
            defaultValue={value}
            disabled={disabled}
            popupIcon={<ChevronDownIcon fontSize="small" />}
            renderInput={(params) => <Field {...params} label="Label" required error={error} />}
          />
        ))}

        <RowTitle title={`Placeholder, ${size}`} />
        {STATES.map(({ title, value, error, disabled }) => (
          <Field
            key={title}
            size={size}
            placeholder="Placeholder"
            defaultValue={value}
            error={error}
            disabled={disabled}
          />
        ))}
      </Fragment>
    ))}
  </Box>
)

const RowTitle: FC<{ title: string }> = ({ title }) => (
  <Typography variant="subtitle2" alignSelf="center">{title}</Typography>
)

const SelectIcon: FC<SvgIconProps> = props => <ChevronDownIcon {...props} fontSize="small" />
