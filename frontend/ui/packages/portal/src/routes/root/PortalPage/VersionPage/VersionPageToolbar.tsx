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
import { Box, Button, Typography } from '@mui/material'
import { useParams } from 'react-router-dom'
import { PackageBreadcrumbs } from '../../PackageBreadcrumbs'
import { useDownloadVersionDocumentation } from './useDownloadVersionDocumentation'
import { EditButton } from './EditButton'
import { VersionSelector } from '../VersionSelector'
import { usePackageVersionContent } from '../../usePackageVersionContent'
import { useSetFullMainVersion, useSetIsLatestRevision } from '../FullMainVersionProvider'
import { useEffectiveApiType } from '../../useEffectiveApiType'
import { ComparisonSelectorButton } from './ComparisonSelectorButton'
import { useNavigation } from '../../../NavigationProvider'
import { useBackwardLocation } from '../../useBackwardLocation'
import { useCurrentPackage } from '@apihub/components/CurrentPackageProvider'
import { DASHBOARD_KIND, PACKAGE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { useBackwardLocationContext, useSetBackwardLocationContext } from '@apihub/routes/BackwardLocationProvider'
import { SPECIAL_VERSION_KEY } from '@netcracker/qubership-apihub-ui-shared/entities/versions'
import { CREATE_VERSION_PERMISSIONS } from '@netcracker/qubership-apihub-ui-shared/entities/package-permissions'
import { VERSION_STATUS_MANAGE_PERMISSIONS } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import { Toolbar } from '@netcracker/qubership-apihub-ui-shared/components/Toolbar'
import { ToolbarTitle } from '@netcracker/qubership-apihub-ui-shared/components/ToolbarTitle'
import { CustomChip } from '@netcracker/qubership-apihub-ui-shared/components/CustomChip'
import { ButtonWithHint } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/ButtonWithHint'
import { PackageSettingsButton } from '@apihub/components/PackageSettingsButton'
import { AddIcon } from '@netcracker/qubership-apihub-ui-shared/icons/AddIcon'
import { usePackageVersionConfig } from '@apihub/routes/root/PortalPage/usePackageVersionConfig'
import { CopyPackageVersionButton } from '@apihub/routes/root/PortalPage/VersionPage/CopyPackageVersionButton'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { API_TYPE_GRAPHQL, API_TYPE_REST } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

export const VersionPageToolbar: FC = memo(() => {
  const { packageId, versionId } = useParams()
  const setFullMainVersion = useSetFullMainVersion()
  const setIsLatestRevision = useSetIsLatestRevision()
  const location = useBackwardLocation()
  const backwardLocation = useBackwardLocationContext()
  const setBackwardLocation = useSetBackwardLocationContext()
  const { navigateToVersion } = useNavigation()

  const [downloadVersionDocumentation] = useDownloadVersionDocumentation()

  const currentPackage = useCurrentPackage()
  const isDashboard: boolean | null = useMemo(() => currentPackage?.kind === DASHBOARD_KIND ?? null, [currentPackage?.kind])
  const isPackage: boolean | null = useMemo(() => currentPackage?.kind === PACKAGE_KIND ?? null, [currentPackage?.kind])

  const { versionContent } = usePackageVersionContent({
    packageKey: packageId,
    versionKey: versionId,
    includeSummary: true,
  })
  const { version, status, latestRevision, operationTypes } = versionContent ?? {}
  const { restGroupingPrefix, permissions } = currentPackage ?? {}
  const defaultApiType = useEffectiveApiType(operationTypes)

  const [config, isConfigLoading] = usePackageVersionConfig(packageId, versionId)

  // This is a temporary solution because of portal can't work with hierarchical structure with folders
  const filesHaveFolders = useMemo(() => {
    return (isConfigLoading || config?.files?.some(file => file.fileKey.includes('/'))) ?? false
  }, [config?.files, isConfigLoading])

  useEffect(() => {
    setFullMainVersion(version)
    setIsLatestRevision(latestRevision)
  }, [latestRevision, setBackwardLocation, setFullMainVersion, setIsLatestRevision, version])

  const showCompareGroups = useMemo(
    () => (
      API_TYPE_SHOW_COMPARE_GROUPS_MAP[defaultApiType](isPackage, restGroupingPrefix)
    ),
    [defaultApiType, isPackage, restGroupingPrefix],
  )

  const handleCreateVersionClick = useCallback(
    () => {
      setBackwardLocation({ ...backwardLocation, fromPackage: location })
      navigateToVersion({ packageKey: packageId!, versionKey: SPECIAL_VERSION_KEY, edit: true })
    },
    [backwardLocation, location, navigateToVersion, packageId, setBackwardLocation],
  )

  const hasCreateVersionPermissions = useMemo(
    () => CREATE_VERSION_PERMISSIONS.some(managePermission =>
      permissions?.includes(managePermission),
    ),
    [permissions],
  )

  const hasEditPermission = useMemo(
    () => permissions && status && permissions.includes(VERSION_STATUS_MANAGE_PERMISSIONS[status]),
    [permissions, status],
  )

  return (
    <>
      <Toolbar
        breadcrumbs={<PackageBreadcrumbs packageObject={currentPackage}/>}
        header={
          <>
            <ToolbarTitle value={currentPackage?.name}/>
            <Typography sx={{ ml: 2 }} variant="subtitle3">
              Version
            </Typography>
            <VersionSelector/>
            {versionContent && <CustomChip value={versionContent!.status} data-testid="VersionStatusChip"/>}
            <ButtonWithHint
              disabled={!hasCreateVersionPermissions}
              disableHint={hasCreateVersionPermissions}
              hint="You do not have permission to edit the version"
              startIcon={<AddIcon color="#0068FF"/>}
              tooltipMaxWidth="unset"
              onClick={handleCreateVersionClick}
              testId="AddNewVersionButton"
            />
          </>
        }
        action={
          <Box display="flex" gap={2}>
            <CopyPackageVersionButton/>

            {!isDashboard && version && (
              <Button
                variant="outlined"
                onClick={() => downloadVersionDocumentation({ packageKey: packageId!, version: version })}
                data-testid="ExportVersionButton"
              >
                Export
              </Button>
            )}

            <ComparisonSelectorButton showCompareGroups={showCompareGroups}/>

            <EditButton
              disabled={!hasEditPermission || filesHaveFolders}
              hint={getEditButtonHint(hasEditPermission, filesHaveFolders, latestRevision)}
              isDashboard={isDashboard}
            />
            <PackageSettingsButton packageKey={packageId!}/>
          </Box>
        }
      />
    </>
  )
})

function getEditButtonHint(
  hasEditPermission: boolean | undefined,
  filesHaveFolders: boolean,
  latestRevision: boolean = true,
): string | null {
  if (!hasEditPermission) {
    return NO_PERMISSION
  }
  if (filesHaveFolders) {
    return haveFoldersMessage(latestRevision)
  }

  return null
}

export const NO_PERMISSION = 'You do not have permission to edit the version'
const haveFoldersMessage = (latestRevision: boolean): string =>
  `The content of the current ${latestRevision ? 'version' : 'revision'} cannot be edited because the version source files have a hierarchical structure with folders, and editing such a structure is not currently supported in the Portal.`

type ShowCompareGroupsCallback = (isPackage: boolean, restGroupingPrefix: string | undefined) => boolean
const API_TYPE_SHOW_COMPARE_GROUPS_MAP: Record<ApiType, ShowCompareGroupsCallback> = {
  [API_TYPE_REST]: (isPackage, restGroupingPrefix) => isPackage && !!restGroupingPrefix,
  [API_TYPE_GRAPHQL]: () => false,
}
