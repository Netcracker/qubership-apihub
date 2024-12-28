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
import { memo, useState } from 'react'
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  ListItem,
  TextField,
} from '@mui/material'
import { Controller, useForm } from 'react-hook-form'
import { SHOW_CREATE_BRANCH_DIALOG } from '../../../../../EventBusProvider'
import { useBranchSearchParam } from '../../../../useBranchSearchParam'
import { useCreateBranch } from './useCreateBranch'
import { LoadingButton } from '@mui/lab'
import { useBranches, useIsBranchExists } from '../../../../useBranches'
import type { PopupProps } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { PopupDelegate } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'

export const CreateBranchDialog: FC = memo(() => {
  return (
    <PopupDelegate
      type={SHOW_CREATE_BRANCH_DIALOG}
      render={props => <CreateBranchPopup {...props}/>}
    />
  )
})

const CreateBranchPopup: FC<PopupProps> = memo<PopupProps>(({ open, setOpen }) => {
  const [selectedBranch] = useBranchSearchParam()

  const { handleSubmit, control, watch, formState: { errors } } = useForm<CreateBranchInfo>({
    defaultValues: {
      currentBranchName: selectedBranch,
      newBranchName: '',
    },
  })
  const isNewBranchAlreadyExists = useIsBranchExists(watch().newBranchName)

  const branches = useBranches(watch().currentBranchName)
  const [createBranch, isLoading] = useCreateBranch()
  const [withPublish, setWithPublish] = useState(false)

  return (
    <Dialog open={open} onClose={() => setOpen(false)}>
      <Box
        component="form"
        onSubmit={
          handleSubmit(({ currentBranchName, newBranchName }) => {
            createBranch({ currentBranchName, newBranchName, withPublish })
            setOpen(false)
          })
        }
      >
        <DialogTitle>
          Create New Branch
        </DialogTitle>

        <DialogContent>
          <Controller
            name="currentBranchName"
            control={control}
            render={({ field: { value, onChange } }) => <Autocomplete
              value={value}
              options={branches.map(({ name }) => name)}
              renderOption={(props, name) => <ListItem {...props} key={name}>{name}</ListItem>}
              renderInput={params => <TextField {...params} onChange={onChange} required label="Current branch"/>}
              onChange={(_, value) => onChange(value)}
            />}
          />
          <Controller
            name="newBranchName"
            control={control}
            rules={{
              validate: {
                alreadyExists: () => !isNewBranchAlreadyExists || 'Branch already exists',
                checkSpaces: (newBranch) => {
                  return /^[a-z0-9]([/\-a-z0-9_|-|.|#]*[a-z0-9])?$/ig.test(newBranch) ||
                    'Branch name must contain only letters, numbers and these symbols (/, -, _, ., #), the name cannot end with a symbols'
                },
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
          <FormControlLabel
            label="Create snapshot"
            control={<Checkbox onChange={(_, checked) => setWithPublish(checked)}/>}
          />
        </DialogContent>
        <DialogActions>
          <LoadingButton variant="contained" type="submit" loading={isLoading}>
            Create
          </LoadingButton>
          <Button variant="outlined" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
})

type CreateBranchInfo = {
  currentBranchName: string
  newBranchName: string
}
