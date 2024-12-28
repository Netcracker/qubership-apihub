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
import { Box, Button } from '@mui/material'
import { useNavigate, useParams } from 'react-router-dom'
import { PackageBreadcrumbs } from '../../PackageBreadcrumbs'
import { useFiles } from '../FilesProvider'
import { useBackwardLocationContext } from '@apihub/routes/BackwardLocationProvider'
import { useEventBus } from '@apihub/routes/EventBusProvider'
import { useCurrentPackage } from '@apihub/components/CurrentPackageProvider'
import { isNotEmptyRecord } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { Toolbar } from '@netcracker/qubership-apihub-ui-shared/components/Toolbar'
import { ToolbarTitle } from '@netcracker/qubership-apihub-ui-shared/components/ToolbarTitle'
import { ButtonWithHint } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/ButtonWithHint'
import { ExitIcon } from '@netcracker/qubership-apihub-ui-shared/icons/ExitIcon'
import { CustomChip } from '@netcracker/qubership-apihub-ui-shared/components/CustomChip'
import { usePackageVersionContent } from '@apihub/routes/root/usePackageVersionContent'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'
import { VersionTitle } from '@netcracker/qubership-apihub-ui-shared/components/Titles/VersionTitle'

export const PackageVersionPageToolbar: FC = memo(() => {
  const { packageId, versionId } = useParams()
  const navigate = useNavigate()
  const backwardLocation = useBackwardLocationContext()
  const { showPublishPackageVersionDialog } = useEventBus()
  const { filesWithLabels } = useFiles()
  const hasFilesToPublish = isNotEmptyRecord(filesWithLabels)

  const previousPageLocation = useMemo(() => {
    return backwardLocation.fromPackage ?? { pathname: '/portal' }
  }, [backwardLocation])

  const navigateToPrevPage = useCallback(() => {
    navigate(previousPageLocation)
  }, [previousPageLocation, navigate])

  const { versionContent } = usePackageVersionContent({
    packageKey: packageId,
    versionKey: versionId,
  })

  const { status, version, latestRevision } = versionContent ?? {}
  const { versionKey, revisionKey } = getSplittedVersionKey(version)

  const currentPackage = useCurrentPackage()

  return (
    <Toolbar
      breadcrumbs={<PackageBreadcrumbs packageObject={currentPackage}/>}
      header={
        <>
          <ToolbarTitle value={`${currentPackage?.name}: Edit Version `}/>
          {versionContent &&
            <Box display="flex" gap={1} alignItems="center" sx={{ ml: 2 }}>
              <VersionTitle
                version={versionKey}
                revision={revisionKey}
                latestRevision={latestRevision}
                subtitleVariant
              />
              <CustomChip value={status!}/>
            </Box>
          }
        </>
      }
      action={
        <Box display="flex" gap={2}>
          <ButtonWithHint
            variant="contained"
            disabled={!hasFilesToPublish}
            disableHint={hasFilesToPublish}
            hint="Add at least one file to publish package version"
            onClick={showPublishPackageVersionDialog}
            title="Publish"
            tooltipMaxWidth="unset"
            testId="PublishButton"
          />
          <Button
            startIcon={<ExitIcon/>}
            variant="outlined"
            onClick={navigateToPrevPage}
            data-testid="ExitButton"
          >
            Exit
          </Button>
        </Box>
      }
    />
  )
})
