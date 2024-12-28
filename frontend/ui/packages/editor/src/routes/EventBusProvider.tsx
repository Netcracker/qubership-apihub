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
import type { Key, VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import type { ProjectFile } from '@apihub/entities/project-files'
import type { CommitKey, DRAFT_COMMIT_KEY, LATEST_COMMIT_KEY } from '@apihub/entities/commits'
import type { SearchCriteria } from '@apihub/entities/global-search'

// base
export const SHOW_SUCCESS_NOTIFICATION = 'show-success-notification'
export const SHOW_ERROR_NOTIFICATION = 'show-error-notification'
export const SHOW_INFO_NOTIFICATION = 'show-info-notification'
export const SHOW_CREATE_PROJECT_DIALOG = 'show-create-project-dialog'
export const SHOW_CREATE_GROUP_DIALOG = 'show-create-group-dialog'

// editor
export const SHOW_CREATE_BRANCH_DIALOG = 'show-create-branch-dialog'
export const SHOW_FILE_HISTORY_DIALOG = 'show-file-history-dialog'
export const SHOW_IMPORT_FROM_GIT_DIALOG = 'show-import-from-git-dialog'
export const SHOW_UPLOAD_DIALOG = 'show-add-project-content-dialog'
export const SHOW_IMPORT_BY_URL_DIALOG = 'show-import-by-url-dialog'
export const SHOW_CREATE_FILE_DIALOG = 'show-create-file-dialog'
export const SHOW_RENAME_FILE_DIALOG = 'show-rename-file-dialog'
export const SHOW_MOVE_FILE_DIALOG = 'show-move-file-dialog'
export const SHOW_DELETE_CONTENT_DIALOG = 'show-delete-content-dialog'
export const SHOW_ADD_PROJECT_REFERENCE_DIALOG = 'show-add-project-reference-dialog'
export const SHOW_SAVE_CHANGES_DIALOG = 'show-save-changes-dialog'
export const SHOW_FORCE_SAVE_CHANGES_DIALOG = 'show-force-save-changes-dialog'
export const SHOW_PUBLISH_PROJECT_VERSION_DIALOG = 'show-publish-project-version-dialog'
export const SHOW_BWC_PUBLISH_PROJECT_VERSION_DIALOG = 'show-bwc-publish-project-version-dialog'
export const SHOW_BWC_CHECK_DIALOG = 'show-bwc-check-dialog'
export const SHOW_PUBLISH_PREVIEW_DIALOG = 'show-publish-preview-dialog'
export const SHOW_ADD_GROUP_REFERENCE_DIALOG = 'show-add-group-reference-dialog'
export const SHOW_PUBLISH_GROUP_VERSION_DIALOG = 'show-publish-group-version-dialog'

export type NotificationDetail = {
  title?: string
  message: string
  link?: LinkType
}

export type LinkType = {
  name: string
  href: string
}

export type ImportFromGitDialogDetail = {
  folderKey: Key
}

export type UploadFileDialogDetail = {
  path: string
}

export type SaveChangesDialogDetail = {
  saveToNewBranch: boolean
}

export type ForceSaveChangesDialogDetail = {
  conflicts: Key[]
}

export type PublishProjectVersionDialogDetails = {
  version: VersionKey
}

export type BwcPublishProjectVersionDialogDetail = {
  version: VersionKey
  status: VersionStatus
  previousVersion: VersionKey
  message?: string
  labels?: string[]
}

export type ImportByUrlDialogDetail = {
  path: string
}

export type CreateFileDialogDetail = {
  path: string
}

export type RenameFileDialogDetail = {
  file: ProjectFile
}

export type DeleteContentDialogDetail = {
  key: Key
  name: string
  isFolder: boolean
}

export type FileHistoryDialogDetail = {
  fileKey: Key
  commitKey: Exclude<CommitKey, typeof DRAFT_COMMIT_KEY> // todo comparison
  comparisonCommitKey: Exclude<CommitKey, typeof LATEST_COMMIT_KEY>
}

export type GlobalSearchPanelDetails = {
  filters: Omit<SearchCriteria, 'searchString' | 'searchLevel'>
}

export type AddUserDialogDetail = {
  packageKey?: string
}

type EventBus = {
  // base
  showSuccessNotification: (detail: NotificationDetail) => void
  showErrorNotification: (detail: NotificationDetail) => void
  showInfoNotification: (detail: NotificationDetail) => void
  showCreateProjectDialog: () => void
  showCreateGroupDialog: () => void

  // editor
  showCreateBranchDialog: () => void
  showFileHistoryDialog: (detail: FileHistoryDialogDetail) => void
  showImportFromGitDialog: (detail?: ImportFromGitDialogDetail) => void
  showUploadDialog: (detail?: UploadFileDialogDetail) => void
  showImportByUrlDialog: (detail?: ImportByUrlDialogDetail) => void
  showCreateFileDialog: (detail?: CreateFileDialogDetail) => void
  showRenameFileDialog: (detail: RenameFileDialogDetail) => void
  showMoveFileDialog: (detail: RenameFileDialogDetail) => void
  showDeleteContentDialog: (detail: DeleteContentDialogDetail) => void
  showAddProjectReferenceDialog: () => void
  showSaveChangesDialog: (detail?: SaveChangesDialogDetail) => void
  showForceSaveChangesDialog: (detail?: ForceSaveChangesDialogDetail) => void
  showPublishProjectVersionDialog: (detail?: PublishProjectVersionDialogDetails) => void
  showBwcPublishProjectVersionDialog: (detail: BwcPublishProjectVersionDialogDetail) => void
  showBwcCheckDialog: () => void
  showPublishPreviewDialog: () => void
  showAddGroupReferenceDialog: () => void
  showPublishGroupVersionDialog: () => void

}

function eventBusProvider(): EventBus {
  const eventBus = createEventBus({
    events: {
      // base
      showSuccessNotification: slot<NotificationDetail>(),
      showErrorNotification: slot<NotificationDetail>(),
      showInfoNotification: slot<NotificationDetail>(),
      showCreateProjectDialog: slot(),
      showCreateGroupDialog: slot(),
      showGlobalSearchPanel: slot(),
      hideGlobalSearchPanel: slot(),
      applyGlobalSearchFilters: slot<GlobalSearchPanelDetails>(),

      // editor
      showCreateBranchDialog: slot(),
      showFileHistoryDialog: slot<FileHistoryDialogDetail>(),
      showImportFromGitDialog: slot<ImportFromGitDialogDetail>(),
      showUploadDialog: slot<UploadFileDialogDetail>(),
      showImportByUrlDialog: slot<ImportByUrlDialogDetail>(),
      showCreateFileDialog: slot<CreateFileDialogDetail>(),
      showRenameFileDialog: slot<RenameFileDialogDetail>(),
      showMoveFileDialog: slot<RenameFileDialogDetail>(),
      showDeleteContentDialog: slot<DeleteContentDialogDetail>(),
      showAddProjectReferenceDialog: slot(),
      showSaveChangesDialog: slot<SaveChangesDialogDetail>(),
      showForceSaveChangesDialog: slot<ForceSaveChangesDialogDetail>(),
      showPublishProjectVersionDialog: slot<PublishProjectVersionDialogDetails>(),
      showBwcPublishProjectVersionDialog: slot<BwcPublishProjectVersionDialogDetail>(),
      showBwcCheckDialog: slot(),
      showPublishPreviewDialog: slot(),
      showAddGroupReferenceDialog: slot(),
      showPublishGroupVersionDialog: slot(),

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
  eventBus.showCreateProjectDialog.on(() => {
    dispatchEvent(new CustomEvent(SHOW_CREATE_PROJECT_DIALOG))
  })
  eventBus.showCreateGroupDialog.on(() => {
    dispatchEvent(new CustomEvent(SHOW_CREATE_GROUP_DIALOG))
  })

  // editor
  eventBus.showCreateBranchDialog.on(() => {
    dispatchEvent(new CustomEvent(SHOW_CREATE_BRANCH_DIALOG))
  })
  eventBus.showFileHistoryDialog.on((detail: FileHistoryDialogDetail) => {
    dispatchEvent(new CustomEvent(SHOW_FILE_HISTORY_DIALOG, { detail }))
  })
  eventBus.showImportFromGitDialog.on((detail?: ImportFromGitDialogDetail) => {
    dispatchEvent(new CustomEvent(SHOW_IMPORT_FROM_GIT_DIALOG, { detail }))
  })
  eventBus.showUploadDialog.on((detail?: UploadFileDialogDetail) => {
    dispatchEvent(new CustomEvent(SHOW_UPLOAD_DIALOG, { detail }))
  })
  eventBus.showImportByUrlDialog.on((detail?: ImportByUrlDialogDetail) => {
    dispatchEvent(new CustomEvent(SHOW_IMPORT_BY_URL_DIALOG, { detail }))
  })
  eventBus.showCreateFileDialog.on((detail?: CreateFileDialogDetail) => {
    dispatchEvent(new CustomEvent(SHOW_CREATE_FILE_DIALOG, { detail }))
  })
  eventBus.showRenameFileDialog.on((detail: RenameFileDialogDetail) => {
    dispatchEvent(new CustomEvent(SHOW_RENAME_FILE_DIALOG, { detail }))
  })
  eventBus.showMoveFileDialog.on((detail: RenameFileDialogDetail) => {
    dispatchEvent(new CustomEvent(SHOW_MOVE_FILE_DIALOG, { detail }))
  })
  eventBus.showDeleteContentDialog.on((detail: DeleteContentDialogDetail) => {
    dispatchEvent(new CustomEvent(SHOW_DELETE_CONTENT_DIALOG, { detail }))
  })
  eventBus.showAddProjectReferenceDialog.on(() => {
    dispatchEvent(new CustomEvent(SHOW_ADD_PROJECT_REFERENCE_DIALOG))
  })
  eventBus.showSaveChangesDialog.on((detail: SaveChangesDialogDetail) => {
    dispatchEvent(new CustomEvent(SHOW_SAVE_CHANGES_DIALOG, { detail }))
  })
  eventBus.showForceSaveChangesDialog.on((detail: ForceSaveChangesDialogDetail) => {
    dispatchEvent(new CustomEvent(SHOW_FORCE_SAVE_CHANGES_DIALOG, { detail }))
  })
  eventBus.showPublishProjectVersionDialog.on((detail?: PublishProjectVersionDialogDetails) => {
    dispatchEvent(new CustomEvent(SHOW_PUBLISH_PROJECT_VERSION_DIALOG, { detail }))
  })
  eventBus.showBwcPublishProjectVersionDialog.on((detail: BwcPublishProjectVersionDialogDetail) => {
    dispatchEvent(new CustomEvent(SHOW_BWC_PUBLISH_PROJECT_VERSION_DIALOG, { detail }))
  })
  eventBus.showBwcCheckDialog.on(() => {
    dispatchEvent(new CustomEvent(SHOW_BWC_CHECK_DIALOG))
  })
  eventBus.showPublishPreviewDialog.on(() => {
    dispatchEvent(new CustomEvent(SHOW_PUBLISH_PREVIEW_DIALOG))
  })
  eventBus.showAddGroupReferenceDialog.on(() => {
    dispatchEvent(new CustomEvent(SHOW_ADD_GROUP_REFERENCE_DIALOG))
  })
  eventBus.showPublishGroupVersionDialog.on(() => {
    dispatchEvent(new CustomEvent(SHOW_PUBLISH_GROUP_VERSION_DIALOG))
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
