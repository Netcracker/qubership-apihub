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
import { useParams } from 'react-router-dom'
import type { PopupProps } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { PopupDelegate } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { SHOW_PUBLISH_PACKAGE_VERSION_DIALOG } from '@apihub/routes/EventBusProvider'
import { SPECIAL_VERSION_KEY } from '@netcracker/qubership-apihub-ui-shared/entities/versions'
import { type Package, WORKSPACE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
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
import { useDashboardVersionFromCSVPublicationStatuses } from '@apihub/routes/root/PortalPage/usePublicationStatus'
import { usePublishDashboardVersionFromCSV } from '@apihub/routes/root/PortalPage/usePublishDashboardVersionFromCSV'
import { usePackages } from '@apihub/routes/root/usePackages'
import { usePackageVersions } from '@netcracker/qubership-apihub-ui-shared/hooks/versions/usePackageVersions'

export const PublishDashboardVersionFromCSVDialog: FC = memo(() => {
  return (
    <PopupDelegate
      type={SHOW_PUBLISH_PACKAGE_VERSION_DIALOG}
      render={props => <PublishDashboardVersionFromCSVPopup {...props} open/>}
    />
  )
})

const PublishDashboardVersionFromCSVPopup: FC<PopupProps> = memo<PopupProps>(({ open, setOpen }) => {
  const { versionId } = useParams()
  const [packageObj, isPackageLoading] = usePackage()
  const packagePermissions = useMemo(() => packageObj?.permissions ?? [], [packageObj])
  const releaseVersionPattern = useMemo(() => packageObj?.releaseVersionPattern, [packageObj])

  const [versionsFilter, setVersionsFilter] = useState('')
  const [versions, areVersionsLoading] = usePackageVersions({ textFilter: versionsFilter })
  const [targetVersion, setTargetVersion] = useState<Key>('')
  const isEditingVersion = !!versionId && versionId !== SPECIAL_VERSION_KEY

  const currentVersion = useMemo(
    () => (isEditingVersion ? versions.find(({ key }) => key === versionId) : null),
    [isEditingVersion, versionId, versions],
  )

  const onVersionsFilter = useCallback((value: Key) => setVersionsFilter(value), [setVersionsFilter])
  const versionLabelsMap = useMemo(() => getVersionLabelsMap(versions), [versions])
  const getVersionLabels = useCallback((version: Key) => versionLabelsMap[version] ?? [], [versionLabelsMap])

  const [workspacesFilter, setWorkspacesFilter] = useState('')
  const [workspaces, areWorkspacesLoading] = usePackages({
    kind: WORKSPACE_KIND,
    textFilter: workspacesFilter,
  })
  const onWorkspacesFilter = useCallback((value: Key) => setWorkspacesFilter(value), [setWorkspacesFilter])

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

  const { publishId, publish, isPublishStarting, isPublishStartedSuccessfully } = usePublishDashboardVersionFromCSV()
  const [isPublishing, isPublished, isPublishError] = useDashboardVersionFromCSVPublicationStatuses(packageObj?.key ?? '', publishId ?? '', targetVersion)
  const isPublishInProgress =
    isPublishStarting ||
    isPublishStartedSuccessfully && !isPublished && !isPublishError ||
    isPublishing

  useEffect(() => { isPublishStartedSuccessfully && isPublished && setOpen(false) }, [isPublishStartedSuccessfully, isPublished, setOpen])

  const onPublish = useCallback(async ({
    version,
    status,
    labels,
    previousVersion,
    workspace,
    file,
  }: PublishInfo): Promise<void> => {
    setTargetVersion(version)

    publish({
      packageKey: packageObj!.key,
      value: {
        versionLabels: labels,
        csvFile: file!,
        servicesWorkspaceId: workspace!.key,
        version: version,
        status: status,
        previousVersion: replaceEmptyPreviousVersion(previousVersion),
      },
    })
  }, [packageObj, publish])

  return (
    <VersionDialogForm
      open={open}
      title="Publish Dashboard Version"
      setOpen={setOpen}
      onSubmit={handleSubmit(onPublish)}
      control={control}
      setValue={setValue}
      formState={formState}
      workspaces={workspaces}
      onWorkspacesFilter={onWorkspacesFilter}
      areWorkspacesLoading={areWorkspacesLoading}
      versions={Object.keys(versionLabelsMap)}
      onVersionsFilter={onVersionsFilter}
      areVersionsLoading={areVersionsLoading}
      previousVersions={previousVersionOptions}
      getVersionLabels={getVersionLabels}
      packagePermissions={packagePermissions}
      releaseVersionPattern={releaseVersionPattern}
      isPublishing={isPublishInProgress}
      hideCSVRelatedFields={false}
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
  file?: File
  previousVersion: Key
  workspace?: Package | null
}>
