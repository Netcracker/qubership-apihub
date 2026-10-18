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
import { memo, useCallback, useEffect, useMemo } from 'react'
import type { PopupProps } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { PopupDelegate } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import type { ShowEditPackageVersionDetail } from '@portal/routes/EventBusProvider'
import { SHOW_EDIT_PACKAGE_VERSION_DIALOG } from '@portal/routes/EventBusProvider'
import { useForm, useWatch } from 'react-hook-form'
import type { VersionFormData } from '@netcracker/qubership-apihub-ui-shared/components/VersionDialogForm'
import { VersionDialogForm } from '@netcracker/qubership-apihub-ui-shared/components/VersionDialogForm'
import { useEditPackageVersion } from '@portal/routes/root/usePackageVersions'
import { RELEASE_VERSION_STATUS } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import { useVersionProblemDetails } from '@netcracker/qubership-apihub-ui-shared/hooks/versions/useVersionProblemDetails'
import { VERSION_PROBLEM_DIALOG_SURFACE } from '@netcracker/qubership-apihub-ui-shared/hooks/versions/versionProblemDetails'
import { VersionErrorIndicator } from '@netcracker/qubership-apihub-ui-shared/components/ErrorIndicators/VersionErrorIndicator'

export const EditPackageVersionDialog: FC = memo(() => {
  return (
    <PopupDelegate
      type={SHOW_EDIT_PACKAGE_VERSION_DIALOG}
      render={props => <EditPackageVersionPopup {...props}/>}
    />
  )
})

EditPackageVersionDialog.displayName = 'EditPackageVersionDialog'

const EditPackageVersionPopup: FC<PopupProps> = memo<PopupProps>(({ open, setOpen, detail }) => {
  const {
    packageKey,
    permissions,
    releaseVersionPattern,
    version,
    status: initialStatus,
    versionLabels,
    hasErrors,
    changelogHasErrors,
    apiProcessorVersion,
    kind,
  } = (detail ?? {}) as ShowEditPackageVersionDetail

  const [editPackageVersion, isLoading, isSuccess] = useEditPackageVersion()
  useEffect(() => { isSuccess && setOpen(false) }, [isSuccess, setOpen])

  const defaultValues = useMemo(() => ({
    version: version,
    status: initialStatus,
    labels: versionLabels ?? [],
  }), [initialStatus, version, versionLabels])

  const { handleSubmit, control, setValue, formState } = useForm<VersionFormData>({ defaultValues })

  const currentStatus = useWatch({ control: control, name: 'status' })
  const isReleasePromotion = initialStatus !== RELEASE_VERSION_STATUS && currentStatus === RELEASE_VERSION_STATUS

  const {
    isBlocking: isReleasePromotionBlocking,
    formHelperText: releasePromotionFormHelperText,
    hasProblems,
  } = useVersionProblemDetails({
    packageKey: packageKey,
    versionKey: version,
    hasErrors: hasErrors,
    changelogHasErrors: changelogHasErrors,
    apiProcessorVersion: apiProcessorVersion,
    kind: kind,
    surface: isReleasePromotion ? VERSION_PROBLEM_DIALOG_SURFACE.EDIT_STATUS : undefined,
  })

  const statusErrorIndicator = isReleasePromotion && hasProblems ? (
    <VersionErrorIndicator
      versionKey={version}
      hasErrors={hasErrors}
      changelogHasErrors={changelogHasErrors}
      apiProcessorVersion={apiProcessorVersion}
      kind={kind}
    />
  ) : undefined

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
      kind={kind}
      formHelperText={releasePromotionFormHelperText}
      isBlocking={isReleasePromotionBlocking}
      statusErrorIndicator={statusErrorIndicator}
      hideDescriptorField
      hideCopyPackageFields
      hideDescriptorVersionField
      hideSaveMessageField
      hidePreviousVersionField
    />
  )
})

EditPackageVersionPopup.displayName = 'EditPackageVersionPopup'
