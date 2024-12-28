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
import * as React from 'react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import type { PublishProjectVersionDialogDetails } from '../../../../EventBusProvider'
import { SHOW_PUBLISH_PROJECT_VERSION_DIALOG, useEventBus } from '../../../../EventBusProvider'

import { useForm } from 'react-hook-form'
import { useSaveChanges } from '../useSaveChanges'
import { useBranchChangeCount } from '../useBranchChanges'
import { useBwcVersionKey, useSetBwcVersionKey } from '../BwcVersionKeyProvider'
import { usePublishProjectVersion } from '../usePublishProjectVersion'
import type { BwcProblems } from '../useBwcProblems'
import { NO_BWC_PROBLEMS, useBwcProblems } from '../useBwcProblems'

import { usePackage, usePackageKey } from '../../../usePackage'
import { useProject } from '../../../useProject'
import { NO_PREVIOUS_RELEASE_VERSION_OPTION, usePreviousVersionOptions } from '../usePreviousVersionOptions'
import type { PopupProps } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { PopupDelegate } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import { DRAFT_VERSION_STATUS } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import type { Key, VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { getVersionLabelsMap } from '@netcracker/qubership-apihub-ui-shared/utils/versions'
import { waitForSocketEvent } from '@netcracker/qubership-apihub-ui-shared/utils/sockets'
import type { VersionFormData } from '@netcracker/qubership-apihub-ui-shared/components/VersionDialogForm'
import { EMPTY_VERSION_KEY, VersionDialogForm } from '@netcracker/qubership-apihub-ui-shared/components/VersionDialogForm'
import { usePackageVersions } from '@netcracker/qubership-apihub-ui-shared/hooks/versions/usePackageVersions'

export const PublishProjectVersionDialog: FC = memo(() => {
  return (
    <PopupDelegate
      type={SHOW_PUBLISH_PROJECT_VERSION_DIALOG}
      render={props => <PublishProjectVersionPopup {...props}/>}
    />
  )
})

const BWC_PROBLEMS_MASSAGE = 'There are backward compatibility problems with this version'

const PublishProjectVersionPopup: FC<PopupProps> = memo<PopupProps>(({ open, setOpen, detail }) => {
  const version = useMemo(() => {
    if (!detail) {
      return undefined
    }
    return (detail as PublishProjectVersionDialogDetails).version
  }, [detail])

  const defaultValues = useMemo(() => ({
    version: version ?? '',
    status: DRAFT_VERSION_STATUS as VersionStatus,
    labels: [],
    previousVersion: NO_PREVIOUS_RELEASE_VERSION_OPTION,
  }), [version])

  const { showBwcPublishProjectVersionDialog } = useEventBus()
  const [project] = useProject()
  const { packageKey } = project ?? { packageKey: '' }
  const [packageObj] = usePackage(packageKey)
  const packagePermissions = useMemo(() => packageObj?.permissions ?? [], [packageObj])
  const releaseVersionPattern = useMemo(() => packageObj?.releaseVersionPattern, [packageObj])

  const defaultPackageKey = usePackageKey()
  const [versionsFilter, setVersionsFilter] = useState('')
  const [versions, areVersionsLoading] = usePackageVersions({ packageKey: defaultPackageKey, textFilter: versionsFilter })

  const previousVersionOptions = usePreviousVersionOptions()

  const { handleSubmit, control, reset, setValue, formState } = useForm<VersionFormData>({ defaultValues })
  const bwcVersionKey = useBwcVersionKey()
  const setBwcVersionKey = useSetBwcVersionKey()
  const [selectedPreviousVersion, setSelectedPreviousVersion] = useState<VersionKey>(() => bwcVersionKey ?? NO_PREVIOUS_RELEASE_VERSION_OPTION)
  const [bwcProblems, , isBwcChecking, checkBwcProblems] = useBwcProblems(selectedPreviousVersion)
  useEffect(() => {bwcVersionKey && setSelectedPreviousVersion(bwcVersionKey)}, [bwcVersionKey])
  const bwcProblemsMassage = useMemo(
    () => (bwcProblems.size !== 0 && !isBwcChecking ? BWC_PROBLEMS_MASSAGE : null),
    [bwcProblems.size, isBwcChecking],
  )

  const saveAvailable = useBranchChangeCount() > 0
  const [saveChanges, isSaveLoading, isSaveSuccess] = useSaveChanges()
  const [publishProject, isPublishLoading, isPublishSuccess] = usePublishProjectVersion()

  useEffect(() => {isSaveSuccess && setOpen(false)}, [setOpen, isSaveSuccess])
  useEffect(() => {isPublishSuccess && setOpen(false)}, [setOpen, isPublishSuccess])
  useEffect(() => {reset(defaultValues)}, [defaultValues, reset])

  // todo sync between shared and editor PackageVersion types until dont changes all places in Editor
  const versionLabelsMap = useMemo(() => getVersionLabelsMap(versions.map((version) => ({
    key: version.key,
    status: version.status,
    versionLabels: version.versionLabels,
    latestRevision: version.latestRevision,
    createdBy: version.createdBy,
  }))), [versions])
  const getVersionLabels = useCallback((version: Key) => versionLabelsMap[version] ?? [], [versionLabelsMap])

  const onVersionsFilter = useCallback((value: Key) => setVersionsFilter(value), [setVersionsFilter])

  const onPublish = useCallback(async (data: VersionFormData): Promise<void> => {
    async function findBwcProblems(previousVersion: VersionKey): Promise<BwcProblems> {
      if (!previousVersion || previousVersion === NO_PREVIOUS_RELEASE_VERSION_OPTION) {
        return NO_BWC_PROBLEMS
      }
      setBwcVersionKey(previousVersion)
      const { data } = await checkBwcProblems()
      return data ?? NO_BWC_PROBLEMS
    }

    const bwcProblems: BwcProblems = await findBwcProblems(selectedPreviousVersion)

    const previousVersion = selectedPreviousVersion === NO_PREVIOUS_RELEASE_VERSION_OPTION
      ? EMPTY_VERSION_KEY
      : selectedPreviousVersion

    if (bwcProblems && bwcProblems.size > 0) {
      setOpen(false)
      showBwcPublishProjectVersionDialog({
        message: data.message,
        version: data.version,
        status: data.status,
        labels: data.labels,
        previousVersion: previousVersion,
      })
      return Promise.resolve()
    }

    if (saveAvailable && !version) {
      await saveChanges({
        message: data.message!,
      })
      await waitForSocketEvent()
    }

    publishProject({
      version: data.version,
      status: data.status,
      labels: data.labels,
      previousVersion: previousVersion,
    })
  }, [selectedPreviousVersion, saveAvailable, version, publishProject, setBwcVersionKey, checkBwcProblems, setOpen, showBwcPublishProjectVersionDialog, saveChanges])

  return (
    <VersionDialogForm
      title={saveAvailable ? 'Save & Publish' : 'Publish'}
      open={open}
      setOpen={setOpen}
      onSubmit={handleSubmit(onPublish)}
      onVersionsFilter={onVersionsFilter}
      areVersionsLoading={areVersionsLoading}
      control={control}
      setValue={setValue}
      formState={formState}
      versions={Object.keys(versionLabelsMap)}
      previousVersions={previousVersionOptions}
      getVersionLabels={getVersionLabels}
      packagePermissions={packagePermissions}
      releaseVersionPattern={releaseVersionPattern}
      isPublishing={isSaveLoading || isPublishLoading || isBwcChecking}
      extraValidationMassage={bwcProblemsMassage}
      setSelectedPreviousVersion={setSelectedPreviousVersion}
      hideDescriptorField
      hideCopyPackageFields
      hideDescriptorVersionField
      hideSaveMessageField={!saveAvailable && !version}
    />
  )
})
