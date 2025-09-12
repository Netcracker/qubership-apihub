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

import { useBackwardLocationContext } from '@apihub/routes/BackwardLocationProvider'
import { useEventBus } from '@apihub/routes/EventBusProvider'
import { useShowSuccessNotification } from '@apihub/routes/root/BasePage/Notification'
import { usePackageVersionContent } from '@apihub/routes/root/usePackageVersionContent'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined'
import { Box, IconButton, MenuItem } from '@mui/material'
import { MenuButton } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/MenuButton'
import type { SpecViewMode } from '@netcracker/qubership-apihub-ui-shared/components/SpecViewToggler'
import { Toggler } from '@netcracker/qubership-apihub-ui-shared/components/Toggler'
import { Toolbar } from '@netcracker/qubership-apihub-ui-shared/components/Toolbar'
import { ToolbarTitle } from '@netcracker/qubership-apihub-ui-shared/components/ToolbarTitle'
import type { SchemaViewMode } from '@netcracker/qubership-apihub-ui-shared/entities/schema-view-mode'
import { DETAILED_SCHEMA_VIEW_MODE, SCHEMA_VIEW_MODES } from '@netcracker/qubership-apihub-ui-shared/entities/schema-view-mode'
import { MD_FILE_FORMAT } from '@netcracker/qubership-apihub-ui-shared/utils/files'
import { isOpenApiSpecType, UNKNOWN_SPEC_TYPE } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import type { FC } from 'react'
import { memo, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCopyToClipboard, useLocation } from 'react-use'
import { useNavigation } from '../../../../NavigationProvider'
import { PackageBreadcrumbs } from '../../../PackageBreadcrumbs'
import { usePackage } from '../../../usePackage'
import { usePackageParamsWithRef } from '../../usePackageParamsWithRef'
import type { DocumentActionParams } from '../document-actions'
import { DOCUMENT_MENU_CONFIG_ON_PREVIEW_PAGE, useCreateTemplate } from '../document-actions'
import { useDocument } from '../useDocument'
import { useDownloadPublishedDocument } from '../useDownloadPublishedDocument'
import { useGetSharedKey } from '../VersionDocumentsSubPage/useGetSharedKey'
import { useSchemaViewMode } from './useSchemaViewMode'
import { useSpecViewMode } from './useSpecViewMode'

export const DOC_SPEC_VIEW_MODE = 'doc'
export const RAW_SPEC_VIEW_MODE = 'raw'

const DOC_VIEW_COMPATIBLE_TYPES = ['openapi-3-1', 'openapi-3-0', 'openapi-2-0', 'openapi', 'asyncapi-2', 'json-schema']

export const SpecToolbar: FC = memo(() => {
  const { packageId, versionId, documentId } = useParams()
  const [docPackageKey, docPackageVersionKey] = usePackageParamsWithRef()
  const [packageObject] = usePackage({ packageKey: packageId, showParents: true })
  const [{ title, slug, type, format }] = useDocument(docPackageKey, docPackageVersionKey, documentId)
  const [downloadPublishedDocument] = useDownloadPublishedDocument({
    slug: documentId!,
    packageKey: docPackageKey,
    versionKey: docPackageVersionKey,
  })

  const [specViewMode, setSpecViewMode] = useSpecViewMode()
  const [schemaViewMode = DETAILED_SCHEMA_VIEW_MODE, setSchemaViewMode] = useSchemaViewMode()

  const navigate = useNavigate()
  const { navigateToVersion } = useNavigation()
  const backwardLocation = useBackwardLocationContext()
  const handleBackClick = useCallback(() => {
    backwardLocation.fromOperation ? navigate({ ...backwardLocation.fromOperation }) : navigateToVersion({
      packageKey: packageId!,
      versionKey: versionId!,
    })
  }, [navigate, backwardLocation, navigateToVersion, packageId, versionId])

  // Action Menu

  const { versionContent } = usePackageVersionContent({ packageKey: packageId, versionKey: versionId })

  const isSharingAvailable = type !== UNKNOWN_SPEC_TYPE || format === MD_FILE_FORMAT
  const isOpenApiSpecification = isOpenApiSpecType(type)

  const { showExportSettingsDialog } = useEventBus()

  const getSharedKey = useGetSharedKey(slug, docPackageKey, docPackageVersionKey)

  const [, copyToClipboard] = useCopyToClipboard()
  const showNotification = useShowSuccessNotification()

  const { host, protocol } = useLocation()
  const createTemplate = useCreateTemplate(protocol, host)

  const actionParams: DocumentActionParams = {
    packageKey: packageId!,
    fullVersion: (versionContent ?? {}).version!,
    refPackageKey: docPackageKey,
    refFullVersion: docPackageVersionKey,
    slug: slug,
    protocol: protocol,
    host: host,
    navigateToDocumentPreview: null, // We already on the preview page
    downloadPublishedDocument: downloadPublishedDocument,
    showExportSettingsDialog: showExportSettingsDialog,
    getSharedKey: getSharedKey,
    copyToClipboard: copyToClipboard,
    showNotification: showNotification,
    createTemplate: createTemplate,
  }

  return (
    <Toolbar
      breadcrumbs={
        <PackageBreadcrumbs
          packageObject={packageObject}
          versionKey={versionId}
          showPackagePath={true}
        />
      }
      header={
        <Box sx={{ alignItems: 'center', display: 'flex', gap: '8px' }}>
          <IconButton color="primary" onClick={handleBackClick} data-testid="BackButton">
            <ArrowBackIcon />
          </IconButton>
          <ToolbarTitle value={title} />
        </Box>
      }
      action={
        type !== UNKNOWN_SPEC_TYPE && <>
          {specViewMode === DOC_SPEC_VIEW_MODE && (<>
            {DOC_VIEW_COMPATIBLE_TYPES.includes(type ?? '') && (
              <Toggler<SchemaViewMode>
                modes={SCHEMA_VIEW_MODES}
                mode={schemaViewMode}
                onChange={setSchemaViewMode}
              />
            )}
          </>
          )}
          <Toggler<SpecViewMode>
            mode={specViewMode}
            modes={[
              DOC_SPEC_VIEW_MODE,
              RAW_SPEC_VIEW_MODE,
            ]}
            onChange={setSpecViewMode}
          />
          <MenuButton
            variant="outlined"
            title="Export"
            icon={<KeyboardArrowDownOutlinedIcon />}
            data-testid="ExportDocumentMenuButton"
          >
            {DOCUMENT_MENU_CONFIG_ON_PREVIEW_PAGE.map((menuItem) => (
              menuItem.condition(isOpenApiSpecification, isSharingAvailable) &&
              <MenuItem
                key={menuItem.id}
                onClick={() => menuItem.action(actionParams)}
                data-testid={menuItem['data-testid']}
              >
                {menuItem.label}
              </MenuItem>
            ))}
          </MenuButton>
        </>
      }
    />
  )
})
