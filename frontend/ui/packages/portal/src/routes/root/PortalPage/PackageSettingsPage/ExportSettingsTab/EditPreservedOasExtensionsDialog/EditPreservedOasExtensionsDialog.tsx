import React, { type FC, memo, useCallback, useEffect, useState } from 'react'
import { Controller } from 'react-hook-form'
import { Button, DialogActions, DialogContent, DialogTitle } from '@mui/material'
import { LoadingButton } from '@mui/lab'
import { useUpdateAllowedOasExtensions } from '../useAllowedOasExtensions'
import { PopupDelegate, type PopupProps } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import {
  SHOW_EDIT_PRESERVED_OAS_EXTENSIONS_DIALOG,
  type ShowEditPreservedOasExtensionsDetail,
} from '@apihub/routes/EventBusProvider'
import { DialogForm } from '@netcracker/qubership-apihub-ui-shared/components/DialogForm'
import { OAS_EXTENSION_KIND_INHERITED } from '../package-export-config'
import { type EditOasExtensionsForm, useOasExtensionsManager } from './useOasExtensionsManager'
import { OasExtensionsAutocomplete } from './OasExtensionsAutocomplete'

export const EditPreservedOasExtensionsDialog: FC = memo(() => {
  return (
    <PopupDelegate
      type={SHOW_EDIT_PRESERVED_OAS_EXTENSIONS_DIALOG}
      render={(props): React.ReactElement => <EditPreservedOasExtensionsDialogPopup {...props} />}
    />
  )
})

EditPreservedOasExtensionsDialog.displayName = 'EditPreservedOasExtensionsDialog'

const EditPreservedOasExtensionsDialogPopup: FC<PopupProps> = memo(({ open, setOpen, detail }) => {
  const typedDetail = detail as ShowEditPreservedOasExtensionsDetail
  const { packageKey, oasExtensions } = typedDetail

  const {
    updateOasExtensions,
    isOasExtensionsUpdating,
    isOasExtensionsUpdatingSuccess,
  } = useUpdateAllowedOasExtensions()

  const [isFocused, setIsFocused] = useState(false)
  const [isInputText, setIsInputText] = useState(false)
  const [duplicateErrorText, setDuplicateErrorText] = useState<string | undefined>(undefined)

  useEffect((): void => {
    if (isOasExtensionsUpdatingSuccess) {
      setOpen(false)
    }
  }, [isOasExtensionsUpdatingSuccess, setOpen])

  const {
    control,
    handleSubmit,
    setValue,
    processExtensionsUpdate,
  } = useOasExtensionsManager(oasExtensions)

  const handleSaveExtensions = useCallback((formData: EditOasExtensionsForm): void => {
    if (!formData.oasExtensions || !packageKey) {
      return
    }

    const directExtensions = formData.oasExtensions.filter(ext => ext.kind !== OAS_EXTENSION_KIND_INHERITED)
    updateOasExtensions(packageKey, directExtensions)
  }, [packageKey, updateOasExtensions])

  const handleCloseDialog = useCallback((): void => setOpen(false), [setOpen])

  return (
    <DialogForm
      open={open}
      onClose={handleCloseDialog}
      onSubmit={handleSubmit(handleSaveExtensions)}
    >
      <DialogTitle>
        Edit List of OAS Extensions Preserved on Export
      </DialogTitle>

      <DialogContent>
        <Controller
          name="oasExtensions"
          control={control}
          render={({ field }): React.ReactElement => (
            <OasExtensionsAutocomplete
              value={field.value || []}
              onChange={(newValue) => setValue('oasExtensions', newValue)}
              processExtensionsUpdate={processExtensionsUpdate}
              isFocused={isFocused}
              setIsFocused={setIsFocused}
              isInputText={isInputText}
              setIsInputText={setIsInputText}
              duplicateErrorText={duplicateErrorText}
              setDuplicateErrorText={setDuplicateErrorText}
            />
          )}
        />
      </DialogContent>

      <DialogActions>
        <LoadingButton variant="contained" type="submit" loading={isOasExtensionsUpdating} data-testid="SaveButton">
          Save
        </LoadingButton>
        <Button variant="outlined" onClick={handleCloseDialog} data-testid="CancelButton">
          Cancel
        </Button>
      </DialogActions>
    </DialogForm>
  )
})
