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
import { lazy, memo, Suspense, useEffect, useMemo, useState } from 'react'

import { useHasEditBranchPermission } from '../../useHasBranchPermission'
import { Box, Card, CardContent, CircularProgress, Divider, ToggleButton, Tooltip, Typography } from '@mui/material'
import {
  useConnectedUsers,
  useConnecting,
  useContentLoading,
  useInitialDocument,
  useSetContentLoading,
} from '../../FileEditingWebSocketProvider'
import { RedactorsBar } from '../../RedactorsBar'
import { Resizable } from 're-resizable'
import { useSelectedFile } from '../../useSelectedFile'
import { FileHistoryPanel } from './FileHistoryPanel'
import { FileProblemsPanel } from '../../FileProblemsPanel'
import { useSetMonacoEditorContent } from '../../MonacoContentProvider'
import { QuickStartPlaceholder } from '../QuickStartPlaceholder'
import { useFileProblems } from '../../useFileProblems'
import { useBranchCacheDocument } from '../../useBranchCache'
import type { ToggleButtonProps } from '@mui/material/ToggleButton/ToggleButton'
import { GRAPHQL_FILE_FORMAT } from '@netcracker/qubership-apihub-api-processor'
import {
  TOGGLE_BUTTON_DISABLING_END_STYLE,
  TOGGLE_BUTTON_DISABLING_START_STYLE,
  TOGGLE_BUTTON_ENABLING_END_STYLE,
  TOGGLE_BUTTON_ENABLING_START_STYLE,
  ToggleButtonWithHint,
} from '@netcracker/qubership-apihub-ui-shared/components/Buttons/ToggleButtonWithHint'
import { calculateSpecType, getFileExtension, UNKNOWN_FILE_FORMAT } from '@netcracker/qubership-apihub-ui-shared/utils/files'
import { isOpenApiSpecType, UNKNOWN_SPEC_TYPE } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import { useSpecItemUriHashParam } from '@netcracker/qubership-apihub-ui-shared/hooks/hashparams/useSpecItemUriHashParam'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { FileIcon } from '@netcracker/qubership-apihub-ui-shared/icons/FileIcon'
import { ComponentIcon } from '@netcracker/qubership-apihub-ui-shared/icons/ComponentIcon'
import { CustomToggleButtonGroup } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/CustomToggleButtonGroup'
import { MonacoEditorPlaceholder } from '@apihub/components/MonacoEditorPlaceholder'
import { DELETED_CHANGE_STATUS, EXCLUDED_CHANGE_STATUS } from '@netcracker/qubership-apihub-ui-shared/entities/change-statuses'
import { UnsupportedFilePlaceholder } from '@netcracker/qubership-apihub-ui-shared/components/UnsupportedFilePlaceholder'
import { NAVIGATION_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { DocSpecView } from '@apihub/components/DocSpecView'
import type { OtMonacoEditorProps } from './OtMonacoEditor/OtMonacoEditor'
import { EXTENSION_TO_TYPE_LANGUAGE_MAP } from '@netcracker/qubership-apihub-ui-shared/types/languages'

const OtMonacoEditor: FC<OtMonacoEditorProps> = lazy(() => import('./OtMonacoEditor/OtMonacoEditor'))

export type EnabledProblemsToggleButtonProps = {
  isLoading: boolean
  problemsCounter: JSX.Element
}

const EnabledProblemsToggleButton: FC<EnabledProblemsToggleButtonProps & Omit<ToggleButtonProps, 'value'>> = ({
  isLoading,
  problemsCounter,
  ...rest
}) => (
  <ToggleButton
    {...rest}
    value={PROBLEMS_INFO_MODE}
    sx={TOGGLE_BUTTON_ENABLING_END_STYLE}
  >
    Problems {isLoading
    ? <CircularProgress sx={{ alignSelf: 'center', marginLeft: '3px' }} size={10}/>
    : problemsCounter}
  </ToggleButton>
)

const DisabledProblemsToggleButton: FC = () => {
  return (
    <ToggleButtonWithHint
      hint="Validation is not available"
      disabled
      disableHint={false}
      value={PROBLEMS_INFO_MODE}
      sx={TOGGLE_BUTTON_DISABLING_END_STYLE}
    >
      Problems
    </ToggleButtonWithHint>
  )
}

export const FilesModeBody: FC = memo(() => {
  const initialDocument = useInitialDocument()
  const setMonacoContent = useSetMonacoEditorContent()

  const { key, name = '', format = UNKNOWN_FILE_FORMAT, status, publish } = useSelectedFile() ?? {}
  const [document, isDocumentLoading] = useBranchCacheDocument(key!)
  const { type = UNKNOWN_SPEC_TYPE, content = '' } = document ?? {}

  const hasEditPermission = useHasEditBranchPermission()

  const connectedUsers = useConnectedUsers()
  const connecting = useConnecting()

  const [problems, isLoading] = useFileProblems(key, true)

  const setContentLoading = useSetContentLoading()
  const contentLoading = useContentLoading()

  const [infoMode, setInfoMode] = useState<string>('')

  const isProblemsToggleAvailable = isOpenApiSpecType(type)
  const isUnavailableProblemsToggleChosen = infoMode === PROBLEMS_INFO_MODE && !isProblemsToggleAvailable

  const [specItemUri] = useSpecItemUriHashParam()

  const [activeProjectFileName, setActiveProjectFileName] = useState<string | undefined>(undefined)
  useEffect(() => {
    if (name !== activeProjectFileName) {
      setContentLoading(true)
    }
    setActiveProjectFileName(name)
    setContentLoading(false)
  }, [name, setContentLoading, activeProjectFileName])

  const problemsCounter = useMemo(() => {
      const MAX_TWO_DIGIT_NUMBER = 99
      const biggerThanOneDigit = problems.length > 9
      const biggerThanTwoDigits = problems.length > MAX_TWO_DIGIT_NUMBER
      return <>
        {biggerThanOneDigit
          ? (biggerThanTwoDigits ? MAX_TWO_DIGIT_NUMBER : problems.length)
          : (<Typography variant="button" sx={{ marginLeft: '9.46px' }}>{problems.length}</Typography>)
        }
      </>
    },
    [problems],
  )

  {/*todo remove after support doc for graphql*/}
  const disablePreview = origin === null || format === GRAPHQL_FILE_FORMAT
  useEffect(() => {
    if (disablePreview) {
      setInfoMode('')
    }
  }, [disablePreview, format])

  return (
    <QuickStartPlaceholder invisible={!!key}>
      <BodyCard
        header={
          <Box display="flex" gap={1} alignItems="center">
            {publish
              ? <Tooltip title="Document will be published"><Box><FileIcon/></Box></Tooltip>
              : <Tooltip title="Component will not be published"><Box><ComponentIcon/></Box></Tooltip>}
            {name}
          </Box>
        }
        action={
          format !== UNKNOWN_FILE_FORMAT && (
            <Box display="flex" gap={1} alignItems="center">
              <Box display="flex" gap={1} alignItems="center">
                {
                  connecting
                    ? <CircularProgress sx={{ alignSelf: 'center' }} size={20}/>
                    : <RedactorsBar redactors={connectedUsers}/>
                }
                <Divider/>
              </Box>

              <CustomToggleButtonGroup
                value={infoMode as string}
                onClick={setInfoMode}
                exclusive
                customLastButton
              >
                {/*todo return to classic ToggleButton for graphql after support doc*/}
                <ToggleButtonWithHint
                  hint="Preview is not available for GraphQL"
                  disableHint={!disablePreview}
                  disabled={disablePreview}
                  value={PREVIEW_INFO_MODE}
                  sx={disablePreview
                    ? TOGGLE_BUTTON_DISABLING_START_STYLE
                    : TOGGLE_BUTTON_ENABLING_START_STYLE
                  }
                >
                  Preview
                </ToggleButtonWithHint>
                <ToggleButton
                  value={HISTORY_INFO_MODE}
                  disabled={origin === null}
                >
                  History
                </ToggleButton>
                {isProblemsToggleAvailable
                  ? <EnabledProblemsToggleButton
                    isLoading={isLoading}
                    problemsCounter={problemsCounter}
                  />
                  : <DisabledProblemsToggleButton/>
                }
              </CustomToggleButtonGroup>
            </Box>
          )
        }
        body={
          <Box mx={-4} display="flex" minWidth={0} height="100%" borderTop="1px solid #D5DCE3">
            {format !== UNKNOWN_FILE_FORMAT && name
              ? (
                <Suspense fallback={<MonacoEditorPlaceholder/>}>
                  {contentLoading || !initialDocument
                    ? <MonacoEditorPlaceholder/>
                    : <Box sx={{ minWidth: 0, width: '100%' }}>
                      <OtMonacoEditor
                        fileType={calculateSpecType(getFileExtension(name), initialDocument.document[0])}
                        language={EXTENSION_TO_TYPE_LANGUAGE_MAP[getFileExtension(name)]}
                        onChange={setMonacoContent}
                        readonly={!hasEditPermission || status === DELETED_CHANGE_STATUS || status === EXCLUDED_CHANGE_STATUS}
                        problems={problems}
                        selectedUri={specItemUri}
                        initialDocument={initialDocument}
                      />
                    </Box>
                  }
                </Suspense>
              )
              : <UnsupportedFilePlaceholder message="Unsupported file"/>
            }
            {
              infoMode && !isUnavailableProblemsToggleChosen && (
                <Resizable
                  defaultSize={{ width: 540, height: '100%' }}
                  handleStyles={{ left: { cursor: 'ew-resize' } }}
                  maxWidth="94%"
                  minWidth="25%"
                  enable={{
                    top: false,
                    right: false,
                    bottom: false,
                    left: true,
                    topRight: false,
                    bottomRight: false,
                    bottomLeft: false,
                    topLeft: false,
                  }}
                >
                  <Card sx={{ borderRadius: 0, borderLeft: '1px solid  #D5DCE3' }}>
                    <CardContent>
                      {infoMode === PREVIEW_INFO_MODE && (
                        <Placeholder
                          invisible={Boolean(initialDocument?.document[0])}
                          area={NAVIGATION_PLACEHOLDER_AREA}
                          message="Nothing to preview"
                        >
                          {
                            isDocumentLoading
                              ? <LoadingIndicator/>
                              : type !== UNKNOWN_SPEC_TYPE && content && <DocSpecView
                              type={type}
                              format={format}
                              value={content}
                              selectedUri={specItemUri}
                            />
                          }
                        </Placeholder>
                      )}
                      {infoMode === HISTORY_INFO_MODE && <FileHistoryPanel/>}
                      {infoMode === PROBLEMS_INFO_MODE && <FileProblemsPanel fileKey={key}/>}
                    </CardContent>
                  </Card>
                </Resizable>
              )
            }
          </Box>
        }
      />
    </QuickStartPlaceholder>
  )
})

const PREVIEW_INFO_MODE = 'preview'
const HISTORY_INFO_MODE = 'history'
const PROBLEMS_INFO_MODE = 'problems'
const NONE_INFO_MODE = null

export type InfoMode =
  | typeof PREVIEW_INFO_MODE
  | typeof HISTORY_INFO_MODE
  | typeof PROBLEMS_INFO_MODE
  | typeof NONE_INFO_MODE
