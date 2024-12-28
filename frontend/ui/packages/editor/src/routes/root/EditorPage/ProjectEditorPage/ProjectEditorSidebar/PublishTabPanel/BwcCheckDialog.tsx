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
import { memo, useEffect, useState } from 'react'
import {
  Autocomplete,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  ListItem,
  ListItemText,
  TextField,
} from '@mui/material'
import { useEvent } from 'react-use'
import { SHOW_BWC_CHECK_DIALOG } from '../../../../../EventBusProvider'

import { useBwcVersionKey, useSetBwcVersionKey } from '../../BwcVersionKeyProvider'
import { NO_PREVIOUS_RELEASE_VERSION_OPTION, usePreviousVersionOptions } from '../../usePreviousVersionOptions'
import type { VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { DialogForm } from '@netcracker/qubership-apihub-ui-shared/components/DialogForm'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'

export const BwcCheckDialog: FC = memo(() => {
  const [open, setOpen] = useState(false)
  useEvent(SHOW_BWC_CHECK_DIALOG, () => setOpen(true))

  const versions = usePreviousVersionOptions()

  const bwcVersionKey = useBwcVersionKey()
  const setBwcVersionKey = useSetBwcVersionKey()
  const [selectedPreviousVersion, setSelectedPreviousVersion] = useState<VersionKey | undefined>(() => bwcVersionKey)
  useEffect(() => {bwcVersionKey && setSelectedPreviousVersion(bwcVersionKey)}, [bwcVersionKey])

  return (
    <DialogForm
      open={open}
      onClose={() => setOpen(false)}
    >
      <DialogTitle>
        Check Backward Compatibility
      </DialogTitle>

      <DialogContent sx={{ width: 440 }}>
        <Autocomplete
          value={selectedPreviousVersion ?? null}
          options={versions.filter(versionKey => versionKey !== NO_PREVIOUS_RELEASE_VERSION_OPTION)}
          getOptionLabel={value => getSplittedVersionKey(value).versionKey}
          renderOption={(props, value) => (
            <ListItem {...props}>
              <ListItemText>{getSplittedVersionKey(value).versionKey}</ListItemText>
            </ListItem>
          )}
          renderInput={(params) => <TextField {...params} required label="Previous release version"/>}
          onChange={(_, value) => value && setSelectedPreviousVersion(value)}
        />
      </DialogContent>

      <DialogActions>
        <Button variant="contained" onClick={() => {
          setOpen(false)
          setBwcVersionKey(selectedPreviousVersion)
        }}>
          Check
        </Button>
        <Button variant="outlined" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </DialogActions>
    </DialogForm>
  )
})
