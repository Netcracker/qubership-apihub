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
import { memo, useCallback, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { OperationGroupTable } from './OperationGroupTable'
import { usePackageVersionContent } from '../../../../usePackageVersionContent'
import { CreateOperationGroupDialog } from './CreateOperationGroupDialog'
import { EditOperationGroupDialog } from './EditOperationGroupDialog'
import { useDeleteOperationGroup } from './useManageOperationGroup'
import { useGroupingNamesByApiType } from './useGroupingNamesByApiType'
import { EditOperationGroupContentDialog } from '../EditOperationGroupContentDialog/EditOperationGroupContentDialog'
import { useFullMainVersion } from '../../../FullMainVersionProvider'
import type { OperationGroup } from '@netcracker/qubership-apihub-ui-shared/entities/operation-groups'
import { useEventBus } from '@apihub/routes/EventBusProvider'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { PACKAGE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { useCurrentPackage } from '@apihub/components/CurrentPackageProvider'
import { ConfirmationDialog } from '@netcracker/qubership-apihub-ui-shared/components/ConfirmationDialog'
import {
  DRAFT_VERSION_STATUS,
  VERSION_STATUS_MANAGE_PERMISSIONS,
} from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import { ButtonWithHint } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/ButtonWithHint'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { PublishOperationGroupPackageVersionDialog } from './PublishOperationGroupPackageVersionDialog'

export const OperationGroupsCard: FC = memo(() => {
  const { packageId: packageKey } = useParams()
  const currentPackage = useCurrentPackage()

  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState<OperationGroup>()

  const fullVersion = useFullMainVersion()
  const {
    showCreateOperationGroupDialog,
    showEditOperationGroupDialog,
    showEditOperationGroupContentDialog,
    showPublishOperationGroupPackageVersionDialog: showPublishGroupPackageVersionDialog,
  } = useEventBus()
  const { deleteOperationGroup, isLoading: isDeleteLoading } = useDeleteOperationGroup()
  const { versionContent, isLoading } = usePackageVersionContent({
    packageKey: packageKey,
    versionKey: fullVersion,
    includeGroups: true,
    includeSummary: true,
  })

  const apiTypes = useMemo(
    () => Object.keys(versionContent?.operationTypes ?? {}) as ApiType[],
    [versionContent],
  )

  const groupNamesByApiTypes = useGroupingNamesByApiType(apiTypes, versionContent?.operationGroups)

  const hasCreatePermissions = useMemo(() =>
    !!currentPackage?.permissions?.includes(VERSION_STATUS_MANAGE_PERMISSIONS[versionContent?.status ?? DRAFT_VERSION_STATUS]),
    [currentPackage?.permissions, versionContent?.status])

  const onCreateButton = useCallback(() => {
    showCreateOperationGroupDialog({
      packageKey: packageKey!,
      versionKey: fullVersion!,
      existsGroupNames: groupNamesByApiTypes,
    })
  }, [showCreateOperationGroupDialog, packageKey, fullVersion, groupNamesByApiTypes])

  const onEditButton = useCallback((group: OperationGroup) => {
    showEditOperationGroupDialog({
      packageKey: packageKey!,
      versionKey: fullVersion!,
      groupInfo: group,
      existsGroupNames: groupNamesByApiTypes,
      templateName: group.exportTemplateFileName,
    })
  }, [showEditOperationGroupDialog, packageKey, fullVersion, groupNamesByApiTypes])

  const onEditContentButton = useCallback((group: OperationGroup) => {
    showEditOperationGroupContentDialog({
      packageKey: packageKey!,
      versionKey: fullVersion!,
      groupInfo: group,
    })
  }, [showEditOperationGroupContentDialog, packageKey, fullVersion])

  const onDeleteButton = useCallback((group: OperationGroup) => {
    setGroupToDelete(group)
    setDeleteConfirmationOpen(true)
  }, [])

  const onPublishButton = useCallback((group: OperationGroup) => {
    showPublishGroupPackageVersionDialog({ group })
  }, [showPublishGroupPackageVersionDialog])

  const isPackage = useMemo(() => currentPackage?.kind === PACKAGE_KIND, [currentPackage?.kind])
  const operationGroups = useMemo(() => (
    versionContent?.operationGroups ? [...versionContent.operationGroups] : []
  ), [versionContent?.operationGroups])

  return (
    <BodyCard
      header="Groups"
      action={
        <ButtonWithHint
          variant="contained"
          title="Create Manual Group"
          disabled={!hasCreatePermissions}
          disableHint={hasCreatePermissions}
          hint="You don't have permission to create a group"
          onClick={onCreateButton}
          testId="CreateGroupButton"
        />
      }
      body={
        <>
          <OperationGroupTable
            groups={operationGroups}
            isPackage={isPackage}
            isLoading={isLoading}
            onEdit={onEditButton}
            onDelete={onDeleteButton}
            onEditContent={onEditContentButton}
            onPublish={onPublishButton}
          />
          <CreateOperationGroupDialog />
          <EditOperationGroupDialog />
          <EditOperationGroupContentDialog />
          <PublishOperationGroupPackageVersionDialog />
          <ConfirmationDialog
            open={deleteConfirmationOpen}
            title="Delete Group"
            message={`Delete
            ${groupToDelete?.groupName} group from the dashboard?`}
            loading={isDeleteLoading}
            confirmButtonName="Delete"
            onConfirm={() => deleteOperationGroup({
              packageKey: packageKey!,
              versionKey: fullVersion!,
              groupName: groupToDelete!.groupName,
              apiType: groupToDelete!.apiType!,
            })}
            onCancel={() => setDeleteConfirmationOpen(false)}
          />
        </>
      }
    />
  )
})
