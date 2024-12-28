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
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { usePackage } from '../../usePackage'
import { usePackageVersions } from '@netcracker/qubership-apihub-ui-shared/hooks/versions/usePackageVersions'
import { useParams } from 'react-router-dom'
import { useFiles } from '../FilesProvider'
import { usePublishPackageVersion } from '../usePublishPackageVersion'
import { useDashboardReferences } from './DashboardReferencesProvider'
import { filesRecordToArray } from '../PackagePage/files'
import type { PopupProps } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { PopupDelegate } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { SHOW_PUBLISH_PACKAGE_VERSION_DIALOG } from '@apihub/routes/EventBusProvider'
import { SPECIAL_VERSION_KEY } from '@netcracker/qubership-apihub-ui-shared/entities/versions'
import { DASHBOARD_KIND, PACKAGE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { getSplittedVersionKey, getVersionLabelsMap } from '@netcracker/qubership-apihub-ui-shared/utils/versions'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import {
  DRAFT_VERSION_STATUS,
  NO_PREVIOUS_RELEASE_VERSION_OPTION,
  RELEASE_VERSION_STATUS,
} from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import type { VersionFormData } from '@netcracker/qubership-apihub-ui-shared/components/VersionDialogForm'
import {
  replaceEmptyPreviousVersion,
  usePreviousVersionOptions,
  VersionDialogForm,
} from '@netcracker/qubership-apihub-ui-shared/components/VersionDialogForm'
import { takeIf } from '@netcracker/qubership-apihub-ui-shared/utils/objects'

export const PublishPackageVersionDialog: FC = memo(() => {
  return (
    <PopupDelegate
      type={SHOW_PUBLISH_PACKAGE_VERSION_DIALOG}
      render={props => <PublishPackageVersionPopup {...props}/>}
    />
  )
})

const PublishPackageVersionPopup: FC<PopupProps> = memo<PopupProps>(({ open, setOpen }) => {
  const { versionId } = useParams()
  const [packageObj, isPackageLoading] = usePackage()
  const packagePermissions = useMemo(() => packageObj?.permissions ?? [], [packageObj])
  const releaseVersionPattern = useMemo(() => packageObj?.releaseVersionPattern, [packageObj])

  const [versionsFilter, setVersionsFilter] = useState('')
  const [versions, areVersionsLoading] = usePackageVersions({ textFilter: versionsFilter })
  const { filesWithLabels } = useFiles() || {}
  const isEditingVersion = !!versionId && versionId !== SPECIAL_VERSION_KEY

  const packageKind = packageObj?.kind
  const isDashboard = packageKind === DASHBOARD_KIND
  const isPackage = packageKind === PACKAGE_KIND

  const currentVersion = useMemo(
    () => (isEditingVersion ? versions.find(({ key }) => key === versionId) : null),
    [isEditingVersion, versionId, versions],
  )

  const onVersionsFilter = useCallback((value: Key) => setVersionsFilter(value), [setVersionsFilter])
  const versionLabelsMap = useMemo(() => getVersionLabelsMap(versions), [versions])
  const getVersionLabels = useCallback((version: Key) => versionLabelsMap[version] ?? [], [versionLabelsMap])

  const defaultValues = useMemo(() => {
    const { status, versionLabels, previousVersion } = currentVersion || {}
    return {
      version: isEditingVersion ? getSplittedVersionKey(versionId).versionKey : '',
      status: status || DRAFT_VERSION_STATUS,
      labels: versionLabels || [],
      previousVersion: previousVersion || NO_PREVIOUS_RELEASE_VERSION_OPTION,
    }
  }, [currentVersion, isEditingVersion, versionId])

  const [previousVersion] = usePackageVersions({ status: RELEASE_VERSION_STATUS })
  const previousVersionOptions = usePreviousVersionOptions(previousVersion)

  const { handleSubmit, control, setValue, formState } = useForm<VersionFormData>({ defaultValues })

  const [publishPackage, isPublishLoading, isPublishSuccess] = usePublishPackageVersion()

  useEffect(() => {isPublishSuccess && setOpen(false)}, [setOpen, isPublishSuccess])

  const dashboardRefs = useDashboardReferences()

  const onPublish = useCallback(async (data: PublishInfo): Promise<void> => {
    const previousVersion = replaceEmptyPreviousVersion(data.previousVersion)

    publishPackage({
      version: data.version,
      status: data.status,
      labels: data.labels,
      previousVersion: previousVersion,
      ...takeIf({
        files: filesWithLabels && Object.entries(filesWithLabels)?.map(([key, { labels }]) => ({
          fileId: key,
          labels: labels,
          publish: true,
        })),
        sources: filesRecordToArray(filesWithLabels),
      }, isPackage),
      refs: isDashboard ? dashboardRefs.map(ref => ref.packageReference) : [],
    })
  }, [dashboardRefs, filesWithLabels, isDashboard, isPackage, publishPackage])

  return (
    <VersionDialogForm
      open={open}
      setOpen={setOpen}
      onSubmit={handleSubmit(onPublish)}
      control={control}
      setValue={setValue}
      formState={formState}
      versions={Object.keys(versionLabelsMap)}
      onVersionsFilter={onVersionsFilter}
      areVersionsLoading={areVersionsLoading}
      previousVersions={previousVersionOptions}
      getVersionLabels={getVersionLabels}
      packagePermissions={packagePermissions}
      releaseVersionPattern={releaseVersionPattern}
      isPublishing={isPublishLoading}
      hideDescriptorField
      hideCopyPackageFields
      hideDescriptorVersionField
      hideSaveMessageField
      publishButtonDisabled={isPackageLoading}
    />
  )
})

type PublishInfo = Readonly<{
  version: Key
  status: VersionStatus
  labels: string[]
  previousVersion: Key
}>
