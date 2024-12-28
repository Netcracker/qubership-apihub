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

import { Button, Card, Collapse, Divider } from '@mui/material'
import ExpandLessOutlinedIcon from '@mui/icons-material/ExpandLessOutlined'
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined'
import { useSpecItemUriHashParam } from '@netcracker/qubership-apihub-ui-shared/hooks/hashparams/useSpecItemUriHashParam'
import type { SpecType } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import { isOpenApiSpecType } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import { SpecNavigation } from '@netcracker/qubership-apihub-ui-shared/components/SpecificationDialog/SpecNavigation'

export type CollapsibleNavPanelProps = {
  filename?: string
  content?: string | null
  type?: SpecType
}

export const CollapsibleNavPanel: FC<CollapsibleNavPanelProps> = memo<CollapsibleNavPanelProps>(({
  content,
  type,
}) => {
  const [open, setOpen] = useState<boolean>(false)
  const [, setSpecItemUri] = useSpecItemUriHashParam()

  return (
    <>
      <Divider orientation="horizontal" variant="fullWidth"/>
      <Button
        sx={{ my: 1, justifyContent: 'left', px: 2 }}
        variant="text"
        disabled={!isOpenApiSpecType(type)}
        startIcon={open ? <ExpandLessOutlinedIcon/> : <ExpandMoreOutlinedIcon/>}
        onClick={() => setOpen(!open)}
      >
        {open ? 'Close' : 'Open'} navigation
      </Button>
      <Card sx={{ borderRadius: 0 }}>
        <Collapse in={open} timeout="auto" unmountOnExit>
          <SpecNavigation
            content={content}
            onSelect={setSpecItemUri}
          />
        </Collapse>
      </Card>
    </>
  )
})
