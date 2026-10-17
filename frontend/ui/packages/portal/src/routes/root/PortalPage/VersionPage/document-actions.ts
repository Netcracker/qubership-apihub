import { useCallback } from 'react'

import type { ShareabilityStatus } from '@netcracker/qubership-apihub-api-processor'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { REF_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import type { SpecType } from '@netcracker/qubership-apihub-ui-shared/utils/specs'

import { ExportedEntityKind } from '@portal/components/ExportSettingsDialog/api/useExport'
import type { ExportSettingsPopupDetail, NotificationDetail } from '@portal/routes/EventBusProvider'
import type { DocumentPreviewDetail } from '@portal/routes/NavigationProvider'

export type DocumentActionParams = {
  packageKey: Key
  fullVersion: Key
  refPackageKey?: Key
  refFullVersion?: Key
  slug: Key
  protocol: string | undefined
  host: string | undefined
  navigateToDocumentPreview: ((detail?: DocumentPreviewDetail) => void) | null
  showExportSettingsDialog: (detail: ExportSettingsPopupDetail) => void
  getSharedKey: () => Promise<{ data?: Key }>
  copyToClipboard: (text: string) => void
  showNotification: (detail: NotificationDetail) => void
  createTemplate: (key?: Key) => string
  specType?: SpecType
  shareabilityStatus: ShareabilityStatus
  hasErrors?: boolean
}

export type MenuItemConfig = {
  id: string
  label: string
  condition: (
    isOpenApiSpec: boolean,
    isSharingAvailable: boolean,
    isAsyncApiSpec: boolean,
    isGraphQlSpec: boolean,
  ) => boolean
  action: (params: DocumentActionParams) => void
  'data-testid'?: string
}

const EXPORT_DOCUMENT_MENU_ITEM: MenuItemConfig = {
  id: 'export',
  label: 'Export',
  condition: () => true,
  action: ({
    showExportSettingsDialog,
    packageKey,
    fullVersion,
    refPackageKey,
    refFullVersion,
    slug,
    specType,
    shareabilityStatus,
    hasErrors,
  }) => {
    showExportSettingsDialog({
      specType: specType,
      exportedEntity: ExportedEntityKind.SINGLE_DOCUMENT,
      packageId: refPackageKey ?? packageKey!,
      version: refFullVersion ?? fullVersion!,
      documentId: slug,
      shareabilityStatus: shareabilityStatus,
      hasErrors: hasErrors,
    })
  },
  'data-testid': 'ExportMenuItem',
}

const INVALID_DOCUMENT_MENU_CONFIG: ReadonlyArray<MenuItemConfig> = [
  EXPORT_DOCUMENT_MENU_ITEM,
]

export const DOCUMENT_MENU_CONFIG: MenuItemConfig[] = [
  {
    id: 'preview',
    label: 'Preview',
    condition: (isOpenApiSpec) => isOpenApiSpec,
    action: ({ navigateToDocumentPreview, packageKey, fullVersion, refPackageKey, slug }) => {
      navigateToDocumentPreview?.({
        packageKey: packageKey,
        versionKey: fullVersion,
        documentKey: slug,
        search: {
          [REF_SEARCH_PARAM]: { value: refPackageKey !== packageKey ? refPackageKey : undefined },
        },
      })
    },
    'data-testid': 'PreviewMenuItem',
  },
  EXPORT_DOCUMENT_MENU_ITEM,
  {
    id: 'copy-public-link',
    label: 'Copy public link to source',
    condition: (_, isSharingAvailable) => isSharingAvailable,
    action: ({ getSharedKey, protocol, host, copyToClipboard, showNotification }) => {
      getSharedKey().then(({ data }) => {
        if (data) {
          copyToClipboard(`${protocol}//${host}/api/v2/sharedFiles/${data}`)
          showNotification({ message: 'Link copied' })
        }
      })
    },
    'data-testid': 'CopyPublicLinkMenuItem',
  },
  {
    id: 'copy-page-template',
    label: 'Copy page template',
    condition: (isOpenApiSpec, isSharingAvailable) => isOpenApiSpec && isSharingAvailable,
    action: ({ getSharedKey, createTemplate, copyToClipboard, showNotification }) => {
      getSharedKey().then(({ data }) => {
        if (data) {
          copyToClipboard(createTemplate(data))
          showNotification({ message: 'Template copied' })
        }
      })
    },
    'data-testid': 'CopyPageTemplateMenuItem',
  },
]

export const DOCUMENT_MENU_CONFIG_ON_PREVIEW_PAGE: MenuItemConfig[] =
  DOCUMENT_MENU_CONFIG.filter(item => item.id !== 'preview')

export function getDocumentMenuConfig(hasErrors?: boolean): ReadonlyArray<MenuItemConfig> {
  if (hasErrors) {
    return INVALID_DOCUMENT_MENU_CONFIG
  }
  return DOCUMENT_MENU_CONFIG
}

type CreateTemplateCallback = (key?: Key) => string
export function useCreateTemplate(protocol: string | undefined, host: string | undefined): CreateTemplateCallback {
  return useCallback(
    (key?: Key) => (
      `<script src="${protocol}//${host}/portal/apispec-view/index.js"></script>
<apispec-view
  apiDescriptionUrl="${protocol}//${host}/api/v2/sharedFiles/${key}"
  router="hash"
  layout="stacked"
  hideExport>
</apispec-view>
`
    ),
    [host, protocol],
  )
}
