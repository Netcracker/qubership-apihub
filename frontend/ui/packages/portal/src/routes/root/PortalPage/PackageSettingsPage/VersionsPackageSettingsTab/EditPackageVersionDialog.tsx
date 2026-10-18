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
import { memo, useCallback, useEffect, useMemo } from 'react'
import type { PopupProps } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { PopupDelegate } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import type { ShowEditPackageVersionDetail } from '@apihub/routes/EventBusProvider'
import { SHOW_EDIT_PACKAGE_VERSION_DIALOG } from '@apihub/routes/EventBusProvider'
import { useForm } from 'react-hook-form'
import type { VersionFormData } from '@netcracker/qubership-apihub-ui-shared/components/VersionDialogForm'
import { VersionDialogForm } from '@netcracker/qubership-apihub-ui-shared/components/VersionDialogForm'
import { useEditPackageVersion } from '@apihub/routes/root/usePackageVersions'

export const EditPackageVersionDialog: FC = memo(() => {
  return (
    <PopupDelegate
      type={SHOW_EDIT_PACKAGE_VERSION_DIALOG}
      render={props => <EditPackageVersionPopup {...props}/>}
    />
  )
})

const EditPackageVersionPopup: FC<PopupProps> = memo<PopupProps>(({ open, setOpen, detail }) => {
  const {
    packageKey,
    permissions,
    releaseVersionPattern,
    version,
    status,
    versionLabels,
  } = detail as ShowEditPackageVersionDetail
  const [editPackageVersion, isLoading, isSuccess] = useEditPackageVersion()

  useEffect(() => {isSuccess && setOpen(false)}, [isSuccess, setOpen])

  const defaultValues = useMemo(() => ({
    version: version,
    status: status,
    labels: versionLabels ?? [],
  }), [status, version, versionLabels])

  const { handleSubmit, control, setValue, formState } = useForm<VersionFormData>({ defaultValues })

  const onPublish = useCallback(({ version, status, labels }: VersionFormData) => {
    editPackageVersion({
      packageKey: packageKey,
      version: version!,
      value: {
        status: status,
        versionLabels: labels,
      },
      oldValue: {
        status: defaultValues.status,
        versionLabels: defaultValues.labels,
      },
    })
  }, [defaultValues, editPackageVersion, packageKey])

  return (
    <VersionDialogForm
      open={open}
      setOpen={setOpen}
      title="Edit Version"
      submitButtonTittle="Save"
      onSubmit={handleSubmit(onPublish)}
      control={control}
      setValue={setValue}
      formState={formState}
      packagePermissions={permissions}
      releaseVersionPattern={releaseVersionPattern}
      isPublishing={isLoading}
      hideDescriptorField
      hideCopyPackageFields
      hideDescriptorVersionField
      hideSaveMessageField
      hidePreviousVersionField
    />
  )
})
