import { type FC, type KeyboardEvent, memo, useCallback, useEffect, useRef, useState } from 'react'

import Box from '@mui/material/Box'
import InputBase from '@mui/material/InputBase'
import { styled } from '@mui/material/styles'

export type InlineRenameFieldProps = {
  initialTitle: string
  onSave: (title: string) => void
  onCancel: () => void
}

export const InlineRenameField: FC<InlineRenameFieldProps> = memo(({ initialTitle, onSave, onCancel }) => {
  const [value, setValue] = useState(initialTitle)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setValue(initialTitle)
  }, [initialTitle])

  useEffect(() => {
    const input = inputRef.current
    if (!input) {
      return
    }
    input.focus()
    const end = input.value.length
    input.setSelectionRange(end, end)
  }, [])

  const handleBlur = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || trimmed === initialTitle.trim()) {
      setValue(initialTitle)
      onCancel()
      return
    }
    onSave(trimmed)
  }, [initialTitle, onCancel, onSave, value])

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      inputRef.current?.blur()
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      setValue(initialTitle)
      inputRef.current?.blur()
    }
  }, [initialTitle])

  return (
    <RenameRoot>
      <RenameInput
        inputRef={inputRef}
        value={value}
        fullWidth
        onChange={(event) => setValue(event.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        inputProps={{
          maxLength: 120,
          'aria-label': 'Rename chat',
        }}
      />
    </RenameRoot>
  )
})

InlineRenameField.displayName = 'InlineRenameField'

const RenameRoot = styled(Box)({
  flex: 1,
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  height: 20,
})

const RenameInput = styled(InputBase)(({ theme }) => ({
  width: '100%',
  margin: 0,
  fontSize: 13,
  fontWeight: 500,
  lineHeight: '20px',
  letterSpacing: '-0.0325px',
  color: theme.palette.text.primary,
  '& .MuiInputBase-input': {
    padding: 0,
    height: 20,
    minHeight: 20,
    '&:focus': {
      outline: 'none',
    },
  },
}))
