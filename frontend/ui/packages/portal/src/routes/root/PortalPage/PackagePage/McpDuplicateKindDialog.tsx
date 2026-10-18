import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import { Button, DialogActions, DialogContent, DialogTitle, IconButton, styled, Typography } from '@mui/material'
import { type FC, memo, useCallback } from 'react'

import { DialogForm } from '@netcracker/qubership-apihub-ui-shared/components/DialogForm'
import type { PopupProps } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { PopupDelegate } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'

export const SHOW_MCP_DUPLICATE_KIND_DIALOG = 'show-mcp-duplicate-kind-dialog'

const DUPLICATE_KIND_MESSAGE = 'You are trying to upload several artifacts of the same type into one MCP endpoint. ' +
  'Each MCP endpoint allows only one artifact per type: Overview, Tools, Resources and Prompts. ' +
  'Please upload artifacts for one MCP endpoint at a time.'

export const McpDuplicateKindDialog: FC = memo(() => {
  return (
    <PopupDelegate
      type={SHOW_MCP_DUPLICATE_KIND_DIALOG}
      render={props => <McpDuplicateKindPopup {...props} />}
    />
  )
})

McpDuplicateKindDialog.displayName = 'McpDuplicateKindDialog'

export type ShowMcpDuplicateKindDetail = Readonly<{
  onDismiss: () => void
}>

const McpDuplicateKindPopup: FC<PopupProps> = memo<PopupProps>(({ open, setOpen, detail }) => {
  const { onDismiss } = detail as ShowMcpDuplicateKindDetail

  const onClose = useCallback((): void => {
    setOpen(false)
    onDismiss()
  }, [setOpen, onDismiss])

  return (
    <DialogForm
      open={open}
      onClose={onClose}
      width="440px"
    >
      <DialogTitle>
        Duplicate MCP Artifact Type
        <CloseDialogButton onClick={onClose} data-testid="CloseButton">
          <CloseOutlinedIcon fontSize="small" />
        </CloseDialogButton>
      </DialogTitle>

      <DialogContent sx={{ width: 'inherit' }}>
        <Typography variant="body2">
          {DUPLICATE_KIND_MESSAGE}
        </Typography>
      </DialogContent>

      <DialogActions>
        <Button
          variant="contained"
          color="error"
          onClick={onClose}
          data-testid="OkButton"
        >
          Ok
        </Button>
      </DialogActions>
    </DialogForm>
  )
})

McpDuplicateKindPopup.displayName = 'McpDuplicateKindPopup'

const CloseDialogButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  right: 8,
  top: 8,
  color: theme.palette.text.secondary,
}))
