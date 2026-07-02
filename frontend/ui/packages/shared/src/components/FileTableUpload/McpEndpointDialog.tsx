import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import {
  Autocomplete,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  styled,
  TextField,
} from '@mui/material'
import { type FC, memo, useCallback, useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { type McpDocumentType } from '../../utils/specs'
import { DialogForm } from '../DialogForm'
import type { PopupProps } from '../PopupDelegate'
import { PopupDelegate } from '../PopupDelegate'
import type { TestableProps } from '../Testable'

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
  onConfirm: (mcpEndpoint: string) => void
  onCancel: () => void
}>

type McpEndpointFormData = Readonly<{
  mcpEndpoint: string
}>

const McpEndpointPopup: FC<PopupProps> = memo<PopupProps>(({ open, setOpen, detail }) => {
  const { knownEndpoints, defaultEndpoint, onConfirm, onCancel } = useMemo(() => {
    const {
      knownEndpoints,
      defaultEndpoint,
      onConfirm,
      onCancel,
    } = detail as ShowMcpEndpointDetail
    return {
      knownEndpoints: knownEndpoints,
      defaultEndpoint: defaultEndpoint,
      onConfirm: onConfirm,
      onCancel: onCancel,
    }
  }, [detail])

  const hasKnownEndpoints = knownEndpoints.length > 0

  const { control, getValues, reset, formState: { isValid } } = useForm<McpEndpointFormData>({
    defaultValues: { mcpEndpoint: '' },
    mode: 'onChange',
  })

  useEffect(() => {
    if (open) {
      reset({ mcpEndpoint: defaultEndpoint ?? '' })
    }
  }, [open, defaultEndpoint, reset])

  const onClose = useCallback((): void => {
    setOpen(false)
    onCancel()
  }, [setOpen, onCancel])

  const onConfirmCallback = useCallback((): void => {
    const endpoint = getValues().mcpEndpoint.trim()
    if (endpoint === '') {
      return
    }
    setOpen(false)
    onConfirm(endpoint)
  }, [setOpen, onConfirm, getValues])

  return (
    <DialogForm
      open={open}
      onClose={onClose}
      width="440px"
    >
      <DialogTitle>
        MCP Endpoint
        <CloseDialogButton onClick={onClose}>
          <CloseOutlinedIcon fontSize="small" />
        </CloseDialogButton>
      </DialogTitle>

      <DialogContent sx={{ width: 'inherit' }}>
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
      </DialogContent>

      <DialogActions>
        <Button
          variant="contained"
          onClick={onConfirmCallback}
          disabled={!isValid}
          data-testid="SaveButton"
        >
          Save
        </Button>
        <Button
          variant="outlined"
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
