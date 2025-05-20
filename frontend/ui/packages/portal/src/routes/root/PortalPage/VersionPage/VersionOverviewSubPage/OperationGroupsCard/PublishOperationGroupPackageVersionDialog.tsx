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
import {
  getPackageOptions,
  getVersionOptions,
  replaceEmptyPreviousVersion,
  usePreviousVersionOptions,
  VersionDialogForm,
} from '@netcracker/qubership-apihub-ui-shared/components/VersionDialogForm'
import { useForm } from 'react-hook-form'
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import {
  DRAFT_VERSION_STATUS,
  NO_PREVIOUS_RELEASE_VERSION_OPTION,
  RELEASE_VERSION_STATUS,
} from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import type { Package } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { PACKAGE_KIND, WORKSPACE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { usePackages } from '@apihub/routes/root/usePackages'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { useCurrentPackage } from '@apihub/components/CurrentPackageProvider'
import { usePackageVersions } from '@netcracker/qubership-apihub-ui-shared/hooks/versions/usePackageVersions'
import { getSplittedVersionKey, getVersionLabelsMap } from '@netcracker/qubership-apihub-ui-shared/utils/versions'
import { usePublishOperationGroupPackageVersion } from '../../../usePublishOperationGroupPackageVersion'
import { useOperationGroupPublicationStatuses } from '../../../usePublicationStatus'
import { useFullMainVersion } from '../../../FullMainVersionProvider'
import { REST_API_TYPE } from '@netcracker/qubership-apihub-api-processor'
import { usePackageVersionConfig } from '@apihub/routes/root/PortalPage/usePackageVersionConfig'

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

  const [currentVersionConfig] = usePackageVersionConfig(currentPackage?.key, currentVersionId)
  const [currentWorkspace] = useState(currentPackage?.parents?.[0] ?? null)
  const [versionId] = useState(getSplittedVersionKey(currentVersionId).versionKey)

  const [targetWorkspace, setTargetWorkspace] = useState<Package | null>(currentWorkspace)
  const [workspacesFilter, setWorkspacesFilter] = useState('')
  const [targetPackage, setTargetPackage] = useState<Package | null>(null)
  const [packagesFilter, setPackagesFilter] = useState('')
  const [targetVersion, setTargetVersion] = useState<Key>(versionId)
  const [versionsFilter, setVersionsFilter] = useState('')

  const [workspaces, areWorkspacesLoading] = usePackages({
    kind: WORKSPACE_KIND,
    textFilter: workspacesFilter,
  })
  const { versions: targetPreviousVersions } = usePackageVersions({
    packageKey: targetPackage?.key,
    enabled: !!targetPackage,
    status: RELEASE_VERSION_STATUS,
  })

  const [packages, arePackagesLoading] = usePackages({
    kind: PACKAGE_KIND,
    parentId: targetWorkspace?.key,
    showAllDescendants: true,
    textFilter: packagesFilter,
  })
  const { versions: filteredVersions, areVersionsLoading: areFilteredVersionsLoading } = usePackageVersions({
    packageKey: targetPackage?.key,
    enabled: !!targetPackage,
    textFilter: versionsFilter,
  })

  const targetPreviousVersionOptions = usePreviousVersionOptions(targetPreviousVersions)
  const {
    publishId,
    publishOperationGroupPackageVersion,
    isLoading: isPublishStarting,
    isSuccess: isPublishStartedSuccessfully,
  } = usePublishOperationGroupPackageVersion()
  const [isPublishing, isPublished] = useOperationGroupPublicationStatuses(targetPackage?.key ?? '', targetVersion, group.groupName, publishId ?? '')

  const versionLabelsMap = useMemo(() => getVersionLabelsMap(filteredVersions), [filteredVersions])
  const versionOptions = useMemo(() => getVersionOptions(versionLabelsMap, targetVersion), [targetVersion, versionLabelsMap])
  const packageOptions = useMemo(() => getPackageOptions(packages, targetPackage, !!packagesFilter), [packages, packagesFilter, targetPackage])
  const workspaceOptions = useMemo(() => getPackageOptions(workspaces, targetWorkspace, !!workspacesFilter), [targetWorkspace, workspaces, workspacesFilter])
  const targetPackagePermissions = useMemo(() => targetPackage?.permissions ?? [], [targetPackage?.permissions])
  const targetReleaseVersionPattern = useMemo(() => targetPackage?.releaseVersionPattern, [targetPackage?.releaseVersionPattern])

  const defaultValues: VersionFormData = useMemo(() => {
    return {
      package: null,
      workspace: currentWorkspace,
      version: versionId,
      status: DRAFT_VERSION_STATUS,
      labels: [],
      previousVersion: NO_PREVIOUS_RELEASE_VERSION_OPTION,
    }
  }, [currentWorkspace, versionId])

  const getVersionLabels = useCallback((version: Key) => versionLabelsMap[version] ?? [], [versionLabelsMap])
  const onWorkspacesFilter = useCallback((value: Key) => setWorkspacesFilter(value), [setWorkspacesFilter])
  const onSetWorkspace = useCallback((workspace: Package | null) => setTargetWorkspace(workspace), [])
  const onPackagesFilter = useCallback((value: Key) => setPackagesFilter(value), [setPackagesFilter])
  const onSetTargetPackage = useCallback((pack: Package | null) => setTargetPackage(pack), [])
  const onVersionsFilter = useCallback((value: Key) => setVersionsFilter(value), [setVersionsFilter])
  const onSetTargetVersion = useCallback((version: string) => setTargetVersion(version), [])

  const { handleSubmit, control, reset, setValue, formState } = useForm<VersionFormData>({ defaultValues })

  useEffect(() => { isPublishStartedSuccessfully && isPublished && setOpen(false) }, [isPublishStartedSuccessfully, isPublished, setOpen])
  useEffect(() => { reset(defaultValues) }, [defaultValues, reset])
  useEffect(() => {
    if (!targetWorkspace) {
      setTargetPackage(null)
      setValue('package', null)
    }
  }, [targetWorkspace, setValue])
  useEffect(() => {
    if (currentVersionConfig) {
      setValue('status', currentVersionConfig.status as VersionStatus || DRAFT_VERSION_STATUS)
      setValue('labels', currentVersionConfig.metaData?.versionLabels ?? [])
    }
  }, [currentVersionConfig, setValue])

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

      workspaces={workspaceOptions}
      onSetWorkspace={onSetWorkspace}
      onWorkspacesFilter={onWorkspacesFilter}
      areWorkspacesLoading={areWorkspacesLoading}

      packages={packageOptions}
      onPackagesFilter={onPackagesFilter}
      arePackagesLoading={arePackagesLoading}
      onSetTargetPackage={onSetTargetPackage}
      packagesTitle="Package"

      versions={versionOptions}
      onVersionsFilter={onVersionsFilter}
      areVersionsLoading={areFilteredVersionsLoading}
      getVersionLabels={getVersionLabels}
      previousVersions={targetPreviousVersionOptions}
      onSetTargetVersion={onSetTargetVersion}
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
