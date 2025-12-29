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

import { useEventBus } from '@apihub/routes/EventBusProvider'
import { useFullMainVersion } from '@apihub/routes/root/PortalPage/FullMainVersionProvider'
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined'
import KeyboardArrowUpOutlinedIcon from '@mui/icons-material/KeyboardArrowUpOutlined'
import type { SxProps } from '@mui/material'
import { MenuItem } from '@mui/material'
import type { Theme } from '@mui/material/styles'
import type { MenuButtonProps } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/MenuButton'
import { MenuButton } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/MenuButton'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { FileFormat } from '@netcracker/qubership-apihub-ui-shared/utils/files'
import { MD_FILE_FORMAT } from '@netcracker/qubership-apihub-ui-shared/utils/files'
import type { SpecType } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import { isAsyncApiSpecType } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import { isOpenApiSpecType, UNKNOWN_SPEC_TYPE } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import type { FC, MouseEvent, ReactNode } from 'react'
import { memo, useCallback, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useCopyToClipboard, useLocation } from 'react-use'
import { useNavigation } from '../../../../NavigationProvider'
import { useShowSuccessNotification } from '../../../BasePage/Notification'
import { usePackageParamsWithRef } from '../../usePackageParamsWithRef'
import type { DocumentActionParams } from '../document-actions'
import { DOCUMENT_MENU_CONFIG, useCreateTemplate } from '../document-actions'
import { useDownloadPublishedDocument } from '../useDownloadPublishedDocument'
import { useGetSharedKey } from './useGetSharedKey'

export type DocumentActionsButtonProps = {
  slug: Key
  docType: SpecType
  format: FileFormat
  startIcon?: ReactNode
  icon?: ReactNode
  openedIcon?: ReactNode
  sx?: SxProps<Theme> | undefined
  customProps?: MenuButtonProps
}

const DEFAULT_ACTION_BUTTON_STYLE = {
  ml: 1,
  visibility: 'visible',
  pr: '20px',
  pl: '20px',
}

// TODO 16.04.25 // Change props for icons. They are not clear to understand
export const DocumentActionsButton: FC<DocumentActionsButtonProps> = memo<DocumentActionsButtonProps>((props) => {
  const { slug, docType, format, sx, customProps, startIcon, openedIcon, icon } = props

  const { packageId } = useParams()
  const fullVersion = useFullMainVersion()
  const [docPackageKey, docPackageVersionKey] = usePackageParamsWithRef()

  const { host, protocol } = useLocation()

  const getSharedKey = useGetSharedKey(slug, docPackageKey, docPackageVersionKey)

  const [, copyToClipboard] = useCopyToClipboard()
  const [downloadPublishedDocument] = useDownloadPublishedDocument({
    packageKey: docPackageKey,
    versionKey: docPackageVersionKey,
    slug: slug,
  })
  const showNotification = useShowSuccessNotification()
  const [actionMenuOpen, setActionMenuOpen] = useState(false)

  const { navigateToDocumentPreview } = useNavigation()

  const { showExportSettingsDialog } = useEventBus()

  const createTemplate = useCreateTemplate(protocol, host)

  const isSharingAvailable = docType !== UNKNOWN_SPEC_TYPE || format === MD_FILE_FORMAT
  const isOpenApiSpecification = isOpenApiSpecType(docType)
  const isAsyncApiSpecification = isAsyncApiSpecType(docType)

  const actionParams: DocumentActionParams = {
    packageKey: packageId!,
    fullVersion: fullVersion!,
    refPackageKey: docPackageKey,
    refFullVersion: docPackageVersionKey,
    slug: slug,
    protocol: protocol,
    host: host,
    navigateToDocumentPreview: navigateToDocumentPreview,
    downloadPublishedDocument: downloadPublishedDocument,
    showExportSettingsDialog: showExportSettingsDialog,
    getSharedKey: getSharedKey,
    copyToClipboard: copyToClipboard,
    showNotification: showNotification,
    createTemplate: createTemplate,
    specType: docType,
  }

  const handleClick = useCallback((event: MouseEvent) => {
    event.stopPropagation()
    setActionMenuOpen(prev => !prev)
  }, [])

  return (
    <MenuButton
      sx={sx ?? DEFAULT_ACTION_BUTTON_STYLE}
      startIcon={startIcon}
      icon={(
        actionMenuOpen
          ? (openedIcon ?? icon ?? <KeyboardArrowUpOutlinedIcon fontSize="small" />)
          : (icon ?? <KeyboardArrowDownOutlinedIcon fontSize="small" />)
      )}
      onClick={handleClick}
      onItemClick={handleClick}
      {...customProps}
      data-testid="DocumentActionsButton"
    >
      {DOCUMENT_MENU_CONFIG.map((menuItem) => (
        menuItem.condition(isOpenApiSpecification, isSharingAvailable, isAsyncApiSpecification) &&
        <MenuItem
          key={menuItem.id}
          onClick={() => menuItem.action(actionParams)}
          data-testid={menuItem['data-testid']}
        >
          {menuItem.label}
        </MenuItem>
      ))}
    </MenuButton>
  )
})
