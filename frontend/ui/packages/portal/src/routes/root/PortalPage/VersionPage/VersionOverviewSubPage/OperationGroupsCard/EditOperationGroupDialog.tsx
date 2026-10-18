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
import React, { memo, useCallback, useEffect, useMemo } from 'react'
import { useUpdateOperationGroupParameters } from './useManageOperationGroup'
import type { OperationGroupParameters } from './OperationGroupParametersPopup'
import { OperationGroupParametersPopup } from './OperationGroupParametersPopup'
import type { PopupProps } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { PopupDelegate } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import type { EditOperationGroupDetail } from '@apihub/routes/EventBusProvider'
import { SHOW_EDIT_OPERATION_GROUP_DIALOG } from '@apihub/routes/EventBusProvider'

export const EditOperationGroupDialog: FC = memo(() => {
  return (
    <PopupDelegate
      type={SHOW_EDIT_OPERATION_GROUP_DIALOG}
      render={props => <EditOperationGroupPopup {...props}/>}
    />
  )
})

const EditOperationGroupPopup: FC<PopupProps> = memo<PopupProps>(({ open, setOpen, detail }) => {
  const { updateOperationGroupParameters, isLoading, isSuccess } = useUpdateOperationGroupParameters()
  const {
    packageKey,
    versionKey,
    existsGroupNames,
    groupInfo,
    templateName,
  } = detail as EditOperationGroupDetail ?? ''

  useEffect(() => {
    if (isSuccess) {
      setOpen(false)
    }
  }, [isSuccess, setOpen])

  const onSubmit = useCallback(
    (values: OperationGroupParameters) => {
      updateOperationGroupParameters({
        packageKey: packageKey,
        versionKey: versionKey,
        oldGroupName: groupInfo.groupName,
        ...values,
      })
    },
    [updateOperationGroupParameters, packageKey, versionKey, groupInfo.groupName],
  )

  const defaultValues: OperationGroupParameters = useMemo(() => ({
    groupName: groupInfo.groupName,
    apiType: groupInfo.apiType!,
    description: groupInfo.description,
  }), [groupInfo])

  return (
    <OperationGroupParametersPopup
      title={`Edit ${groupInfo.groupName} Group`}
      submitText="Update"
      submitLoading={isLoading}
      existsGroupNames={existsGroupNames}
      open={open}
      setOpen={setOpen}
      onSubmit={onSubmit}
      detail={defaultValues}
      templateName={templateName}
      isPrefixGroup={groupInfo.isPrefixGroup}
    />
  )
})
