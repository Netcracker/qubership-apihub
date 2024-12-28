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
import { memo, useCallback, useEffect, useMemo } from 'react'
import { useIsPublishProjectEditorMode } from '../../useProjectEditorMode'

import { useEventBus } from '../../../../../EventBusProvider'

import { Box, CircularProgress, Link, List, ListItem, ListItemText, Typography } from '@mui/material'
import { NavLink } from 'react-router-dom'
import { PublishTabItem } from './PublishTabItem'
import { BwcPublishProjectVersionDialog } from './BwcPublishProjectVersionDialog'
import { useBwcVersionKey } from '../../BwcVersionKeyProvider'
import { BwcCheckDialog } from './BwcCheckDialog'
import { usePublishableBranchFileKeys } from '../../usePublishableBranchFileKeys'
import { useBranchChangeCount } from '../../useBranchChanges'
import { useBranchConflicts } from '../../useBranchConflicts'
import { useBranchSearchParam } from '../../../../useBranchSearchParam'
import { useBranchCache } from '../../useBranchCache'
import { useBwcProblems } from '../../useBwcProblems'
import { useProject } from '../../../../useProject'
import { GENERAL_SETTINGS_TAB } from '../SettingsTabPanel'
import { useHasPublishBranchPermission } from '../../useHasBranchPermission'
import { usePackage } from '../../../../usePackage'
import { useFileProblemsMap } from '../../useFileProblems'
import { WarningMarker } from '../WarningMarker'
import { useNavigation } from '../../../../../NavigationProvider'
import {
  CHANGES_PROJECT_EDITOR_MODE,
  PUBLISH_PROJECT_EDITOR_MODE,
  SETTINGS_PROJECT_EDITOR_MODE,
} from '@apihub/entities/editor-modes'
import { SidebarTabPanel } from '@apihub/components/SidebarTabPanel'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { NAVIGATION_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { MANAGE_STATUS_VERSION_PERMISSIONS } from '@netcracker/qubership-apihub-ui-shared/entities/package-permissions'
import { ButtonWithHint } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/ButtonWithHint'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'
import {
  ERROR_STATUS_MARKER_VARIANT,
  StatusMarker,
  SUCCESS_STATUS_MARKER_VARIANT,
  WARNING_STATUS_MARKER_VARIANT,
} from '@netcracker/qubership-apihub-ui-shared/components/StatusMarker'
import type { IsFetching } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { BRANCH_SEARCH_PARAM, MODE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import objectHash from 'object-hash'

export const PublishTabPanel: FC = memo(() => {
  const visible = useIsPublishProjectEditorMode()

  const [branchCache, isBranchCacheLoading] = useBranchCache()
  const publishableFileKeys = usePublishableBranchFileKeys()
  const isPublishAvailable = publishableFileKeys.length > 0
  const fileKeysHash = useMemo(() => calculateFileKeysHash(publishableFileKeys), [publishableFileKeys])
  const [fileProblemsMap, isFetching] = useFileProblemsMap(publishableFileKeys, fileKeysHash)
  const [conflicts] = useBranchConflicts()

  if (!visible) {
    return null
  }

  return (<>
    <SidebarTabPanel
      value={PUBLISH_PROJECT_EDITOR_MODE}
      header={
        <Box display="flex" width="100%" alignItems="center" flexGrow={1} gap={1}>
          <Typography variant="h3" noWrap>Publish preview</Typography>
          {isNotEmpty(conflicts) && <WarningMarker/>}
          {isPublishAvailable && !isBranchCacheLoading && <PublishButton isValidating={isFetching}/>}
        </Box>
      }
      body={
        isBranchCacheLoading
          ? <LoadingIndicator/>
          : <Placeholder
            invisible={isNotEmpty(publishableFileKeys)}
            area={NAVIGATION_PLACEHOLDER_AREA}
            message="Nothing to publish"
          >
            <BwcStatusBar/>
            <List>
              {publishableFileKeys.map((fileKey) => {
                const fileData = branchCache[fileKey]
                if (!fileData) {
                  return null
                }
                return (
                  <PublishTabItem
                    key={fileKey}
                    fileKey={fileKey}
                    fileType={fileData.type}
                    fileTitle={fileData.title}
                    problems={fileProblemsMap[fileKey]}
                  />
                )
              })}
            </List>
          </Placeholder>
      }
    />

    <BwcPublishProjectVersionDialog/>
    <BwcCheckDialog/>
  </>)
})

type PublishButtonProps = {
  isValidating: boolean
}

const PublishButton: FC<PublishButtonProps> = memo(({isValidating}) => {
  const saveAvailable = useBranchChangeCount() > 0
  const [onStartPublish, isLoading] = useOnStartPublish()
  const [branch] = useBranchSearchParam()
  const hasPublishPermission = useHasPublishBranchPermission()

  const [project] = useProject()
  const { packageKey } = project ?? { packageKey: '' }
  const [packageObj] = usePackage(packageKey)

  const hasSavePermission = !hasPublishPermission && saveAvailable

  const hasPublishPermissions = useMemo(
    () => MANAGE_STATUS_VERSION_PERMISSIONS.some(managePermission =>
      packageObj?.permissions?.includes(managePermission),
    ),
    [packageObj],
  )

  const noPackageKeyTooltipTitle = !packageKey && (
    <Box display="grid">
      Please attach package in settings
      <Link
        component={NavLink}
        to={{ search: `branch=${encodeURIComponent(branch ?? '')}&mode=${SETTINGS_PROJECT_EDITOR_MODE}&setting=${GENERAL_SETTINGS_TAB}` }}
      >
        Go to settings
      </Link>
    </Box>
  )
  const noPublishPermissionTooltipTitle = !hasPublishPermission && saveAvailable && (
    <Box display="grid">
      Insufficient permissions to publish to this GIT repository. Please, contact the repository's owner
    </Box>
  )
  const noGrantTooltipTitle = !hasPublishPermissions && (
    <Box display="grid">
      {`You don't have grants to publish to package ${packageObj?.key}`}
    </Box>
  )
  const isValidatingTooltipTitle = isValidating && (
    <Box display="grid">
      Files are validating
    </Box>
  )

  return (
    <Box sx={{ marginLeft: 'auto', marginRight: 4, minWidth: 'max-content' }}>
      <ButtonWithHint
        variant="contained"
        disabled={!packageKey || hasSavePermission || !hasPublishPermissions || isValidating}
        disableHint={!!packageKey && hasPublishPermissions && !isValidating}
        hint={noPackageKeyTooltipTitle || noPublishPermissionTooltipTitle || noGrantTooltipTitle || isValidatingTooltipTitle}
        isLoading={isLoading}
        onClick={onStartPublish}
        title={saveAvailable ? 'Save & Publish' : 'Publish'}
      />
    </Box>
  )
})

const BwcStatusBar: FC = memo(() => {
  const { showBwcCheckDialog } = useEventBus()
  const previousVersionKey = useBwcVersionKey()
  const [, , isBwcChecking, checkBwcProblems] = useBwcProblems(previousVersionKey)
  useEffect(() => {previousVersionKey && checkBwcProblems()}, [checkBwcProblems, previousVersionKey])

  const { versionKey: previousVersion } = getSplittedVersionKey(previousVersionKey)

  return (
    <ListItem
      sx={{ display: 'flex', flexDirection: 'row', backgroundColor: '#F8F9FA', px: 2, py: 1 }}
      secondaryAction={
        isBwcChecking
          ? <CircularProgress size={16}/>
          : <BwcCheckStatus/>
      }
      disablePadding
    >
      <ListItemText
        primary="Backward Compatibility Status"
        secondary={
          <Link
            variant="subtitle1"
            underline="none"
            sx={{ cursor: 'pointer' }}
            onClick={showBwcCheckDialog}
          >
            {!previousVersionKey ? 'No previous release version selected' : `Previous release version: ${previousVersion}`}
          </Link>
        }
        secondaryTypographyProps={{ noWrap: true }}
      />
    </ListItem>
  )
})

const BwcCheckStatus: FC = memo(() => {
  const previousVersionKey = useBwcVersionKey()
  const [bwcProblems, isBwcProblemsFetched] = useBwcProblems(previousVersionKey)

  if (!isBwcProblemsFetched) {
    return (
      <StatusMarker
        value={WARNING_STATUS_MARKER_VARIANT}
        title="Backward compatibility check wasn't run"
        placement="right"
      />
    )
  }

  if (bwcProblems.size > 0) {
    return (
      <StatusMarker
        value={ERROR_STATUS_MARKER_VARIANT}
        title="Backward compatibility problems found"
        placement="right"
      />
    )
  }

  return (
    <StatusMarker
      value={SUCCESS_STATUS_MARKER_VARIANT}
      title="No backward compatibility problems"
      placement="right"
    />
  )
})

type OnPublish = () => void

function useOnStartPublish(): [OnPublish, IsFetching] {
  const saveAvailable = useBranchChangeCount() > 0
  const { showPublishProjectVersionDialog } = useEventBus()
  const { navigateToProject } = useNavigation()
  const [branch] = useBranchSearchParam()
  const [, isFetching, getBranchConflicts] = useBranchConflicts()

  const onPublish = useCallback(async () => {
    if (saveAvailable) {
      const { data } = await getBranchConflicts()
      if (isNotEmpty(data)) {
        navigateToProject({
          search: {
            [BRANCH_SEARCH_PARAM]: { value: branch },
            [MODE_SEARCH_PARAM]: { value: CHANGES_PROJECT_EDITOR_MODE },
          },
          replace: true,
        })
      }
    }
    showPublishProjectVersionDialog()
  }, [branch, getBranchConflicts, saveAvailable, navigateToProject, showPublishProjectVersionDialog])

  return [
    onPublish,
    isFetching,
  ]
}

const calculateFileKeysHash = (fileKeys: Key[]): string => {
  const uniqueFileKeysSet = new Set(fileKeys)
  const uniqueFileKeysArray = Array.from(uniqueFileKeysSet)

  return objectHash(uniqueFileKeysArray, {
    unorderedArrays: true,
    unorderedObjects: true,
  })
}
