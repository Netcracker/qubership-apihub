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
import { memo } from 'react'
import { Typography } from '@mui/material'
import { NamespaceToolbar } from './NamespacePage/NamespaceToolbar'
import { PageLayout } from '@netcracker/qubership-apihub-ui-shared/components/PageLayout'
import { Toolbar } from '@netcracker/qubership-apihub-ui-shared/components/Toolbar'
import { CONTENT_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'

export const WelcomePage: FC = memo(() => {
  return (
    <PageLayout
      toolbar={
        <Toolbar
          header={<NamespaceToolbar />}
        />
      }
      body={
        <Placeholder
          invisible={false}
          area={CONTENT_PLACEHOLDER_AREA}
          message={
            <Typography width='590px' fontSize='15px'>
              Please select Cloud, Namespace and Portal Workspace to start working with Agent
              Portal workspace determines where the baseline packages will come from, where
              snapshots and promoted versions will be published.
            </Typography>
          }
        />
      }
    />
  )
})
