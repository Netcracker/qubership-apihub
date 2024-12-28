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
import { memo, useEffect, useMemo } from 'react'
import { Box, Button, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography } from '@mui/material'

import type { CreateFileDialogDetail } from '../../../../../../EventBusProvider'
import { SHOW_CREATE_FILE_DIALOG } from '../../../../../../EventBusProvider'
import { LoadingButton } from '@mui/lab'
import { Controller, useForm } from 'react-hook-form'
import type { FileCandidate } from './useCreateProjectFile'
import { useCreateProjectFile } from './useCreateProjectFile'
import type { PopupProps } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { PopupDelegate } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import {
  GRAPHQL_FILE_EXTENSION,
  JSON_FILE_EXTENSION,
  MD_FILE_EXTENSION,
  YAML_FILE_EXTENSION,
} from '@netcracker/qubership-apihub-ui-shared/utils/files'
import { DialogForm } from '@netcracker/qubership-apihub-ui-shared/components/DialogForm'
import { FILENAME_VALIDATION_RULES } from '@netcracker/qubership-apihub-ui-shared/utils/validations'
import {
  GRAPHQL_SPEC_TYPE,
  JSON_SCHEMA_SPEC_TYPE,
  OPENAPI_2_0_SPEC_TYPE,
  OPENAPI_3_0_SPEC_TYPE,
  OPENAPI_3_1_SPEC_TYPE, UNKNOWN_SPEC_TYPE,
} from '@netcracker/qubership-apihub-ui-shared/utils/specs'

export const CreateFileDialog: FC = memo(() => {
  return (
    <PopupDelegate
      type={SHOW_CREATE_FILE_DIALOG}
      render={props => <CreateFilePopup {...props}/>}
    />
  )
})

const CreateFilePopup: FC<PopupProps> = memo<PopupProps>(({ open, setOpen, detail }) => {
  const path = useMemo(() => {
    if (!detail) {
      return undefined
    }
    return (detail as CreateFileDialogDetail).path
  }, [detail])

  const { handleSubmit, control, watch, reset, formState: { errors } } = useForm<FileCandidate>({
    defaultValues: {
      extension: YAML_FILE_EXTENSION,
    },
  })

  const openApiTypeAvailable = [YAML_FILE_EXTENSION, JSON_FILE_EXTENSION].includes(watch().extension)
  const graphQlTypeAvailable = watch().extension === GRAPHQL_FILE_EXTENSION

  const [createProjectFile, isLoading, isSuccess] = useCreateProjectFile()

  useEffect(() => {isSuccess && setOpen(false)}, [isSuccess, setOpen])
  useEffect(() => {!open && reset()}, [open, reset])

  return (
    <DialogForm
      open={open}
      onClose={() => setOpen(false)}
      onSubmit={handleSubmit(createProjectFile)}
    >
      <DialogTitle>
        Create New File
      </DialogTitle>

      <DialogContent>
        <Box display="grid" gridTemplateColumns="5fr 2fr" gap={1}>
          <Controller
            name="name"
            control={control}
            defaultValue="New File"
            rules={{ validate: FILENAME_VALIDATION_RULES }}
            render={({ field }) => (
              <TextField
                {...field}
                autoFocus required
                type="text"
                label="Name"
                error={!!errors.name}
                helperText={errors.name?.message}
              />
            )}
          />
          <Controller
            name="extension"
            control={control}
            defaultValue={YAML_FILE_EXTENSION}
            render={({ field }) => (
              <TextField
                {...field}
                select required
                type="select"
                label="Extension"
              >
                <MenuItem value={YAML_FILE_EXTENSION}>{YAML_FILE_EXTENSION}</MenuItem>
                <MenuItem value={JSON_FILE_EXTENSION}>{JSON_FILE_EXTENSION}</MenuItem>
                <MenuItem value={GRAPHQL_FILE_EXTENSION}>{GRAPHQL_FILE_EXTENSION}</MenuItem>
                <MenuItem value={MD_FILE_EXTENSION}>{MD_FILE_EXTENSION}</MenuItem>
              </TextField>
            )}
          />
        </Box>
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              value={field.value ?? ''}
              select required
              type="select"
              label="Type"
            >
              {openApiTypeAvailable && <MenuItem value={OPENAPI_3_1_SPEC_TYPE}>OpenApi 3.1</MenuItem>}
              {openApiTypeAvailable && <MenuItem value={OPENAPI_3_0_SPEC_TYPE}>OpenApi 3.0</MenuItem>}
              {openApiTypeAvailable && <MenuItem value={OPENAPI_2_0_SPEC_TYPE}>OpenApi 2.0</MenuItem>}
              {openApiTypeAvailable && <MenuItem value={JSON_SCHEMA_SPEC_TYPE}>JSON Schema</MenuItem>}
              {graphQlTypeAvailable && <MenuItem value={GRAPHQL_SPEC_TYPE}>GraphQL</MenuItem>}
              {!openApiTypeAvailable && !graphQlTypeAvailable && <MenuItem value={UNKNOWN_SPEC_TYPE}>Custom</MenuItem>}
            </TextField>
          )}
        />
        <Typography variant="button">Enter the GIT folder where you want to upload files</Typography>
        <Controller
          name="path"
          control={control}
          defaultValue={path}
          render={({ field }) => <TextField {...field} label="Folder"/>}
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
    </DialogForm>
  )
})
