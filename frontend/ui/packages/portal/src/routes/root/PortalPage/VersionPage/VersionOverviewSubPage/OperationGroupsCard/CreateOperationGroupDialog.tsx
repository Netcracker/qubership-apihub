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
import React, { memo, useCallback, useEffect, useState } from 'react'
import { useCreateOperationGroup } from './useManageOperationGroup'
import type { OperationGroupParameters } from './OperationGroupParametersPopup'
import { OperationGroupParametersPopup } from './OperationGroupParametersPopup'
import type { PopupProps } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { PopupDelegate } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import type { CreateOperationGroupDetail } from '@apihub/routes/EventBusProvider'
import { SHOW_CREATE_OPERATION_GROUP_DIALOG, useEventBus } from '@apihub/routes/EventBusProvider'
import type { OperationGroup } from '@netcracker/qubership-apihub-ui-shared/entities/operation-groups'

export const CreateOperationGroupDialog: FC = memo(() => {
  return (
    <PopupDelegate
      type={SHOW_CREATE_OPERATION_GROUP_DIALOG}
      render={props => <CreateOperationGroupPopup {...props}/>}
    />
  )
})

const CreateOperationGroupPopup: FC<PopupProps> = memo<PopupProps>(({ open, setOpen, detail }) => {
  const { createOperationGroup, isLoading, isSuccess } = useCreateOperationGroup()
  const { packageKey, versionKey, existsGroupNames } = detail as CreateOperationGroupDetail ?? ''
  const { showEditOperationGroupContentDialog } = useEventBus()
  const [creatingGroup, setCreatingGroup] = useState<OperationGroup | null>(null)

  useEffect(() => {
    if (isSuccess) {
      setOpen(false)
      showEditOperationGroupContentDialog({
        packageKey: packageKey,
        versionKey: versionKey,
        groupInfo: creatingGroup!,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess])

  const onSubmit = useCallback(
    (values: OperationGroupParameters) => {
      setCreatingGroup({
        groupName: values.groupName,
        description: values.description ?? '',
        apiType: values.apiType,
        isPrefixGroup: false,
        operationsCount: 0,
        template: values.template,
      })
      createOperationGroup({
        packageKey: packageKey,
        versionKey: versionKey,
        ...values,
      })
    },
    [createOperationGroup, packageKey, versionKey],
  )

  return (
    <OperationGroupParametersPopup
      title="Create Manual Group"
      submitText="Create"
      submitLoading={isLoading}
      existsGroupNames={existsGroupNames}
      open={open}
      setOpen={setOpen}
      onSubmit={onSubmit}
    />
  )
})
