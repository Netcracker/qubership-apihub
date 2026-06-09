import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import { styled } from '@mui/material/styles'
import TextField from '@mui/material/TextField'
import { type ChangeEvent, type FC, type KeyboardEvent, memo, useCallback, useEffect, useRef, useState } from 'react'

import { SendIcon } from '@netcracker/qubership-apihub-ui-shared/icons/SendIcon'
import { StopIcon } from '@netcracker/qubership-apihub-ui-shared/icons/StopIcon'

import { usePanel, useStreamingActions, useStreamingTurnStatus } from '../../state/panelContext'
import {
  COMPOSER_ACTION_RESERVE_CSS_VAR,
  COMPOSER_SEND_BUTTON_SIZE_SPACING,
  composerActionReserve,
} from './composerMultilineLayout'
import { useComposerMultilineLayout } from './useComposerMultilineLayout'

type ComposerProps = {
  panelOpen: boolean
  chatKey: string
}

export const Composer: FC<ComposerProps> = memo(({ panelOpen, chatKey }) => {
  const { activeChatId } = usePanel()
  const { isBusy } = useStreamingTurnStatus()
  const { submit, abort } = useStreamingActions()
  const shellRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const [draft, setDraft] = useState('')
  const multilineLayout = useComposerMultilineLayout(shellRef, inputRef, draft, chatKey)

  useEffect(() => {
    setDraft('')
  }, [chatKey])

  useEffect(() => {
    if (!panelOpen) {
      return
    }
    inputRef.current?.focus()
  }, [panelOpen, chatKey])

  const trimmedDraft = draft.trim()
  const canSend = !isBusy && trimmedDraft.length > 0

  const handleSubmit = useCallback((): void => {
    if (!canSend) {
      return
    }
    const text = draft.trim()
    setDraft('')
    void submit(activeChatId, text)
  }, [activeChatId, canSend, draft, submit])

  const handleShellKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' || !(event.ctrlKey || event.metaKey)) {
      return
    }
    event.preventDefault()
    handleSubmit()
  }, [handleSubmit])

  const handleDraftChange = useCallback((event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setDraft(event.target.value)
  }, [])

  return (
    <ComposerShell
      ref={shellRef}
      $multiline={multilineLayout}
      onKeyDown={handleShellKeyDown}
    >
      <ComposerDraftField
        inputRef={inputRef}
        multiline
        maxRows={10}
        minRows={1}
        variant="standard"
        placeholder="Type your message..."
        value={draft}
        onChange={handleDraftChange}
        InputProps={{ disableUnderline: true }}
      />
      <SendStopButton
        variant="contained"
        aria-label={isBusy ? 'Stop response' : 'Send message'}
        onClick={isBusy ? abort : handleSubmit}
      >
        {isBusy ? <StopIcon /> : <SendIcon />}
      </SendStopButton>
    </ComposerShell>
  )
})

Composer.displayName = 'Composer'

const ComposerShell = styled(Box, {
  shouldForwardProp: (prop) => prop !== '$multiline',
})<{ $multiline: boolean }>(({ theme, $multiline }) => {
  const actionReserve = composerActionReserve(theme)
  return {
    [COMPOSER_ACTION_RESERVE_CSS_VAR]: actionReserve,
    display: 'grid',
    alignItems: 'end',
    gap: theme.spacing(1),
    margin: theme.spacing(3),
    padding: theme.spacing(1.25, 1.25, 1.25, 2),
    borderRadius: 30,
    boxSizing: 'border-box',
    border: `1px solid ${theme.palette.divider}`,
    gridTemplateColumns: '1fr auto',
    gridTemplateRows: $multiline ? 'auto auto' : 'auto',
    '&:focus-within': {
      boxShadow: `0 0 0 2px ${theme.palette.primary.main}`,
    },
    '& > .MuiTextField-root': {
      gridColumn: '1 / 3',
      gridRow: 1,
      margin: 0,
      '& .MuiInputBase-input': {
        paddingRight: $multiline ? undefined : actionReserve,
      },
    },
    '& > .MuiButton-root': {
      gridColumn: 2,
      gridRow: $multiline ? 2 : 1,
      justifySelf: 'end',
      zIndex: 1,
    },
  }
})

ComposerShell.displayName = 'ComposerShell'

const ComposerDraftField = styled(TextField)(({ theme }) => ({
  '& .MuiInputBase-input::-webkit-scrollbar': {
    width: theme.spacing(0.5),
  },
  '& .MuiInputBase-input::-webkit-scrollbar-thumb': {
    cursor: 'default',
  },
}))

ComposerDraftField.displayName = 'ComposerDraftField'

const SendStopButton = styled(Button)(({ theme }) => ({
  minWidth: 0,
  width: theme.spacing(COMPOSER_SEND_BUTTON_SIZE_SPACING),
  height: theme.spacing(COMPOSER_SEND_BUTTON_SIZE_SPACING),
  padding: 0,
  borderRadius: '50%',
}))

SendStopButton.displayName = 'SendStopButton'
