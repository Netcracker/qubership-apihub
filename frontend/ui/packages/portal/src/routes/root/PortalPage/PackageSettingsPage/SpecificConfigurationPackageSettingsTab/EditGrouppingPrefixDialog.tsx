/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { FC } from 'react'
import * as React from 'react'
import { memo, useCallback, useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Button, Checkbox, DialogActions, DialogContent, DialogTitle, FormControlLabel, TextField } from '@mui/material'
import { LoadingButton } from '@mui/lab'
import { useRecalculatePackageVersionGroups, useUpdatePackage } from '../../../usePackage'
import type { PopupProps } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { PopupDelegate } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import type { ShowEditPackagePrefixDetail } from '@apihub/routes/EventBusProvider'
import { SHOW_EDIT_PACKAGE_PREFIX_DIALOG } from '@apihub/routes/EventBusProvider'
import type { Package } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { DialogForm } from '@netcracker/qubership-apihub-ui-shared/components/DialogForm'

export const EditGrouppingPrefixDialog: FC = memo(() => {
  return (
    <PopupDelegate
      type={SHOW_EDIT_PACKAGE_PREFIX_DIALOG}
      render={props => <EditPrefixDialogPopup {...props}/>}
    />
  )
})

const EditPrefixDialogPopup: FC<PopupProps> = memo<PopupProps>(({ open, setOpen, detail }) => {
  const { packageKey } = detail as ShowEditPackagePrefixDetail
  const [updatePackage, isUpdateLoading, isSuccess] = useUpdatePackage()
  const [recalculatePackageVersionGroups] = useRecalculatePackageVersionGroups()
  useEffect(() => {isSuccess && setOpen(false)}, [isSuccess, setOpen])

  const defaultValues = useMemo(() => ({
    restGroupingPrefix: '',
    recalculate: false,
  }), [])

  const { handleSubmit, control, formState: { errors }, watch } = useForm<FormData>({ defaultValues })
  const { recalculate } = watch()

  useEffect(() => {isSuccess && packageKey && recalculate && recalculatePackageVersionGroups(packageKey)}, [isSuccess, packageKey, recalculate, recalculatePackageVersionGroups, setOpen])

  const onSubmit = useCallback(({ restGroupingPrefix }: FormData) => {
    updatePackage({
      packageKey: packageKey!,
      value: { restGroupingPrefix: restGroupingPrefix } as Package,
    })
  }, [packageKey, updatePackage])

  return (
    <DialogForm
      open={open}
      onClose={() => setOpen(false)}
      onSubmit={handleSubmit(onSubmit)}
    >
      <DialogTitle>
        Edit REST Grouping Prefix
      </DialogTitle>

      <DialogContent>
        <Controller
          name="restGroupingPrefix"
          control={control}
          rules={{
            pattern: {
              value: /^\/.*{group}.*\/$/,
              message: 'The value must begin and end with a "/" character and contain the {group} keyword, for example /api/{group}/.',
            },
          }}
          render={({ field }) => (
            <TextField
              {...field}
              placeholder="/api/{group}/"
              inputProps={{
                style: {
                  paddingTop: '12px',
                  paddingBottom: '12px',
                },
              }}
              error={!!errors.restGroupingPrefix}
              helperText={errors.restGroupingPrefix?.message}
              data-testid="PrefixTextField"
            />
          )}
        />

        <Controller
          name="recalculate"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              {...field}
              control={<Checkbox data-testid="RecalculateCheckbox"/>}
              label="Recalculate groups in all published versions"
            />
          )}
        />
      </DialogContent>

      <DialogActions>
        <LoadingButton variant="contained" type="submit" loading={isUpdateLoading} data-testid="SaveButton">
          Save
        </LoadingButton>
        <Button variant="outlined" onClick={() => setOpen(false)} data-testid="CancelButton">
          Cancel
        </Button>
      </DialogActions>
    </DialogForm>
  )
})

export type FormData = {
  restGroupingPrefix: string
  recalculate: boolean
}
