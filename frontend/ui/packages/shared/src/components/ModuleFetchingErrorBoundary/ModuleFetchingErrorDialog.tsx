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

import { Autorenew } from '@mui/icons-material'
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Typography } from '@mui/material'
import type { FC, PropsWithChildren } from 'react'

export const ModuleFetchingErrorPopup: FC<PropsWithChildren> = () => (
  <Dialog
    open
    PaperProps={{
      sx: {
        borderRadius: '10px',
      },
    }}
  >
    <DialogTitle>
      APIHUB UI is out of date
    </DialogTitle>
    <DialogContent>
      <DialogContentText
        variant="body2"
        data-testid="ModuleFetchingErrorDialogContent"
      >
        Please reload the page to get the latest version;
        otherwise, APIHUB UI may not function correctly
      </DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button
        variant='contained'
        startIcon={<Autorenew />}
        onClick={() => { location.reload() }}
      >
        Reload
      </Button>
    </DialogActions>
  </Dialog>
)
