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

import { memo } from 'react'
import { Button } from '@mui/material'
import { useEventBus } from '@apihub/routes/EventBusProvider'
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined'
import { CopyPackageVersionDialog } from '@apihub/routes/root/PortalPage/CopyPackageVersionDialog'

export const CopyPackageVersionButton = memo(() => {
  const { showCopyPackageVersionDialog } = useEventBus()

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<ContentCopyOutlinedIcon/>}
        onClick={showCopyPackageVersionDialog}
        data-testid="CopyVersionButton"
      >
        Copy
      </Button>

      <CopyPackageVersionDialog/>
    </>
  )
})
