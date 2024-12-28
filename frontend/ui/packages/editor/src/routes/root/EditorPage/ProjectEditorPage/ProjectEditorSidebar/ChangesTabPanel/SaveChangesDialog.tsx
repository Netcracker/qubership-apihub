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
import { memo, useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Checkbox,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  TextField,
  Typography,
} from '@mui/material'
import { useEvent } from 'react-use'
import type { SaveChangesDialogDetail } from '../../../../../EventBusProvider'
import { SHOW_SAVE_CHANGES_DIALOG } from '../../../../../EventBusProvider'
import { Controller, useForm } from 'react-hook-form'
import { LoadingButton } from '@mui/lab'
import { useConnectedUsers } from '../../BranchEditingWebSocketProvider'
import type { SaveChangesDetail } from '../../useSaveChanges'
import { useSaveChanges } from '../../useSaveChanges'
import { useIsBranchExists } from '../../../../useBranches'
import { DialogForm } from '@netcracker/qubership-apihub-ui-shared/components/DialogForm'

export const SaveChangesDialog: FC = memo(() => {
  const [open, setOpen] = useState(false)
  const [saveToNewBranch, setSaveToNewBranch] = useState(false)

  useEvent(SHOW_SAVE_CHANGES_DIALOG, ({ detail }: CustomEvent<SaveChangesDialogDetail>) => {
    setSaveToNewBranch(detail?.saveToNewBranch)
    setOpen(true)
  })

  const { handleSubmit, control, reset, watch, formState: { errors } } = useForm<SaveChangesDetail>({
    defaultValues: {
      newBranchName: '',
      createMergeRequest: false,
      message: '',
    },
  })
  const [saveChanges, isLoading] = useSaveChanges()

  const users = useConnectedUsers()
  const isNewBranchAlreadyExists = useIsBranchExists(watch().newBranchName)

  useEffect(() => {!isLoading && setOpen(false)}, [isLoading])
  useEffect(() => {!open && reset()}, [open, reset])

  return (
    <DialogForm
      open={open}
      onClose={() => setOpen(false)}
      onSubmit={handleSubmit(saveChanges)}
    >
      <DialogTitle>
        Save
      </DialogTitle>

      <DialogContent sx={{ width: 440 }}>
        {
          users.length > 1 && <Alert
            sx={{ mb: 1 }}
            severity="warning"
          >
            Other users are editing the branch. All changes will be saved.
          </Alert>
        }
        {
          saveToNewBranch && <>
            <Typography variant="subtitle1">
              Branch name
            </Typography>
            <Controller
              name="newBranchName"
              control={control}
              rules={{
                validate: {
                  alreadyExists: () => !isNewBranchAlreadyExists || 'Branch already exists',
                },
              }}
              render={({ field }) => <TextField
                {...field}
                required
                label="New branch"
                error={!!errors.newBranchName}
                helperText={errors.newBranchName?.message}
              />}
            />
            <Controller
              name="createMergeRequest"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  {...field}
                  control={<Checkbox/>}
                  label="Create merge request"
                />
              )}
            />
          </>
        }
        <Typography variant="subtitle1">
          Commit message
        </Typography>
        <Controller
          name="message"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              multiline required
              autoComplete="on"
              rows="4"
              type="text"
              label="Message"
            />
          )}
        />
      </DialogContent>

      <DialogActions>
        <LoadingButton variant="contained" type="submit" loading={isLoading}>
          Add
        </LoadingButton>
        <Button variant="outlined" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </DialogActions>
    </DialogForm>
  )
})
