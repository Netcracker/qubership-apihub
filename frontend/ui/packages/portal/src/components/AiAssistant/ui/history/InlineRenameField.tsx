import {
  type ChangeEvent,
  type FC,
  type KeyboardEvent,
  memo,
  type MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import Box from '@mui/material/Box'
import InputBase from '@mui/material/InputBase'
import { styled } from '@mui/material/styles'

type InlineRenameFieldProps = {
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

  const stopPropagation = useCallback((event: MouseEvent) => {
    event.stopPropagation()
  }, [])

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValue(event.target.value)
  }, [])

  return (
    <RenameRoot>
      <RenameInput
        inputRef={inputRef}
        value={value}
        fullWidth
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onClick={stopPropagation}
        onMouseDown={stopPropagation}
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
  margin: 0,
  fontSize: 13,
  fontWeight: 500,
  color: theme.palette.text.primary,
  '& .MuiInputBase-input': {
    padding: 0,
  },
}))
