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
import { useEditableSettingsTabContent, useSetEditableSettingsTabContent } from '../SettingsModeBody'
import { Box, Button } from '@mui/material'
import type { SettingsGeneralProps } from './SettingsGeneralProps'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { ProjectDetails } from '@apihub/components/ProjectDetails'
import { calculateProjectPath } from '@apihub/utils/projects'

export const SettingsViewerGeneral: FC<SettingsGeneralProps> = memo(props => {
  const { project, packageObj } = props
  const { name, alias, description, integration } = project

  const editable = useEditableSettingsTabContent()
  const setEditable = useSetEditableSettingsTabContent()

  if (editable) {
    return null
  }

  return (
    <BodyCard
      header="General"
      subheader="Project information"
      action={
        <Button
          variant="outlined"
          onClick={() => setEditable(true)}
        >
          Edit
        </Button>
      }
      body={
        <Box marginTop={2} overflow="hidden">
          <ProjectDetails
            name={name}
            defaultBranch={integration?.defaultBranch}
            parentGroup={calculateProjectPath(project)}
            alias={alias}
            defaultFolder={integration?.defaultFolder}
            repositoryUrl={integration?.repositoryUrl}
            repositoryName={integration?.repositoryName}
            description={description}
            packageName={packageObj?.name}
          />
        </Box>
      }
    />
  )
})
