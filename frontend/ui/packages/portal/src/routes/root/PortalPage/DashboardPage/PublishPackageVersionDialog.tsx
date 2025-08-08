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
  getVersionOptions,
  replaceEmptyPreviousVersion,
  usePreviousVersionOptions,
  VersionDialogForm,
} from '@netcracker/qubership-apihub-ui-shared/components/VersionDialogForm'
import { takeIf } from '@netcracker/qubership-apihub-ui-shared/utils/objects'
import { usePackageVersionConfig } from '@apihub/routes/root/PortalPage/usePackageVersionConfig'

export const PublishPackageVersionDialog: FC = memo(() => {
  return (
    <PopupDelegate
      type={SHOW_PUBLISH_PACKAGE_VERSION_DIALOG}
      render={props => <PublishPackageVersionPopup {...props}/>}
    />
  )
})

const PublishPackageVersionPopup: FC<PopupProps> = memo<PopupProps>(({ open, setOpen }) => {
  const { versionId: currentVersionId } = useParams()
  const [currentPackage, isPackageLoading] = usePackage()
  
  const [currentVersionConfig, isCurrentVersionLoading] = usePackageVersionConfig(currentPackage?.key, currentVersionId)
  
  const isEditingVersion = !!currentVersionId && currentVersionId !== SPECIAL_VERSION_KEY
  const packageKind = currentPackage?.kind
  const isDashboard = packageKind === DASHBOARD_KIND
  const isPackage = packageKind === PACKAGE_KIND

  const { filesWithLabels } = useFiles()
  const versionId = useMemo(() => {
    return isEditingVersion
      ? getSplittedVersionKey(currentVersionId).versionKey ?? ''
      : ''
  }, [isEditingVersion, currentVersionId])

  const [targetVersion, setTargetVersion] = useState<Key>(versionId)
  const [versionsFilter, setVersionsFilter] = useState('')

  const {
    versions: filteredVersions,
    areVersionsLoading: areFilteredVersionsLoading,
  } = usePackageVersions({ textFilter: versionsFilter })
  const { versions: previousVersions } = usePackageVersions({ status: RELEASE_VERSION_STATUS })
  const previousVersionOptions = usePreviousVersionOptions(previousVersions)
  const [publishPackage, isPublishLoading, isPublishSuccess] = usePublishPackageVersion()
  const dashboardRefs = useDashboardReferences()

  const versionLabelsMap = useMemo(() => getVersionLabelsMap(filteredVersions), [filteredVersions])
  const versionOptions = useMemo(() => getVersionOptions(versionLabelsMap, targetVersion), [targetVersion, versionLabelsMap])
  const packagePermissions = useMemo(() => currentPackage?.permissions ?? [], [currentPackage])
  const releaseVersionPattern = useMemo(() => currentPackage?.releaseVersionPattern, [currentPackage])

  const defaultValues: VersionFormData = useMemo(() => {
    return {
      version: versionId,
      status: DRAFT_VERSION_STATUS,
      labels: [],
      previousVersion: NO_PREVIOUS_RELEASE_VERSION_OPTION,
    }
  }, [versionId])
  const { handleSubmit, control, setValue, formState, reset } = useForm<VersionFormData>({ defaultValues })

  const onVersionsFilter = useCallback((value: Key) => setVersionsFilter(value), [setVersionsFilter])
  const getVersionLabels = useCallback((version: Key) => versionLabelsMap[version] ?? [], [versionLabelsMap])
  const onSetTargetVersion = useCallback((version: string) => setTargetVersion(version), [])

  useEffect(() => {isPublishSuccess && setOpen(false)}, [setOpen, isPublishSuccess])
  useEffect(() => {reset(defaultValues)}, [defaultValues, reset])
  useEffect(() => {
    if (currentVersionConfig) {
      setValue('status', currentVersionConfig.status as VersionStatus || DRAFT_VERSION_STATUS)
      setValue('labels', currentVersionConfig.metaData?.versionLabels ?? [])
      setValue('previousVersion', currentVersionConfig.previousVersion || NO_PREVIOUS_RELEASE_VERSION_OPTION)
    }
  }, [currentVersionConfig, setValue])

  const onPublish = useCallback(async (data: PublishInfo): Promise<void> => {
    const previousVersion = replaceEmptyPreviousVersion(data.previousVersion)

    publishPackage({
      version: data.version,
      status: data.status,
      labels: data.labels,
      previousVersion: previousVersion,
      ...takeIf({
        files: Object.entries(filesWithLabels)?.map(([key, { labels }]) => ({
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
      versions={versionOptions}
      onVersionsFilter={onVersionsFilter}
      areVersionsLoading={areFilteredVersionsLoading}
      previousVersions={previousVersionOptions}
      getVersionLabels={getVersionLabels}
      packagePermissions={packagePermissions}
      releaseVersionPattern={releaseVersionPattern}
      onSetTargetVersion={onSetTargetVersion}
      isPublishing={isPublishLoading}
      hideDescriptorField
      hideCopyPackageFields
      hideDescriptorVersionField
      hideSaveMessageField
      publishButtonDisabled={isPackageLoading}
      publishFieldsDisabled={isPackageLoading || isCurrentVersionLoading}
      currentPackageKey={currentPackage?.key}
    />
  )
})

type PublishInfo = Readonly<{
  version: Key
  status: VersionStatus
  labels: string[]
  previousVersion: Key
}>
