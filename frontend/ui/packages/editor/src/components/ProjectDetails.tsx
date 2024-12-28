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
import { Box, Grid, Link, Typography } from '@mui/material'
import { TitledValue } from './TitledValue'

export type ProjectDetails = Partial<{
  name: string
  defaultBranch: string
  parentGroup: string
  alias: string
  defaultFolder: string
  repositoryUrl: string
  repositoryName: string
  description: string
  packageName?: string
}>

export const ProjectDetails: FC<ProjectDetails> = memo<ProjectDetails>(({
  name,
  defaultBranch,
  parentGroup,
  alias,
  defaultFolder,
  repositoryUrl,
  repositoryName,
  description,
  packageName,
}) => {
  return (
    <Box marginTop={2} height="100%" overflow="hidden">
      <Grid item xs container spacing={2} height="100%" overflow="auto">
        <Grid item xs={6}>
          <TitledValue
            title="Project name"
            value={name}
          />
        </Grid>
        <Grid item xs={6}>
          <TitledValue
            title="Default Branch"
            value={defaultBranch}
          />
        </Grid>
        <Grid item xs={6}>
          <TitledValue
            title="Parent group"
            value={parentGroup}
          />
        </Grid>
        <Grid item xs={6}>
          <TitledValue
            title="Alias"
            value={alias}
          />
        </Grid>
        <Grid item xs={12}>
          <TitledValue
            title="Default Folder"
            value={defaultFolder}
          />
        </Grid>
        <Grid item xs={12}>
          <TitledValue
            title="Repository"
            value={<Link href={repositoryUrl}>{repositoryName}</Link>}
          />
        </Grid>
        <Grid item xs={12}>
          <Typography variant="subtitle2">Description</Typography>
          <Typography variant="body2">{description}</Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography variant="subtitle2">Package</Typography>
          <Typography variant="body2">{packageName}</Typography>
        </Grid>
      </Grid>
    </Box>
  )
})
