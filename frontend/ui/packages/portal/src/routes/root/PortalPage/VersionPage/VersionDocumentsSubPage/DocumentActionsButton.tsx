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

import type { FC, ReactNode } from 'react'
import { memo, useCallback, useMemo, useState } from 'react'
import { useCopyToClipboard, useLocation } from 'react-use'
import type { SxProps } from '@mui/material'
import { MenuItem } from '@mui/material'
import { useParams } from 'react-router-dom'
import { INTERACTIVE_DOC_TYPE, RAW_DOC_TYPE, useDownloadPublishedDocument } from '../useDownloadPublishedDocument'
import { useShowSuccessNotification } from '../../../BasePage/Notification'
import { useGetSharedKey } from './useGetSharedKey'
import KeyboardArrowUpOutlinedIcon from '@mui/icons-material/KeyboardArrowUpOutlined'
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined'
import type { Theme } from '@mui/material/styles'
import { useNavigation } from '../../../../NavigationProvider'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { SpecType } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import { isOpenApiSpecType, UNKNOWN_SPEC_TYPE } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import type { FileFormat } from '@netcracker/qubership-apihub-ui-shared/utils/files'
import {
  HTML_FILE_EXTENSION,
  JSON_FILE_EXTENSION,
  MD_FILE_FORMAT,
  YAML_FILE_EXTENSION,
} from '@netcracker/qubership-apihub-ui-shared/utils/files'
import type { MenuButtonProps } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/MenuButton'
import { MenuButton } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/MenuButton'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { REF_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { usePackageParamsWithRef } from '../../usePackageParamsWithRef'
import {
  MenuButtonContentWithSections,
} from '@netcracker/qubership-apihub-ui-shared/components/Buttons/MenuButtonContentWithSections'

export type DocumentActionsButtonProps = {
  slug: Key
  docType: SpecType
  format: FileFormat
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

export const DocumentActionsButton: FC<DocumentActionsButtonProps> = memo<DocumentActionsButtonProps>((props) => {
  const { slug, docType, format, sx, customProps, openedIcon, icon } = props

  const { packageId, versionId } = useParams()
  const ref = useSearchParam(REF_SEARCH_PARAM)

  const { host, protocol, href } = useLocation()

  const getSharedKey = useGetSharedKey(slug, ref)

  const [, copyToClipboard] = useCopyToClipboard()
  const [docPackageKey, docPackageVersionKey] = usePackageParamsWithRef()
  const [downloadPublishedDocument] = useDownloadPublishedDocument({
    packageKey: docPackageKey,
    versionKey: docPackageVersionKey,
    slug: slug,
  })
  const showNotification = useShowSuccessNotification()
  const [actionMenuOpen, setActionMenuOpen] = useState(false)

  const { navigateToDocumentPreview } = useNavigation()

  const createTemplate = useCallback((key?: Key): string => `
    <script src="${protocol}//${host}/portal/apispec-view/index.js"></script>
    <apispec-view
      apiDescriptionUrl="${protocol}//${host}/api/v2/sharedFiles/${key}"
      router="hash"
      layout="stacked"
      hideExport>
    </apispec-view>
  `, [host, protocol])

  const isShareAvailable = docType !== UNKNOWN_SPEC_TYPE || format === MD_FILE_FORMAT

  const openApiActions = useMemo(() => ({
    'Interactive HTML': [
      {
        onClick: () => navigateToDocumentPreview({
          packageKey: packageId!,
          versionKey: versionId!,
          documentKey: slug,
          search: {
            [REF_SEARCH_PARAM]: { value: ref ?? '' },
          },
        }),
        title: 'Preview document',
        testId: 'PreviewDocumentMenuItem',
      },
      {
        onClick: () => downloadPublishedDocument({
          docType: INTERACTIVE_DOC_TYPE,
          rawOptions: { resultFileExtension: HTML_FILE_EXTENSION, inlineRefs: false },
        }),
        title: 'Download (zip)',
        testId: 'DownloadZipMenuItem',
      },
    ],
    'Download source': [
      {
        onClick: () => downloadPublishedDocument({
          docType: RAW_DOC_TYPE,
          rawOptions: { resultFileExtension: YAML_FILE_EXTENSION, inlineRefs: false },
        }),
        title: 'Download as YAML',
        testId: 'DownloadYamlMenuItem',
      },
      {
        onClick: () => downloadPublishedDocument({
          docType: RAW_DOC_TYPE,
          rawOptions: { resultFileExtension: JSON_FILE_EXTENSION, inlineRefs: false },
        }),
        title: 'Download as JSON',
        testId: 'DownloadJsonMenuItem',
      },
      {
        onClick: () => downloadPublishedDocument({
          docType: RAW_DOC_TYPE,
          rawOptions: { resultFileExtension: YAML_FILE_EXTENSION, inlineRefs: true },
        }),
        title: 'Download as YAML (inline refs)',
        testId: 'DownloadYamlInlineRefsMenuItem',
      },
      {
        onClick: () => downloadPublishedDocument({
          docType: RAW_DOC_TYPE,
          rawOptions: { resultFileExtension: JSON_FILE_EXTENSION, inlineRefs: true },
        }),
        title: 'Download as JSON (inline refs)',
        testId: 'DownloadJsonInlineRefsMenuItem',
      },
    ],
  }), [downloadPublishedDocument, navigateToDocumentPreview, packageId, ref, slug, versionId])

  const shareActions = useMemo(() => ({
    'Share': [
      {
        onClick: () => {
          getSharedKey().then(({ data }) => {
            if (data) {
              copyToClipboard(`${protocol}//${host}/api/v2/sharedFiles/${data}`)
              showNotification({ message: 'Link copied' })
            }
          })
        },
        title: `Public link to source${isOpenApiSpecType(docType) ? ' (JSON)' : ''}`,
        testId: 'ShareSourceLinkMenuItem',
      },
      {
        onClick: () => {
          copyToClipboard(href + slug ?? '')
          showNotification({ message: 'Link copied' })
        },
        title: 'Link to document page',
        testId: 'ShareDocumentLinkMenuItem',
      },
      {
        onClick: () => {
          getSharedKey().then(({ data }) => {
            if (data) {
              copyToClipboard(createTemplate(data))
              showNotification({ message: 'Template copied' })
            }
          })
        },
        title: 'Page template',
        testId: 'ShareTemplateMenuItem',
      },
    ],
  }), [copyToClipboard, createTemplate, docType, getSharedKey, host, href, protocol, showNotification, slug])

  return (
    <MenuButton
      sx={sx ?? DEFAULT_ACTION_BUTTON_STYLE}
      icon={(
        actionMenuOpen
          ? (openedIcon ?? icon ?? <KeyboardArrowUpOutlinedIcon fontSize="small"/>)
          : (icon ?? <KeyboardArrowDownOutlinedIcon fontSize="small"/>)
      )}
      onClick={event => {
        event.stopPropagation()
        setActionMenuOpen(!actionMenuOpen)
      }}
      onItemClick={event => event.stopPropagation()}
      {...customProps}
      data-testid="DocumentActionsButton"
    >
      {isOpenApiSpecType(docType)
        ? (
          <MenuButtonContentWithSections
            content={openApiActions}
          />
        )
        : <MenuItem onClick={() => downloadPublishedDocument()} data-testid="DownloadMenuItem">
          Download
        </MenuItem>
      }
      {
        isShareAvailable && (
          <MenuButtonContentWithSections
            content={shareActions}
          />
        )
      }
    </MenuButton>
  )
})
