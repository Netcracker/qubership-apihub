import { type FC, type KeyboardEvent, memo, useCallback, useEffect, useRef, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import { styled } from '@mui/material/styles'
import TextField from '@mui/material/TextField'

import { SendIcon } from '@netcracker/qubership-apihub-ui-shared/icons/SendIcon'
import { StopIcon } from '@netcracker/qubership-apihub-ui-shared/icons/StopIcon'

import { useAiAssistantContext } from '../../state/AiAssistantContext'

export type AiAssistantComposerProps = {
  panelOpen: boolean
  chatKey: string
}

export const AiAssistantComposer: FC<AiAssistantComposerProps> = memo(({ panelOpen, chatKey }) => {
  const { activeChatId, streaming } = useAiAssistantContext()
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    setDraft('')
  }, [chatKey])

  useEffect(() => {
    if (!panelOpen) {
      return
    }
    inputRef.current?.focus()
  }, [panelOpen, chatKey])

  const busy = streaming.isBusy
  const trimmedDraft = draft.trim()
  const canSend = !busy && trimmedDraft.length > 0

  const handleSubmit = useCallback((): void => {
    if (!canSend) {
      return
    }
    const text = draft.trim()
    setDraft('')
    void streaming.submit(activeChatId, text)
  }, [activeChatId, canSend, draft, streaming])

  const handleShellKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' || !(event.ctrlKey || event.metaKey)) {
      return
    }
    event.preventDefault()
    handleSubmit()
  }, [handleSubmit])

  const handleAbort = useCallback((): void => {
    streaming.abort()
  }, [streaming])

  return (
    <AiAssistantComposerShell onKeyDown={handleShellKeyDown}>
      <AiAssistantComposerDraftField
        inputRef={inputRef}
        multiline
        maxRows={10}
        minRows={1}
        variant="standard"
        placeholder="Type your message..."
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        InputProps={{ disableUnderline: true }}
      />
      {busy
        ? (
          <SendStopButton
            variant="contained"
            aria-label="Stop generation"
            onClick={handleAbort}
          >
            <StopIcon />
          </SendStopButton>
        )
        : (
          <SendStopButton
            variant="contained"
            aria-label="Send message"
            onClick={handleSubmit}
          >
            <SendIcon />
          </SendStopButton>
        )}
    </AiAssistantComposerShell>
  )
})

AiAssistantComposer.displayName = 'AiAssistantComposer'

const AiAssistantComposerShell = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-end',
  gap: theme.spacing(1),
  margin: theme.spacing(3),
  padding: theme.spacing(1.25, 1.25, 1.25, 2),
  borderRadius: 30,
  boxSizing: 'border-box',
  border: `1px solid ${theme.palette.divider}`,
  '&:focus-within': {
    boxShadow: `0 0 0 2px ${theme.palette.primary.main}`,
  },
}))

AiAssistantComposerShell.displayName = 'AiAssistantComposerShell'

const AiAssistantComposerDraftField = styled(TextField)(({ theme }) => ({
  flex: '1 1 0',
  margin: 0,
  '& .MuiInputBase-input::-webkit-scrollbar': {
    width: theme.spacing(0.5),
  },
  '& .MuiInputBase-input::-webkit-scrollbar-thumb': {
    cursor: 'default',
  },
}))

AiAssistantComposerDraftField.displayName = 'AiAssistantComposerDraftField'

const SendStopButton = styled(Button)(({ theme }) => ({
  minWidth: 0,
  width: theme.spacing(5),
  height: theme.spacing(5),
  padding: 0,
  borderRadius: '50%',
}))

SendStopButton.displayName = 'SendStopButton'
