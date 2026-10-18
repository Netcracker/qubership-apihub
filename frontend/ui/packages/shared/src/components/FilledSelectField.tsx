import type { SelectChangeEvent } from '@mui/material'
import { TextField } from '@mui/material'
import { styled } from '@mui/material/styles'
import type { ChangeEvent, FC, ReactNode } from 'react'
import { memo } from 'react'

import type { TestableProps } from './Testable'

const SELECT_MAX_WIDTH_PX = 160

export type FilledSelectFieldProps = {
  value: string
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent) => void
  children: ReactNode
} & TestableProps

export const FilledSelectField: FC<FilledSelectFieldProps> = memo<FilledSelectFieldProps>(({
  value,
  onChange,
  children,
  'data-testid': dataTestId,
}) => (
  <SelectField
    select
    variant="filled"
    hiddenLabel
    value={value}
    onChange={onChange}
    data-testid={dataTestId}
  >
    {children}
  </SelectField>
))

FilledSelectField.displayName = 'FilledSelectField'

const SelectField = styled(TextField)({
  height: '32px',
  margin: 0,
  width: 'fit-content',
  maxWidth: SELECT_MAX_WIDTH_PX,
  '& .MuiFilledInput-root': {
    width: 'fit-content',
    maxWidth: SELECT_MAX_WIDTH_PX,
  },
  '& .MuiSelect-select': {
    width: 'auto',
    maxWidth: SELECT_MAX_WIDTH_PX,
  },
})
