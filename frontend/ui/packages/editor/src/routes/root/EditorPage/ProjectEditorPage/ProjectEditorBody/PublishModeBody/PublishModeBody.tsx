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
import { Autocomplete, Box, Chip, TextField, Typography } from '@mui/material'
import { useUpdateProjectFileMeta } from '../../useUpdateProjectFileMeta'
import { FileProblemsPanel } from '../../FileProblemsPanel'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import { PublishPreviewDialog } from './PublishPreviewDialog'
import { useEventBus } from '../../../../../EventBusProvider'
import { useSelectedPreviewFile } from '../../useSelectedPreviewFile'
import { useBranchCache } from '../../useBranchCache'
import { ButtonWithHint } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/ButtonWithHint'
import { CONTENT_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { GRAPHQL_SPEC_TYPES, UNKNOWN_SPEC_TYPE } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'

export const PublishModeBody: FC = memo(() => {
  const { key = '', publish, labels = [] } = useSelectedPreviewFile() ?? {}
  const [branchCache, isLoading] = useBranchCache()
  const { showPublishPreviewDialog } = useEventBus()
  const [updateFileMeta] = useUpdateProjectFileMeta()

  // todo remove after support graphql doc for Editor
  const previewDisabled = !branchCache[key] || GRAPHQL_SPEC_TYPES.includes(branchCache[key].type)

  return (
    <Placeholder
      invisible={!!key && !!publish}
      area={CONTENT_PLACEHOLDER_AREA}
      message="No file selected"
    >
      <BodyCard
        header={branchCache[key]?.title}
        subheader={key}
        action={
          branchCache[key]?.type !== UNKNOWN_SPEC_TYPE && (
            <ButtonWithHint
              variant="outlined"
              title="Preview"
              disabled={previewDisabled}
              disableHint={!previewDisabled}
              hint="Preview is not available for GraphQL"
              onClick={showPublishPreviewDialog}
              startIcon={<VisibilityOutlinedIcon fontSize="small" sx={{ mr: 1 }}/>}
            />
          )
        }
        body={
          isLoading
            ? <LoadingIndicator/>
            : <Box display="flex" flexDirection="column" overflow="auto" gap={2}>
              <Typography variant="h5">Labels</Typography>
              <Autocomplete
                multiple freeSolo
                options={['']}
                getOptionLabel={(option) => option}
                value={[...labels]}
                onChange={(_, value) => updateFileMeta({ key: key, labels: value })}
                renderTags={(value, getTagProps) => (
                  value.map((option, index) => <Chip {...getTagProps({ index })} variant="filled" label={option}
                                                     size="small"/>)
                )}
                renderInput={(params) => <TextField
                  {...params}
                  hiddenLabel
                  variant="filled"
                  placeholder="Add Label"
                  sx={{ m: 0 }}
                  inputProps={{ ...params.inputProps, style: { marginTop: -6 } }}
                />}
              />
              <Typography variant="h5">Problems</Typography>
              <FileProblemsPanel fileKey={key}/>
            </Box>
        }
      />
      <PublishPreviewDialog/>
    </Placeholder>
  )
})
