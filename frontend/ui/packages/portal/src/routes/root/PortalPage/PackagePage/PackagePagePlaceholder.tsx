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
import { Box, Button, capitalize, Link } from '@mui/material'
import { NavLink, useParams } from 'react-router-dom'
import { getVersionPath, useNavigation } from '../../../NavigationProvider'
import { useBackwardLocation } from '../../useBackwardLocation'
import { useBackwardLocationContext, useSetBackwardLocationContext } from '@apihub/routes/BackwardLocationProvider'
import { CONTENT_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import type { PackageKind } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { SPECIAL_VERSION_KEY } from '@netcracker/qubership-apihub-ui-shared/entities/versions'
import { EmptyPackageDialog } from '@netcracker/qubership-apihub-ui-shared/components/EmptyPackageDialog'
import { useEventBus } from '@apihub/routes/EventBusProvider'
import { PACKAGE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'

export type PackagePagePlaceholderProps = {
  kind: PackageKind
}
export const PackagePagePlaceholder: FC<PackagePagePlaceholderProps> = memo<PackagePagePlaceholderProps>(({ kind }) => {
  const { packageId } = useParams()
  const location = useBackwardLocation()
  const backwardLocation = useBackwardLocationContext()
  const setBackwardLocation = useSetBackwardLocationContext()

  const { showEmptyPackageDialog } = useEventBus()
  const { navigateToVersion, navigateToAgent, navigateToEditor } = useNavigation()

  const handleClick = useCallback(
    () => setBackwardLocation({ ...backwardLocation, fromPackage: location }),
    [backwardLocation, location, setBackwardLocation],
  )

  const handleNavigateToEdit = useCallback(
    () => {
      handleClick()
      navigateToVersion({ packageKey: packageId!, versionKey: SPECIAL_VERSION_KEY, edit: true })
    },
    [handleClick, navigateToVersion, packageId],
  )

  const emptyPackageData = useMemo(() => [
    {
      label: 'Create a new version in the Portal',
      navigate: handleNavigateToEdit,
      description: 'Upload files from your local file system, and publish the version.',
      testId: 'ToPortalButton',
    },
    {
      label: 'Go to Agent',
      navigate: navigateToAgent,
      description: 'Discover the API documentation in your environment, and promote it to the package in Portal.',
      testId: 'ToAgentButton',
    },
    {
      label: 'Go to the Editor',
      navigate: navigateToEditor,
      description: 'Publish a version from the Editor project connected to the Git repository.',
      testId: 'ToEditorButton',
    },
  ], [handleNavigateToEdit, navigateToAgent, navigateToEditor])

  const handleShowEmptyPackageDialog = useCallback(() => showEmptyPackageDialog({
    emptyPackageData,
  }), [emptyPackageData, showEmptyPackageDialog])

  return (
    <Placeholder
      invisible={!kind}
      area={CONTENT_PLACEHOLDER_AREA}
      message={
        <Box>
          {capitalize(kind)} is empty.&nbsp;
          {kind === PACKAGE_KIND ? (
            <Box>
              <Button
                sx={{ '&:hover': { backgroundColor: '#2E3A5217' } }}
                onClick={handleShowEmptyPackageDialog}
                data-testid="HowToUploadButton"
              >
                How to Upload API documentation?
              </Button>
              <EmptyPackageDialog/>
            </Box>
          ) : (
            <>
              <Link component={NavLink}
                    to={getVersionPath({ packageKey: packageId!, versionKey: SPECIAL_VERSION_KEY, edit: true })}
                    onClick={handleClick}
                    data-testid="CreateVersionLink">
                Create
              </Link>
              &nbsp;new<br/>{kind} version.
            </>
          )}
        </Box>
      }
    />
  )
})
