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

import { useCurrentPackage } from '@apihub/components/CurrentPackageProvider'
import { ExportedEntityKind } from '@apihub/components/ExportSettingsDialog/api/useExport'
import { PackageSettingsButton } from '@apihub/components/PackageSettingsButton'
import { useBackwardLocationContext, useSetBackwardLocationContext } from '@apihub/routes/BackwardLocationProvider'
import { useEventBus } from '@apihub/routes/EventBusProvider'
import { CreateDashboardVersionButton } from '@apihub/routes/root/PortalPage/DashboardPage/CreateDashboardVersionButton'
import { usePackageVersionConfig } from '@apihub/routes/root/PortalPage/usePackageVersionConfig'
import { CopyPackageVersionButton } from '@apihub/routes/root/PortalPage/VersionPage/CopyPackageVersionButton'
import { Box, Button, Divider, Typography } from '@mui/material'
import { ButtonWithHint } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/ButtonWithHint'
import { CustomChip } from '@netcracker/qubership-apihub-ui-shared/components/CustomChip'
import { Toolbar } from '@netcracker/qubership-apihub-ui-shared/components/Toolbar'
import { ToolbarTitle } from '@netcracker/qubership-apihub-ui-shared/components/ToolbarTitle'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { API_TYPE_GRAPHQL, API_TYPE_REST } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { CREATE_VERSION_PERMISSIONS } from '@netcracker/qubership-apihub-ui-shared/entities/package-permissions'
import { DASHBOARD_KIND, PACKAGE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { VERSION_STATUS_MANAGE_PERMISSIONS } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import { SPECIAL_VERSION_KEY } from '@netcracker/qubership-apihub-ui-shared/entities/versions'
import { AddIcon } from '@netcracker/qubership-apihub-ui-shared/icons/AddIcon'
import type { FC } from 'react'
import { memo, useCallback, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useNavigation } from '../../../NavigationProvider'
import { PackageBreadcrumbs } from '../../PackageBreadcrumbs'
import { useBackwardLocation } from '../../useBackwardLocation'
import { useEffectiveApiType } from '../../useEffectiveApiType'
import { usePackageVersionContent } from '../../usePackageVersionContent'
import { useSetFullMainVersion, useSetIsLatestRevision } from '../FullMainVersionProvider'
import { VersionSelector } from '../VersionSelector'
import { ComparisonSelectorButton } from './ComparisonSelectorButton'
import { EditButton } from './EditButton'
import { useDownloadVersionDocumentation } from './useDownloadVersionDocumentation'
import { WarningApiProcessorVersion } from '@netcracker/qubership-apihub-ui-shared/components/WarningApiProcessorVersion'

export const VersionPageToolbar: FC = memo(() => {
  const { packageId, versionId } = useParams()
  const setFullMainVersion = useSetFullMainVersion()
  const setIsLatestRevision = useSetIsLatestRevision()
  const location = useBackwardLocation()
  const backwardLocation = useBackwardLocationContext()
  const setBackwardLocation = useSetBackwardLocationContext()
  const { navigateToVersion } = useNavigation()

  const { showExportSettingsDialog } = useEventBus()

  const [downloadVersionDocumentation] = useDownloadVersionDocumentation()

  const currentPackage = useCurrentPackage()
  const isDashboard: boolean = useMemo(() => currentPackage?.kind === DASHBOARD_KIND, [currentPackage?.kind])
  const isPackage: boolean = useMemo(() => currentPackage?.kind === PACKAGE_KIND, [currentPackage?.kind])

  const { versionContent } = usePackageVersionContent({
    packageKey: packageId,
    versionKey: versionId,
    includeSummary: true,
  })
  const { version: fullVersion, status, latestRevision, operationTypes } = versionContent ?? {}
  const { restGroupingPrefix, permissions } = currentPackage ?? {}
  const defaultApiType = useEffectiveApiType(operationTypes)

  const [config, isConfigLoading] = usePackageVersionConfig(packageId, versionId)

  // This is a temporary solution because of portal can't work with hierarchical structure with folders
  const filesHaveFolders = useMemo(() => {
    return (isConfigLoading || config?.files?.some(file => file.fileKey.includes('/'))) ?? false
  }, [config?.files, isConfigLoading])

  useEffect(() => {
    setFullMainVersion(fullVersion)
    setIsLatestRevision(latestRevision)
  }, [latestRevision, setBackwardLocation, setFullMainVersion, setIsLatestRevision, fullVersion])

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
        breadcrumbs={<PackageBreadcrumbs packageObject={currentPackage} />}
        header={
          <>
            <ToolbarTitle value={currentPackage?.name} />
            <Typography sx={{ ml: 2 }} variant="subtitle3">
              Version
            </Typography>
            <VersionSelector />
            {versionContent &&
              <CustomChip value={versionContent!.status} sx={{ height: 20 }} data-testid="VersionStatusChip"/>}
            <WarningApiProcessorVersion packageKey={packageId} versionKey={versionId} />
            <Divider orientation="vertical" sx={{ height: '20px', mt: '6px' }}/>
            {isDashboard && <CreateDashboardVersionButton
              variant="text"
              disabled={!hasCreateVersionPermissions}
              primaryButtonProps={{ sx: { borderRight: 'none !important', px: 0 } }}
            />}
            {isPackage && <ButtonWithHint
              disabled={!hasCreateVersionPermissions}
              disableHint={hasCreateVersionPermissions}
              hint="You do not have permission to edit the version"
              startIcon={<AddIcon color="#0068FF" />}
              tooltipMaxWidth="unset"
              onClick={handleCreateVersionClick}
              data-testid="AddNewVersionButton"
            />}
          </>
        }
        action={
          <Box display="flex" gap={2}>
            <CopyPackageVersionButton />
            {!isDashboard && fullVersion && (
              <Button
                variant="outlined"
                onClick={() => {
                  const hasRestApi = !!versionContent?.operationTypes?.[API_TYPE_REST]
                  if (hasRestApi) {
                    showExportSettingsDialog({
                      exportedEntity: ExportedEntityKind.VERSION,
                      packageId: packageId!,
                      version: fullVersion,
                    })
                  } else {
                    downloadVersionDocumentation({ packageKey: packageId!, version: fullVersion })
                  }
                }}
                data-testid="ExportVersionButton"
              >
                Export
              </Button>
            )}

            <ComparisonSelectorButton showCompareGroups={showCompareGroups} />

            <EditButton
              disabled={!hasEditPermission || filesHaveFolders}
              hint={getEditButtonHint(hasEditPermission, filesHaveFolders, latestRevision)}
              isDashboard={isDashboard}
            />
            <PackageSettingsButton packageKey={packageId!} />
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
