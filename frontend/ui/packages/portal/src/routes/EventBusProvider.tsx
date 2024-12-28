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

import type { FC, PropsWithChildren } from 'react'
import { createContext, memo, useContext, useState } from 'react'
import { createEventBus, slot } from 'ts-event-bus'
import type { Path } from '@remix-run/router'
import type {
  SpecificationDialogDetail,
} from '@netcracker/qubership-apihub-ui-shared/components/SpecificationDialog/SpecificationDialog'
import {
  SHOW_SPECIFICATION_DIALOG,
} from '@netcracker/qubership-apihub-ui-shared/components/SpecificationDialog/SpecificationDialog'
import type { SearchCriteria } from '@apihub/entities/global-search'
import type { Key, VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { PackageKind } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import type { PackagePermissions } from '@netcracker/qubership-apihub-ui-shared/entities/package-permissions'
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import type { OperationGroup } from '@netcracker/qubership-apihub-ui-shared/entities/operation-groups'
import type { ApiAudience, ApiKind, OperationData, OperationsGroupedByTag } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import type { Spec } from '@netcracker/qubership-apihub-ui-shared/entities/specs'
import type { ShowDeleteRoleDetail } from '@netcracker/qubership-apihub-ui-shared/components/DeleteRoleDialog'
import { SHOW_DELETE_ROLE_DIALOG } from '@netcracker/qubership-apihub-ui-shared/components/DeleteRoleDialog'
import type { ShowEditRoleDetail } from '@netcracker/qubership-apihub-ui-shared/components/EditRoleDialog'
import { SHOW_EDIT_ROLE_DIALOG } from '@netcracker/qubership-apihub-ui-shared/components/EditRoleDialog'
import type { ShowDeleteFileDetail } from '@netcracker/qubership-apihub-ui-shared/components/FileTableUpload/DeleteFileDialog'
import { SHOW_DELETE_FILE_DIALOG } from '@netcracker/qubership-apihub-ui-shared/components/FileTableUpload/DeleteFileDialog'
import type { PackageReference } from '@netcracker/qubership-apihub-ui-shared/entities/version-references'
import { SHOW_ADD_SYSTEM_ADMINISTRATOR_DIALOG } from '@netcracker/qubership-apihub-ui-shared/components/AddSystemAdministratorDialog'
import type {
  ShowEditFileLabelsDetail,
} from '@netcracker/qubership-apihub-ui-shared/components/FileTableUpload/EditFileLabelsDialog'
import { SHOW_EDIT_FILE_LABELS_DIALOG } from '@netcracker/qubership-apihub-ui-shared/components/FileTableUpload/EditFileLabelsDialog'
import type { ShowEmptyPackageDetail } from '@netcracker/qubership-apihub-ui-shared/components/EmptyPackageDialog'
import { SHOW_EMPTY_PACKAGE_DIALOG } from '@netcracker/qubership-apihub-ui-shared/components/EmptyPackageDialog'
import { SHOW_ADD_USER_DIALOG, SHOW_USER_ROLES_DIALOG } from '@netcracker/qubership-apihub-ui-shared/types/dialogs'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

// base
export const SHOW_SUCCESS_NOTIFICATION = 'show-success-notification'
export const SHOW_ERROR_NOTIFICATION = 'show-error-notification'
export const SHOW_INFO_NOTIFICATION = 'show-info-notification'
export const SHOW_CREATE_PACKAGE_DIALOG = 'show-create-package-dialog'

// portal
export const SHOW_MODEL_USAGES_DIALOG = 'show-model-usages-dialog'
export const SHOW_COMPARE_VERSIONS_DIALOG = 'show-compare-versions-dialog'
export const SHOW_COMPARE_REVISIONS_DIALOG = 'show-compare-revisions-dialog'
export const SHOW_COMPARE_OPERATIONS_DIALOG = 'show-compare-operations-dialog'
export const SHOW_COMPARE_REST_GROUPS_DIALOG = 'show-compare-rest-groups-dialog'
export const SHOW_COMPARE_OPERATIONS_WITH_UPLOADED_FILE_DIALOG = 'show-compare-operations-with-uploaded-file-dialog'
export const SHOW_GLOBAL_SEARCH_PANEL = 'show-global-search-panel'
export const HIDE_GLOBAL_SEARCH_PANEL = 'hide-global-search-panel'
export const APPLY_GLOBAL_SEARCH_FILTERS = 'apply-global-search-filters'
export const SHOW_EDIT_WORKSPACES_LIST_DIALOG = 'show-edit-workspaces-list-dialog'
export const SHOW_EDIT_PACKAGE_VERSION_DIALOG = 'show-edit-package-version-dialog'
export const SHOW_EDIT_PACKAGE_PREFIX_DIALOG = 'show-edit-package-prefix-dialog'
export const SHOW_ADD_PACKAGE_DIALOG = 'show-add-package-dialog'
export const SHOW_PUBLISH_PACKAGE_VERSION_DIALOG = 'show-publish-package-version-dialog'
export const SHOW_PUBLISH_OPERATION_GROUP_PACKAGE_VERSION_DIALOG = 'show-publish-operation-group-package-version-dialog'
export const SHOW_COPY_PACKAGE_VERSION_DIALOG = 'show-copy-package-version-dialog'
export const SHOW_CREATE_CUSTOM_SERVER_DIALOG = 'show-create-custom-server-dialog'
export const SHOW_EXAMPLES_DIALOG = 'show-examples-dialog'
// Feature 'Edit Manual Operation Group'
export const SHOW_CREATE_OPERATION_GROUP_DIALOG = 'show-create-operation-group-dialog'
export const SHOW_EDIT_OPERATION_GROUP_DIALOG = 'show-edit-operation-group-dialog'
export const SHOW_EDIT_OPERATION_GROUP_CONTENT_DIALOG = 'show-edit-operation-group-content-dialog'
export const REF_PACKAGE_SELECTED = 'ref-package-selected'
export const API_KIND_SELECTED = 'api-kind-selected'
export const API_AUDIENCE_SELECTED = 'api-audience-selected'
export const TAG_SELECTED = 'tag-selected'
export const OPERATION_MOVED = 'operation-moved'

export type NotificationDetail = {
  title?: string
  message: string
  link?: LinkType
  button?: ButtonType
}

export type LinkType = {
  name: string
  href: string
}

export type ButtonType = {
  title: string
  onClick: () => void
}

export type GlobalSearchPanelDetails = {
  filters: Omit<SearchCriteria, 'searchString'>
  apiSearchMode: boolean
}

export type ShowCreatePackageDetail = {
  parentPackageKey: Key
  kind: PackageKind
}

export type ShowEditPackageVersionDetail = {
  packageKey: string
  permissions: PackagePermissions
  releaseVersionPattern: string | undefined
  version: VersionKey
  status?: VersionStatus
  versionLabels?: string[]
}

export type CreateOperationGroupDetail = {
  packageKey: Key
  versionKey: Key
  existsGroupNames: Map<ApiType, ReadonlyArray<string>>
}

export type EditOperationGroupDetail = CreateOperationGroupDetail & {
  groupInfo: OperationGroup
  templateName?: string
}

export type EditOperationGroupContentDetails = {
  packageKey: Key
  versionKey: VersionKey
  groupInfo: OperationGroup
}

export type ModelUsagesDetail = {
  modelName: string
  usages: Promise<OperationsGroupedByTag>
  prepareLinkFn: (operation: OperationData) => Partial<Path>
}

export type PortalSpecificationDialogDetail = {
  spec: Spec
  value: string
}

export type PublishOperationGroupPackageVersionDetail = {
  group: OperationGroup
}

export const OPERATIONS_ADD_TO_GROUP_ACTION = 'addToGroup'
export const OPERATIONS_REMOVE_FROM_GROUP_ACTION = 'removeFromGroup'
export type OperationsMovementDetails =
  | typeof OPERATIONS_ADD_TO_GROUP_ACTION
  | typeof OPERATIONS_REMOVE_FROM_GROUP_ACTION

export type ShowEditPackagePrefixDetail = {
  packageKey?: string
}

type EventBus = {
  // base
  showSuccessNotification: (detail: NotificationDetail) => void
  showErrorNotification: (detail: NotificationDetail) => void
  showInfoNotification: (detail: NotificationDetail) => void
  showCreatePackageDialog: (detail: ShowCreatePackageDetail) => void
  showGlobalSearchPanel: () => void
  hideGlobalSearchPanel: () => void
  applyGlobalSearchFilters: (details: GlobalSearchPanelDetails) => void

  // portal
  showCompareVersionsDialog: () => void
  showCompareRevisionsDialog: () => void
  showCompareSpecsDialog: () => void
  showCompareSpecsByUrlDialog: () => void
  showCompareSpecPathsDialog: () => void
  showCompareOperationsDialog: () => void
  showCompareRestGroupsDialog: () => void
  showCompareOperationsWithUploadedFileDialog: () => void
  showAddUserDialog: () => void
  showAddSystemAdministratorDialog: () => void
  showEditWorkspacesListDialog: () => void
  showEditPackageVersionDialog: (detail: ShowEditPackageVersionDetail) => void
  showEditPackagePrefixDialog: (detail: ShowEditPackagePrefixDetail) => void
  showAddPackageDialog: () => void
  showPublishPackageVersionDialog: () => void
  showPublishOperationGroupPackageVersionDialog: (detail: PublishOperationGroupPackageVersionDetail) => void
  showCopyPackageVersionDialog: () => void
  showCreateCustomServerDialog: () => void
  showExamplesDialog: () => void
  showEmptyPackageDialog: (detail: ShowEmptyPackageDetail) => void
  showDeleteRoleDialog: (detail: ShowDeleteRoleDetail) => void
  showEditRoleDialog: (detail: ShowEditRoleDetail) => void
  showSpecificationDialog: (detail: PortalSpecificationDialogDetail) => void
  showDeleteFileDialog: (detail: ShowDeleteFileDetail) => void
  showEditFileLabelsDialog: (detail: ShowEditFileLabelsDetail) => void
  showUserRolesDialog: () => void
  // Feature "Edit Manual Operation Groups"
  showCreateOperationGroupDialog: (detail: CreateOperationGroupDetail) => void
  showEditOperationGroupDialog: (detail: EditOperationGroupDetail) => void
  showEditOperationGroupContentDialog: (detail: EditOperationGroupContentDetails) => void
  showModelUsagesDialog: (detail: ModelUsagesDetail) => void
  onRefPackageSelected: (value?: PackageReference | null) => void
  onApiKindSelected: (value?: ApiKind) => void
  onApiAudienceSelected: (value?: ApiAudience) => void
  onTagSelected: (value?: string) => void
  onOperationMoved: (value: OperationsMovementDetails) => void
}

function eventBusProvider(): EventBus {
  const eventBus = createEventBus({
    events: {
      // base
      showSuccessNotification: slot<NotificationDetail>(),
      showErrorNotification: slot<NotificationDetail>(),
      showInfoNotification: slot<NotificationDetail>(),
      showCreatePackageDialog: slot<ShowCreatePackageDetail>(),
      showGlobalSearchPanel: slot(),
      hideGlobalSearchPanel: slot(),
      applyGlobalSearchFilters: slot<GlobalSearchPanelDetails>(),

      // portal
      showCompareVersionsDialog: slot(),
      showCompareRevisionsDialog: slot(),
      showCompareSpecsDialog: slot(),
      showCompareSpecsByUrlDialog: slot(),
      showCompareSpecPathsDialog: slot(),
      showCompareOperationsDialog: slot(),
      showCompareRestGroupsDialog: slot(),
      showCompareOperationsWithUploadedFileDialog: slot(),
      showAddUserDialog: slot(),
      showAddSystemAdministratorDialog: slot(),
      showEditWorkspacesListDialog: slot(),
      showEditPackageVersionDialog: slot<ShowEditPackageVersionDetail>(),
      showEditPackagePrefixDialog: slot<ShowEditPackagePrefixDetail>(),
      showAddPackageDialog: slot(),
      showPublishPackageVersionDialog: slot(),
      showPublishOperationGroupPackageVersionDialog: slot<PublishOperationGroupPackageVersionDetail>(),
      showCopyPackageVersionDialog: slot(),
      showExamplesDialog: slot(),
      showDeleteRoleDialog: slot<ShowDeleteRoleDetail>(),
      showEmptyPackageDialog: slot<ShowEmptyPackageDetail>(),
      showEditRoleDialog: slot<ShowEditRoleDetail>(),
      showSpecificationDialog: slot<SpecificationDialogDetail>(),
      showDeleteFileDialog: slot<ShowDeleteFileDetail>(),
      showEditFileLabelsDialog: slot<ShowEditFileLabelsDetail>(),
      showUserRolesDialog: slot(),
      // Feature "Edit Manual Operation Groups"
      showCreateCustomServerDialog: slot(),
      showCreateOperationGroupDialog: slot<CreateOperationGroupDetail>(),
      showEditOperationGroupDialog: slot<EditOperationGroupDetail>(),
      showEditOperationGroupContentDialog: slot<EditOperationGroupContentDetails>(),
      showModelUsagesDialog: slot<ModelUsagesDetail>(),
      onRefPackageSelected: slot<Key>(),
      onApiKindSelected: slot<ApiKind>(),
      onApiAudienceSelected: slot<ApiAudience>(),
      onTagSelected: slot<string>(),
      onOperationMoved: slot<OperationsMovementDetails>(),
    },
  })

  // base
  eventBus.showSuccessNotification.on((detail: NotificationDetail) => {
    dispatchEvent(new CustomEvent(SHOW_SUCCESS_NOTIFICATION, { detail }))
  })
  eventBus.showErrorNotification.on((detail: NotificationDetail) => {
    dispatchEvent(new CustomEvent(SHOW_ERROR_NOTIFICATION, { detail }))
  })
  eventBus.showInfoNotification.on((detail: NotificationDetail) => {
    dispatchEvent(new CustomEvent(SHOW_INFO_NOTIFICATION, { detail }))
  })
  eventBus.showCreatePackageDialog.on((detail: ShowCreatePackageDetail) => {
    dispatchEvent(new CustomEvent(SHOW_CREATE_PACKAGE_DIALOG, { detail }))
  })
  eventBus.showGlobalSearchPanel.on(() => {
    dispatchEvent(new CustomEvent(SHOW_GLOBAL_SEARCH_PANEL))
  })
  eventBus.hideGlobalSearchPanel.on(() => {
    dispatchEvent(new CustomEvent(HIDE_GLOBAL_SEARCH_PANEL))
  })
  eventBus.applyGlobalSearchFilters.on((detail: GlobalSearchPanelDetails) => {
    dispatchEvent(new CustomEvent(APPLY_GLOBAL_SEARCH_FILTERS, { detail }))
  })

  // portal
  eventBus.showCompareVersionsDialog.on(() => {
    dispatchEvent(new CustomEvent(SHOW_COMPARE_VERSIONS_DIALOG))
  })
  eventBus.showCompareRevisionsDialog.on(() => {
    dispatchEvent(new CustomEvent(SHOW_COMPARE_REVISIONS_DIALOG))
  })
  eventBus.showCompareOperationsWithUploadedFileDialog.on(() => {
    dispatchEvent(new CustomEvent(SHOW_COMPARE_OPERATIONS_WITH_UPLOADED_FILE_DIALOG))
  })
  eventBus.showCompareOperationsDialog.on(() => {
    dispatchEvent(new CustomEvent(SHOW_COMPARE_OPERATIONS_DIALOG))
  })
  eventBus.showCompareRestGroupsDialog.on(() => {
    dispatchEvent(new CustomEvent(SHOW_COMPARE_REST_GROUPS_DIALOG))
  })
  eventBus.showAddUserDialog.on(() => {
    dispatchEvent(new CustomEvent(SHOW_ADD_USER_DIALOG))
  })
  eventBus.showAddSystemAdministratorDialog.on(() => {
    dispatchEvent(new CustomEvent(SHOW_ADD_SYSTEM_ADMINISTRATOR_DIALOG))
  })
  eventBus.showEditWorkspacesListDialog.on(() => {
    dispatchEvent(new CustomEvent(SHOW_EDIT_WORKSPACES_LIST_DIALOG))
  })
  eventBus.showEditPackageVersionDialog.on((detail: ShowEditPackageVersionDetail) => {
    dispatchEvent(new CustomEvent(SHOW_EDIT_PACKAGE_VERSION_DIALOG, { detail }))
  })
  eventBus.showEditPackagePrefixDialog.on((detail: ShowEditPackagePrefixDetail) => {
    dispatchEvent(new CustomEvent(SHOW_EDIT_PACKAGE_PREFIX_DIALOG, { detail }))
  })
  eventBus.showAddPackageDialog.on(() => {
    dispatchEvent(new CustomEvent(SHOW_ADD_PACKAGE_DIALOG))
  })
  eventBus.showPublishPackageVersionDialog.on(() => {
    dispatchEvent(new CustomEvent(SHOW_PUBLISH_PACKAGE_VERSION_DIALOG))
  })
  eventBus.showPublishOperationGroupPackageVersionDialog.on((detail: PublishOperationGroupPackageVersionDetail) => {
    dispatchEvent(new CustomEvent(SHOW_PUBLISH_OPERATION_GROUP_PACKAGE_VERSION_DIALOG, { detail }))
  })
  eventBus.showCopyPackageVersionDialog.on(() => {
    dispatchEvent(new CustomEvent(SHOW_COPY_PACKAGE_VERSION_DIALOG))
  })
  eventBus.showCreateCustomServerDialog.on(() => {
    dispatchEvent(new CustomEvent(SHOW_CREATE_CUSTOM_SERVER_DIALOG))
  })
  eventBus.showExamplesDialog.on(() => {
    dispatchEvent(new CustomEvent(SHOW_EXAMPLES_DIALOG))
  })
  eventBus.showDeleteRoleDialog.on((detail: ShowDeleteRoleDetail) => {
    dispatchEvent(new CustomEvent(SHOW_DELETE_ROLE_DIALOG, { detail }))
  })
  eventBus.showEmptyPackageDialog.on((detail: ShowEmptyPackageDetail) => {
    dispatchEvent(new CustomEvent(SHOW_EMPTY_PACKAGE_DIALOG, { detail }))
  })
  eventBus.showEditRoleDialog.on((detail: ShowEditRoleDetail) => {
    dispatchEvent(new CustomEvent(SHOW_EDIT_ROLE_DIALOG, { detail }))
  })
  eventBus.showUserRolesDialog.on(() => {
    dispatchEvent(new CustomEvent(SHOW_USER_ROLES_DIALOG))
  })
  // Feature "Edit Manual Operation Groups"
  eventBus.showCreateOperationGroupDialog.on((detail: CreateOperationGroupDetail) => {
    dispatchEvent(new CustomEvent(SHOW_CREATE_OPERATION_GROUP_DIALOG, { detail }))
  })
  eventBus.showEditOperationGroupDialog.on((detail: EditOperationGroupDetail) => {
    dispatchEvent(new CustomEvent(SHOW_EDIT_OPERATION_GROUP_DIALOG, { detail }))
  })
  eventBus.showEditOperationGroupContentDialog.on((detail: EditOperationGroupContentDetails) => {
    dispatchEvent(new CustomEvent(SHOW_EDIT_OPERATION_GROUP_CONTENT_DIALOG, { detail }))
  })
  eventBus.showModelUsagesDialog.on((detail: ModelUsagesDetail) => {
    dispatchEvent(new CustomEvent(SHOW_MODEL_USAGES_DIALOG, { detail }))
  })
  eventBus.onRefPackageSelected.on((detail?: Key) => {
    dispatchEvent(new CustomEvent(REF_PACKAGE_SELECTED, { detail }))
  })
  eventBus.onApiKindSelected.on((detail?: ApiKind) => {
    dispatchEvent(new CustomEvent(API_KIND_SELECTED, { detail }))
  })
  eventBus.onApiAudienceSelected.on((detail?: ApiAudience) => {
    dispatchEvent(new CustomEvent(API_AUDIENCE_SELECTED, { detail }))
  })
  eventBus.onTagSelected.on((detail: string) => {
    dispatchEvent(new CustomEvent(TAG_SELECTED, { detail }))
  })
  eventBus.onOperationMoved.on((detail: OperationsMovementDetails) => {
    dispatchEvent(new CustomEvent(OPERATION_MOVED, { detail }))
  })
  eventBus.showEditPackagePrefixDialog.on((detail: ShowEditPackagePrefixDetail) => {
    dispatchEvent(new CustomEvent(SHOW_EDIT_PACKAGE_PREFIX_DIALOG, { detail }))
  })
  eventBus.showSpecificationDialog.on((detail: SpecificationDialogDetail) => {
    dispatchEvent(new CustomEvent(SHOW_SPECIFICATION_DIALOG, { detail }))
  })
  eventBus.showDeleteFileDialog.on((detail: ShowDeleteFileDetail) => {
    dispatchEvent(new CustomEvent(SHOW_DELETE_FILE_DIALOG, { detail }))
  })
  eventBus.showEditFileLabelsDialog.on((detail: ShowEditFileLabelsDetail) => {
    dispatchEvent(new CustomEvent(SHOW_EDIT_FILE_LABELS_DIALOG, { detail }))
  })

  return eventBus as unknown as EventBus
}

const EventBusContext = createContext<EventBus>()

export const EventBusProvider: FC<PropsWithChildren> = memo<PropsWithChildren>(({ children }) => {
  const [eventBus] = useState(eventBusProvider)

  return (
    <EventBusContext.Provider value={eventBus}>
      {children}
    </EventBusContext.Provider>
  )
})

export function useEventBus(): EventBus {
  return useContext(EventBusContext)
}
