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
import { memo, useCallback, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { PackageBreadcrumbs } from '../../PackageBreadcrumbs'
import { Box, Button } from '@mui/material'
import { useDashboardReferences } from './DashboardReferencesProvider'
import { usePackageVersionContent } from '../../usePackageVersionContent'
import { useNavigation } from '../../../NavigationProvider'
import { useRecursiveDashboardName } from './RecursiveDashboardNameContextProvider'
import type { Package } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { SPECIAL_VERSION_KEY } from '@netcracker/qubership-apihub-ui-shared/entities/versions'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'
import { useEventBus } from '@apihub/routes/EventBusProvider'
import { isEmpty, isNotEmptyMap } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { Toolbar } from '@netcracker/qubership-apihub-ui-shared/components/Toolbar'
import { ToolbarTitle } from '@netcracker/qubership-apihub-ui-shared/components/ToolbarTitle'
import { CustomChip } from '@netcracker/qubership-apihub-ui-shared/components/CustomChip'
import { ButtonWithHint } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/ButtonWithHint'
import { ExitIcon } from '@netcracker/qubership-apihub-ui-shared/icons/ExitIcon'
import { useDeletedReferences } from '@apihub/routes/root/PortalPage/useDeletedReferences'
import { VersionTitle } from '@netcracker/qubership-apihub-ui-shared/components/Titles/VersionTitle'

type ConfigureDashboardToolbarProps = {
  packageObject: Package | null
}

export const ConfigureDashboardToolbar: FC<ConfigureDashboardToolbarProps> = memo(({ packageObject }) => {
  const { packageId, versionId } = useParams()
  const isEditingVersion = versionId && versionId !== SPECIAL_VERSION_KEY
  const toolbarTitle = `${packageObject?.name}: ${isEditingVersion ? 'Edit' : 'Create New'} Version`

  const { navigateToVersion, navigateToPackage } = useNavigation()
  const { versionContent } = usePackageVersionContent({ packageKey: packageId, versionKey: versionId })
  const { status, version, latestRevision } = versionContent ?? {}
  const { versionKey, revisionKey } = getSplittedVersionKey(version)

  const { showPublishPackageVersionDialog } = useEventBus()

  const navigateToMainPage = useCallback(() => {
    versionId !== SPECIAL_VERSION_KEY ? navigateToVersion({
      packageKey: packageId!,
      versionKey: getSplittedVersionKey(version, latestRevision).versionKey,
    }) : navigateToPackage({ packageKey: packageId! })
  }, [versionId, navigateToVersion, packageId, version, latestRevision, navigateToPackage])

  const dashboardContent = useDashboardReferences()
  const { data: deletedReferences } = useDeletedReferences(packageId!, versionId!)
  const recursiveDashboardName = useRecursiveDashboardName()

  const [isPublishButtonDisabled, publishButtonHint] = useMemo(() => {
    if (isEmpty(dashboardContent)) {
      return [true, 'Add at least one package/dashboard to publish dashboard version.']
    }
    if (isNotEmptyMap(deletedReferences)) {
      return [true, 'The dashboard references deleted package or dashboard version. Remove deleted versions from the dashboard before publishing.']
    }
    if (recursiveDashboardName) {
      return [true, `Included dashboard versions form a cycle: ${packageObject?.name} -> ${recursiveDashboardName} -> ${packageObject?.name}. Eliminate the cycle before publishing.`]
    }
    return [false, '']
  }, [dashboardContent, deletedReferences, recursiveDashboardName, packageObject?.name])

  return (
    <>
      <Toolbar
        breadcrumbs={<PackageBreadcrumbs packageObject={packageObject}/>}
        header={
          <>
            <ToolbarTitle value={toolbarTitle}/>
            {isEditingVersion && (
              <Box display="flex" gap={1} alignItems="center" sx={{ ml: 2 }}>
                <VersionTitle
                  version={versionKey}
                  revision={revisionKey}
                  latestRevision={latestRevision}
                  subtitleVariant
                />
                <CustomChip value={status!} data-testid="VersionStatusChip"/>
              </Box>
            )}
          </>
        }
        action={
          <Box display="flex" gap={2}>
            <ButtonWithHint
              variant="contained"
              disabled={isPublishButtonDisabled}
              disableHint={!isPublishButtonDisabled}
              hint={publishButtonHint}
              onClick={showPublishPackageVersionDialog}
              title="Publish"
              testId="PublishButton"
            />
            <Button
              startIcon={<ExitIcon/>}
              variant="outlined"
              onClick={navigateToMainPage}
              data-testid="ExitButton"
            >
              Exit
            </Button>
          </Box>
        }
      />
    </>
  )
})


