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
import { Box, Dialog, DialogContent, DialogTitle, IconButton, MenuItem, TextField, Typography } from '@mui/material'
import { useEvent } from 'react-use'
import { useFileHistory } from './useFileHistory'
import type { FileHistoryDialogDetail } from '../../../../../../EventBusProvider'
import { SHOW_FILE_HISTORY_DIALOG } from '../../../../../../EventBusProvider'
import { useProjectFileContent } from '../../../useProjectFileContent'
import { useSpecType } from '../../../../../useSpecType'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import { useSelectedFile } from '../../../useSelectedFile'
import { useMonacoEditorContent } from '../../../MonacoContentProvider'
import { Resizable } from 're-resizable'
import type { FileKey, Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { CommitKey } from '@apihub/entities/commits'
import { DRAFT_COMMIT_KEY, LATEST_COMMIT_KEY, NONE_COMMIT_KEY } from '@apihub/entities/commits'
import { OverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/OverflowTooltip'
import { useSpecItemUriHashParam } from '@netcracker/qubership-apihub-ui-shared/hooks/hashparams/useSpecItemUriHashParam'
import {
  NAVIGATION_DEFAULT_WIDTH,
  NAVIGATION_MAX_WIDTH,
  NAVIGATION_MIN_WIDTH,
} from '@netcracker/qubership-apihub-ui-shared/utils/page-layouts'
import { SpecNavigation } from '@netcracker/qubership-apihub-ui-shared/components/SpecificationDialog/SpecNavigation'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import type { SpecContentDifference } from '@apihub/entities/specs'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { RawSpecDiffView } from '@netcracker/qubership-apihub-ui-shared/components/RawSpecDiffView'
import { getFileExtension } from '@netcracker/qubership-apihub-ui-shared/utils/files'

export const FileHistoryDialog: FC = memo(() => {
  const [open, setOpen] = useState(false)

  const [fileKey, setFileKey] = useState<Key>('')
  const [commitKey, setCommitKey] = useState<CommitKey>(NONE_COMMIT_KEY)
  const [comparisonCommitKey, setComparisonCommitKey] = useState<CommitKey>(NONE_COMMIT_KEY)

  const [fileHistory] = useFileHistory(fileKey)

  useEvent(SHOW_FILE_HISTORY_DIALOG, ({ detail }: CustomEvent<FileHistoryDialogDetail>): void => {
    setFileKey(detail.fileKey)
    setCommitKey(detail.commitKey)
    setComparisonCommitKey(detail.comparisonCommitKey)
    setOpen(true)
  })

  return (
    <Dialog
      maxWidth={false}
      fullWidth
      open={open}
      onClose={() => setOpen(false)}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        Compare

        <TextField
          sx={{ width: 300 }}
          select hiddenLabel
          value={commitKey}
          onChange={({ target }) => setCommitKey(target.value)}
        >
          {
            fileHistory.map(({ comment, key }, index) => (
              <MenuItem sx={{ width: 300 }} key={key} value={index === 0 ? LATEST_COMMIT_KEY : key}>
                <OverflowTooltip placement="right" title={comment}>
                  <Typography variant="body2" noWrap>
                    {comment}
                  </Typography>
                </OverflowTooltip>
              </MenuItem>
            ))
          }
        </TextField>

        vs

        <TextField
          sx={{ width: 300 }}
          select hiddenLabel
          value={comparisonCommitKey}
          onChange={({ target }) => setComparisonCommitKey(target.value)}
        >
          <MenuItem key={DRAFT_COMMIT_KEY} value={DRAFT_COMMIT_KEY}>Draft</MenuItem>
          {
            fileHistory.map(({ comment, key }) => (
              <MenuItem sx={{ width: 300 }} key={key} value={key}>
                <OverflowTooltip placement="right" title={comment}>
                  <Typography variant="body2" noWrap>
                    {comment}
                  </Typography>
                </OverflowTooltip>
              </MenuItem>
            ))
          }
        </TextField>

        <Box display="flex" marginLeft="auto" alignItems="center" gap={3}>
          <IconButton
            sx={{ color: '#353C4E' }}
            onClick={() => setOpen(false)}
          >
            <CloseOutlinedIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <FileHistoryDialogContent
        fileKey={fileKey}
        commitKey={commitKey}
        comparisonCommitKey={comparisonCommitKey}
      />
    </Dialog>
  )
})

type FileHistoryDialogContentProps = {
  fileKey: FileKey
  commitKey: CommitKey
  comparisonCommitKey: CommitKey
}

const FileHistoryDialogContent: FC<FileHistoryDialogContentProps> = ({
  fileKey,
  commitKey,
  comparisonCommitKey,
}) => {
  const [specItemUri, setSpecItemUri] = useSpecItemUriHashParam()

  const { name } = useSelectedFile() ?? { key: '' }
  const content = useMonacoEditorContent()

  const specType = useSpecType(name, content)
  const extension = getFileExtension(name ?? '')
  const [[before, after], isLoading] = useDifferences(fileKey, commitKey, comparisonCommitKey)

  return (
    <DialogContent
      sx={{
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      <Resizable
        style={{
          display: 'inline',
          overflow: 'hidden',
          position: 'relative',
          borderRight: '1px solid #D5DCE3',
        }}
        handleStyles={{ right: { cursor: 'ew-resize' } }}
        defaultSize={{ width: NAVIGATION_DEFAULT_WIDTH, height: '100%' }}
        maxWidth={NAVIGATION_MAX_WIDTH}
        minWidth={NAVIGATION_MIN_WIDTH}
        enable={{
          top: false,
          right: true,
          bottom: false,
          left: false,
          topRight: false,
          bottomRight: false,
          bottomLeft: false,
          topLeft: false,
        }}
      >
        <SpecNavigation
          content={before}
          selectedUri={specItemUri}
          onSelect={setSpecItemUri}
        />
      </Resizable>
      <Box width="100%" height="100%" px={4}>
        {
          isLoading
            ? <LoadingIndicator />
            : <RawSpecDiffView
              beforeValue={before}
              afterValue={after}
              selectedUri={specItemUri}
              extension={extension}
              type={specType}
            />
        }
      </Box>
    </DialogContent>
  )
}

function useDifferences(
  fileKey: Key,
  commitKey: CommitKey,
  comparisonCommitKey: CommitKey,
): [SpecContentDifference, IsLoading] {
  const [beforeFileContent, isBeforeFileContentLoading] = useProjectFileContent(fileKey, commitKey)
  const [afterFileContent, isAfterFileContentLoading] = useProjectFileContent(fileKey, comparisonCommitKey)
  const draftContent = useMonacoEditorContent()

  return [
    [beforeFileContent ?? '', comparisonCommitKey === DRAFT_COMMIT_KEY ? draftContent : afterFileContent ?? ''],
    isBeforeFileContentLoading || isAfterFileContentLoading,
  ]
}
