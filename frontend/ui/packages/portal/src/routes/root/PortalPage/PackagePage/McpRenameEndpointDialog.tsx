import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import { Button, DialogActions, DialogContent, DialogTitle, IconButton, InputAdornment, styled } from '@mui/material'
import { type FC, memo, useCallback, useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { ErrorTextField } from '@portal/components/ErrorTextField'
import { DialogForm } from '@netcracker/qubership-apihub-ui-shared/components/DialogForm'
import { PopupDelegate, type PopupProps } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'

export const McpRenameEndpointDialog: FC = memo(() => {
  return (
    <PopupDelegate
      type={SHOW_MCP_RENAME_ENDPOINT_DIALOG}
      render={props => <McpRenameEndpointPopup {...props} />}
    />
  )
})

McpRenameEndpointDialog.displayName = 'McpRenameEndpointDialog'

export const SHOW_MCP_RENAME_ENDPOINT_DIALOG = 'show-mcp-rename-endpoint-dialog'

export type ShowMcpRenameEndpointDetail = Readonly<{
  mcpEndpoint: string
  knownEndpoints: ReadonlyArray<string>
  onConfirm: (newEndpoint: string) => void
  onCancel: () => void
}>

type McpRenameEndpointFormData = Readonly<{
  mcpEndpoint: string
}>

const MCP_ENDPOINT_INPUT_PREFIX = 'MCP Endpoint: '

const McpRenameEndpointPopup: FC<PopupProps> = memo<PopupProps>(({ open, setOpen, detail }) => {
  const {
    mcpEndpoint,
    knownEndpoints,
    onConfirm,
    onCancel,
  } = detail as ShowMcpRenameEndpointDetail

  const [isFocused, setIsFocused] = useState(false)

  const { control, handleSubmit, reset, formState: { isValid } } = useForm<McpRenameEndpointFormData>({
    defaultValues: { mcpEndpoint },
    mode: 'onChange',
  })

  useEffect(() => {
    if (open) {
      reset({ mcpEndpoint })
      setIsFocused(false)
    }
  }, [open, mcpEndpoint, reset])

  const onClose = useCallback((): void => {
    setOpen(false)
    onCancel()
  }, [setOpen, onCancel])

  const onConfirmCallback = useCallback((data: McpRenameEndpointFormData): void => {
    const endpoint = data.mcpEndpoint.trim()
    if (endpoint === '') {
      return
    }
    setOpen(false)
    onConfirm(endpoint)
  }, [setOpen, onConfirm])

  const validateMcpEndpoint = useCallback((value: string): boolean | string => {
    const endpoint = value.trim()
    if (endpoint === '') {
      return false
    }
    const otherEndpoints = knownEndpoints.filter(endpointItem => endpointItem !== mcpEndpoint)
    if (otherEndpoints.includes(endpoint)) {
      return 'This MCP endpoint already exists'
    }
    return true
  }, [knownEndpoints, mcpEndpoint])

  return (
    <DialogForm
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit(onConfirmCallback)}
      width="440px"
    >
      <StyledDialogTitle>
        Edit URL
        <CloseDialogButton onClick={onClose}>
          <CloseOutlinedIcon fontSize="small" />
        </CloseDialogButton>
      </StyledDialogTitle>

      <StyledDialogContent>
        <Controller
          name="mcpEndpoint"
          control={control}
          rules={{ validate: validateMcpEndpoint }}
          render={({ field, fieldState }) => {
            const showPrefix = isFocused || field.value !== ''
            return (
              <ErrorTextField
                field={field}
                fieldState={fieldState}
                fullWidth
                label="URL"
                helperText={fieldState.error?.message || ' '}
                data-testid="McpRenameEndpointInput"
                onFocus={() => setIsFocused(true)}
                onBlur={() => {
                  setIsFocused(false)
                  field.onBlur()
                }}
                InputProps={{
                  startAdornment: showPrefix
                    ? (
                      <InputAdornment position="start">
                        <PrefixText>
                          {MCP_ENDPOINT_INPUT_PREFIX}
                        </PrefixText>
                      </InputAdornment>
                    )
                    : undefined,
                }}
              />
            )
          }}
        />
      </StyledDialogContent>

      <StyledDialogActions>
        <Button
          variant="contained"
          type="submit"
          disabled={!isValid}
          data-testid="SaveButton"
        >
          Save
        </Button>
        <Button
          variant="outlined"
          type="button"
          onClick={onClose}
          data-testid="CancelButton"
        >
          Cancel
        </Button>
      </StyledDialogActions>
    </DialogForm>
  )
})
McpRenameEndpointPopup.displayName = 'McpRenameEndpointPopup'

const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  color: theme.palette.text.primary,
}))

const StyledDialogContent = styled(DialogContent)({
  width: 'inherit',
  minWidth: 'unset',
  lineHeight: 'normal',
})

// Compensates for the always-reserved helper-text line (theme DialogActions paddingTop is 24).
const StyledDialogActions = styled(DialogActions)({
  paddingTop: 0,
})

const CloseDialogButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  right: 8,
  top: 8,
  color: theme.palette.text.secondary,
}))

const PrefixText = styled('span')(({ theme }) => ({
  color: theme.palette.text.secondary,
  whiteSpace: 'nowrap',
}))
