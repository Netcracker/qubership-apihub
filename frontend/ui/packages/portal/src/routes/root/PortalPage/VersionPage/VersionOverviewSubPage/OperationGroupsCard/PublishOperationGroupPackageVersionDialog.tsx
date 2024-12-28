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
import type { PopupProps } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { PopupDelegate } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import type { PublishOperationGroupPackageVersionDetail } from '@apihub/routes/EventBusProvider'
import { SHOW_PUBLISH_OPERATION_GROUP_PACKAGE_VERSION_DIALOG } from '@apihub/routes/EventBusProvider'
import type { VersionFormData } from '@netcracker/qubership-apihub-ui-shared/components/VersionDialogForm'
import { replaceEmptyPreviousVersion, usePreviousVersionOptions, VersionDialogForm } from '@netcracker/qubership-apihub-ui-shared/components/VersionDialogForm'
import { useForm } from 'react-hook-form'
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import { DRAFT_VERSION_STATUS, NO_PREVIOUS_RELEASE_VERSION_OPTION, RELEASE_VERSION_STATUS } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import type { Package } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { PACKAGE_KIND, WORKSPACE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { usePackages } from '@apihub/routes/root/usePackages'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { useCurrentPackage } from '@apihub/components/CurrentPackageProvider'
import { usePackageVersions } from '@netcracker/qubership-apihub-ui-shared/hooks/versions/usePackageVersions'
import { getVersionLabelsMap } from '@netcracker/qubership-apihub-ui-shared/utils/versions'
import { usePublishOperationGroupPackageVersion } from '../../../usePublishOperationGroupPackageVersion'
import { useOperationGroupPublicationStatuses } from '../../../usePublicationStatus'
import { useFullMainVersion } from '../../../FullMainVersionProvider'
import { REST_API_TYPE } from '@netcracker/qubership-apihub-api-processor'

export const PublishOperationGroupPackageVersionDialog: FC = memo(() => {
  return (
    <PopupDelegate
      type={SHOW_PUBLISH_OPERATION_GROUP_PACKAGE_VERSION_DIALOG}
      render={props => <PublishOperationGroupPackageVersionPopup {...props} />}
    />
  )
})

const PublishOperationGroupPackageVersionPopup: FC<PopupProps> = memo<PopupProps>(({ open, setOpen, detail }) => {
  const { group } = detail as PublishOperationGroupPackageVersionDetail
  const currentPackage = useCurrentPackage()
  const currentVersionId = useFullMainVersion()

  const [targetPackage, setTargetPackage] = useState<Package | null>()
  const [targetVersion, setTargetVersion] = useState<Key>('')

  const [workspace, setWorkspace] = useState<Package | null>(currentPackage?.parents?.[0] ?? null)
  const [workspacesFilter, setWorkspacesFilter] = useState('')
  const [workspaces, areWorkspacesLoading] = usePackages({
    kind: WORKSPACE_KIND,
    textFilter: workspacesFilter,
  })

  const [packagesFilter, setPackagesFilter] = useState('')
  const [packages, arePackagesLoading] = usePackages({
    kind: PACKAGE_KIND,
    parentId: workspace?.key,
    showAllDescendants: true,
    textFilter: packagesFilter,
  })

  const [versionsFilter, setVersionsFilter] = useState('')
  const [versionsWithRevisions, areVersionsLoading] = usePackageVersions({
    packageKey: targetPackage?.key,
    enabled: !!targetPackage,
    textFilter: versionsFilter,
  })
  const versionLabelsMap = useMemo(() => getVersionLabelsMap(versionsWithRevisions), [versionsWithRevisions])
  const versions = useMemo(() => Object.keys(versionLabelsMap), [versionLabelsMap])
  const getVersionLabels = useCallback((version: Key) => versionLabelsMap[version] ?? [], [versionLabelsMap])

  const [targetPackagePreviousVersions] = usePackageVersions({
    packageKey: targetPackage?.key,
    enabled: !!targetPackage,
    status: RELEASE_VERSION_STATUS,
  })
  const targetVersionsPreviousVersionOptions = usePreviousVersionOptions(targetPackagePreviousVersions)

  const onWorkspacesFilter = useCallback((value: Key) => setWorkspacesFilter(value), [setWorkspacesFilter])
  const onSetWorkspace = useCallback((workspace: Package | null) => setWorkspace(workspace), [])
  const onPackagesFilter = useCallback((value: Key) => setPackagesFilter(value), [setPackagesFilter])
  const onSetTargetPackage = useCallback((pack: Package | null) => {
    setTargetPackage(pack)
  }, [])
  const onVersionsFilter = useCallback((value: Key) => setVersionsFilter(value), [setVersionsFilter])

  const targetPackagePermissions = useMemo(() => targetPackage?.permissions ?? [], [targetPackage?.permissions])
  const targetReleaseVersionPattern = useMemo(() => targetPackage?.releaseVersionPattern, [targetPackage?.releaseVersionPattern])

  const defaultValues = useMemo(() => {
    return {
      workspace: workspace,
      version: undefined,
      status: DRAFT_VERSION_STATUS as VersionStatus,
      labels: [],
      previousVersion: NO_PREVIOUS_RELEASE_VERSION_OPTION,
    }
  }, [workspace])

  const { handleSubmit, control, reset, setValue, formState } = useForm<VersionFormData>({ defaultValues })

  const { publishId, publishOperationGroupPackageVersion, isLoading: isPublishStarting, isSuccess: isPublishStartedSuccessfully } = usePublishOperationGroupPackageVersion()
  const [isPublishing, isPublished] = useOperationGroupPublicationStatuses(targetPackage?.key ?? '', targetVersion, group.groupName, publishId ?? '')

  useEffect(() => { isPublishStartedSuccessfully && isPublished && setOpen(false) }, [isPublishStartedSuccessfully, isPublished, setOpen])
  useEffect(() => { reset(defaultValues) }, [defaultValues, reset])

  const onPublish = useCallback(async (data: PublishInfo): Promise<void> => {
    const previousVersion = replaceEmptyPreviousVersion(data.previousVersion)
    setTargetVersion(data.version)
    publishOperationGroupPackageVersion({
      packageKey: currentPackage?.key ?? '',
      versionKey: currentVersionId!,
      groupName: group.groupName,
      apiType: REST_API_TYPE,
      value: {
        targetPackageKey: data.package!.key,
        targetVersionKey: data.version,
        status: data.status,
        previousVersion: previousVersion,
        versionLabels: data.labels,
      },
    })
  }, [currentPackage?.key, currentVersionId, group.groupName, publishOperationGroupPackageVersion])

  return (
    <VersionDialogForm
      title={`Publish ${group.groupName} as Package Version`}
      open={open}
      setOpen={setOpen}
      onSubmit={handleSubmit(onPublish)}
      control={control}
      setValue={setValue}
      formState={formState}

      workspaces={workspaces}
      onSetWorkspace={onSetWorkspace}
      onWorkspacesFilter={onWorkspacesFilter}
      areWorkspacesLoading={areWorkspacesLoading}

      packages={packages}
      onPackagesFilter={onPackagesFilter}
      arePackagesLoading={arePackagesLoading}
      onSetTargetPackage={onSetTargetPackage}
      packagesTitle='Package'

      versions={versions}
      onVersionsFilter={onVersionsFilter}
      areVersionsLoading={areVersionsLoading}
      getVersionLabels={getVersionLabels}
      previousVersions={targetVersionsPreviousVersionOptions}

      packagePermissions={targetPackagePermissions}
      releaseVersionPattern={targetReleaseVersionPattern}

      isPublishing={isPublishStarting || isPublishing}

      hideDescriptorField
      hideDescriptorVersionField
      hideSaveMessageField
    />
  )
})

type PublishInfo = Readonly<{
  package?: Package | null
  version: Key
  status: VersionStatus
  labels: string[]
  previousVersion: Key
}>
