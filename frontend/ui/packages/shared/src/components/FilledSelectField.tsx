import type { SelectChangeEvent, SelectProps } from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import { styled } from '@mui/material/styles'
import { type ChangeEvent, type FC, memo, type ReactNode } from 'react'

import type { TestableProps } from './Testable'

const SELECT_MAX_WIDTH_PX = 160

export type FilledSelectFieldProps = TestableProps & {
  value: string
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent) => void
  children: ReactNode
  renderValue?: SelectProps['renderValue']
  maxWidth?: number | string
}

export const FilledSelectField: FC<FilledSelectFieldProps> = memo<FilledSelectFieldProps>(({
  value,
  onChange,
  children,
  renderValue,
  maxWidth = SELECT_MAX_WIDTH_PX,
  'data-testid': dataTestId,
}) => (
  <SelectField
    select
    variant="filled"
    hiddenLabel
    value={value}
    onChange={onChange}
    maxWidth={maxWidth}
    SelectProps={{
      renderValue: renderValue,
    }}
    data-testid={dataTestId}
  >
    {children}
  </SelectField>
))

FilledSelectField.displayName = 'FilledSelectField'

const SelectField = styled(TextField, {
  shouldForwardProp: prop => prop !== 'maxWidth',
})<{ maxWidth?: number | string }>(({ maxWidth = SELECT_MAX_WIDTH_PX }) => ({
  height: '32px',
  margin: 0,
  width: 'fit-content',
  maxWidth: maxWidth,
  '& .MuiFilledInput-root': {
    width: 'fit-content',
    maxWidth: maxWidth,
  },
  '& .MuiSelect-select': {
    width: 'auto',
    maxWidth: maxWidth,
  },
}))
