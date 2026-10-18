import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import {
  Autocomplete,
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  styled,
  TextField,
} from '@mui/material'
import { type FC, memo, useCallback, useEffect, useMemo } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'

import { AlertCustom } from '@netcracker/qubership-apihub-ui-shared/components/AlertCustom'
import { DialogForm } from '@netcracker/qubership-apihub-ui-shared/components/DialogForm'
import { PopupDelegate, type PopupProps } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import type { TestableProps } from '@netcracker/qubership-apihub-ui-shared/components/Testable'
import { ALERT_SEVERITY } from '@netcracker/qubership-apihub-ui-shared/themes/alert'
import { type McpDocumentType } from '@netcracker/qubership-apihub-ui-shared/utils/specs'

import type { McpStagedFileMeta } from '@portal/routes/root/PortalPage/PackagePage/mcpPublish'
import { formatMcpEndpointReplaceStagedFileAlertMessage } from '@portal/routes/root/PortalPage/PackagePage/mcpValidation'

export const McpEndpointDialog: FC = memo(() => {
  return (
    <PopupDelegate
      type={SHOW_MCP_ENDPOINT_DIALOG}
      render={props => <McpEndpointPopup {...props} />}
    />
  )
})

McpEndpointDialog.displayName = 'McpEndpointDialog'

export const SHOW_MCP_ENDPOINT_DIALOG = 'show-mcp-endpoint-dialog'

export type ShowMcpEndpointDetail = Readonly<{
  file: File
  documentType: McpDocumentType
  knownEndpoints: ReadonlyArray<string>
  defaultEndpoint?: string
  uploadDocumentTypes: ReadonlyArray<McpDocumentType>
  stagedMcpFileMetaByName: ReadonlyMap<string, McpStagedFileMeta>
  onConfirm: (mcpEndpoint: string) => void
  onCancel: () => void
}>

type McpEndpointFormData = Readonly<{
  mcpEndpoint: string
}>

const McpEndpointPopup: FC<PopupProps> = memo<PopupProps>(({ open, setOpen, detail }) => {
  const {
    knownEndpoints,
    defaultEndpoint,
    uploadDocumentTypes,
    stagedMcpFileMetaByName,
    onConfirm,
    onCancel,
  } = detail as ShowMcpEndpointDetail

  const hasKnownEndpoints = knownEndpoints.length > 0

  const { control, handleSubmit, reset, formState: { isValid } } = useForm<McpEndpointFormData>({
    defaultValues: { mcpEndpoint: '' },
    mode: 'onChange',
  })

  const selectedEndpoint = useWatch({ control: control, name: 'mcpEndpoint' })

  const replaceStagedFileAlertMessage = useMemo(
    () =>
      formatMcpEndpointReplaceStagedFileAlertMessage(
        selectedEndpoint,
        uploadDocumentTypes,
        stagedMcpFileMetaByName,
      ),
    [selectedEndpoint, uploadDocumentTypes, stagedMcpFileMetaByName],
  )

  useEffect(() => {
    if (open) {
      reset({ mcpEndpoint: defaultEndpoint ?? '' })
    }
  }, [open, defaultEndpoint, reset])

  const onClose = useCallback((): void => {
    setOpen(false)
    onCancel()
  }, [setOpen, onCancel])

  const onConfirmCallback = useCallback((data: McpEndpointFormData): void => {
    const endpoint = data.mcpEndpoint.trim()
    if (endpoint === '') {
      return
    }
    setOpen(false)
    onConfirm(endpoint)
  }, [setOpen, onConfirm])

  return (
    <DialogForm
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit(onConfirmCallback)}
      width="440px"
    >
      <DialogTitle>
        MCP Endpoint
        <CloseDialogButton onClick={onClose}>
          <CloseOutlinedIcon fontSize="small" />
        </CloseDialogButton>
      </DialogTitle>

      <DialogContent sx={{ width: 'inherit' }}>
        <EndpointFieldStack>
          {hasKnownEndpoints
            ? (
              <Controller
                name="mcpEndpoint"
                control={control}
                rules={{ validate: value => value.trim() !== '' }}
                render={({ field: { onChange, value } }) => (
                  <McpEndpointAutocomplete
                    value={value}
                    onChange={onChange}
                    knownEndpoints={knownEndpoints}
                    data-testid="McpEndpointSelect"
                  />
                )}
              />
            )
            : (
              <Controller
                name="mcpEndpoint"
                control={control}
                rules={{ required: true, validate: value => value.trim() !== '' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="MCP Endpoint*"
                    placeholder="/mcp/example"
                    fullWidth
                    data-testid="McpEndpointInput"
                  />
                )}
              />
            )}
          {replaceStagedFileAlertMessage !== '' && (
            <AlertCustom
              severity={ALERT_SEVERITY.WARNING}
              message={replaceStagedFileAlertMessage}
            />
          )}
        </EndpointFieldStack>
      </DialogContent>

      <DialogActions>
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
      </DialogActions>
    </DialogForm>
  )
})
McpEndpointPopup.displayName = 'McpEndpointPopup'

type McpEndpointAutocompleteProps =
  & TestableProps
  & Readonly<{
    value: string
    onChange: (value: string) => void
    knownEndpoints: ReadonlyArray<string>
  }>

const McpEndpointAutocomplete: FC<McpEndpointAutocompleteProps> = memo(({
  value,
  onChange,
  knownEndpoints,
  'data-testid': dataTestId,
}) => {
  const handleChange = useCallback((_: unknown, newValue: string | null) => {
    onChange(newValue ?? '')
  }, [onChange])

  const handleInputChange = useCallback((_: unknown, newInputValue: string) => {
    onChange(newInputValue)
  }, [onChange])

  return (
    <Autocomplete
      freeSolo
      forcePopupIcon
      options={[...knownEndpoints]}
      value={value}
      onChange={handleChange}
      onInputChange={handleInputChange}
      popupIcon={<ArrowDropDownIcon />}
      renderInput={params => (
        <TextField
          {...params}
          label="MCP Endpoint*"
          placeholder="/mcp/example"
          data-testid={dataTestId}
        />
      )}
    />
  )
})

McpEndpointAutocomplete.displayName = 'McpEndpointAutocomplete'

const CloseDialogButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  right: 8,
  top: 8,
  color: theme.palette.text.secondary,
}))

const EndpointFieldStack = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
})
