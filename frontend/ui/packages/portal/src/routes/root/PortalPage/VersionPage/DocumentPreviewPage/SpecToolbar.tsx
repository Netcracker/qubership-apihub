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
import { memo, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Box, IconButton, MenuItem } from '@mui/material'
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { INTERACTIVE_DOC_TYPE, RAW_DOC_TYPE, useDownloadPublishedDocument } from '../useDownloadPublishedDocument'
import { useDocument } from '../useDocument'
import { PackageBreadcrumbs } from '../../../PackageBreadcrumbs'
import { usePackage } from '../../../usePackage'
import { usePackageParamsWithRef } from '../../usePackageParamsWithRef'
import { useNavigation } from '../../../../NavigationProvider'
import { useSpecViewMode } from './useSpecViewMode'
import { useSchemaViewMode } from './useSchemaViewMode'
import { DETAILED_SCHEMA_VIEW_MODE, SCHEMA_VIEW_MODES } from '@netcracker/qubership-apihub-ui-shared/entities/schema-view-mode'
import { useBackwardLocationContext } from '@apihub/routes/BackwardLocationProvider'
import { Toolbar } from '@netcracker/qubership-apihub-ui-shared/components/Toolbar'
import { ToolbarTitle } from '@netcracker/qubership-apihub-ui-shared/components/ToolbarTitle'
import { isOpenApiSpecType, UNKNOWN_SPEC_TYPE } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import { Toggler } from '@netcracker/qubership-apihub-ui-shared/components/Toggler'
import { SpecViewToggler } from '@netcracker/qubership-apihub-ui-shared/components/SpecViewToggler'
import { MenuButton } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/MenuButton'
import { JSON_FILE_EXTENSION, YAML_FILE_EXTENSION } from '@netcracker/qubership-apihub-ui-shared/utils/files'

export const DOC_SPEC_VIEW_MODE = 'doc'
export const RAW_SPEC_VIEW_MODE = 'raw'
type SpecViewMode =
  | typeof DOC_SPEC_VIEW_MODE
  | typeof RAW_SPEC_VIEW_MODE
const DOC_VIEW_COMPATIBLE_TYPES = ['openapi-3-1', 'openapi-3-0', 'openapi-2-0', 'openapi', 'asyncapi-2', 'json-schema']

export const SpecToolbar: FC = memo(() => {
  const { packageId, versionId, documentId } = useParams()
  const [docPackageKey, docPackageVersionKey] = usePackageParamsWithRef()
  const [packageObject] = usePackage({ packageKey: packageId, showParents: true })
  const [{ title, type }] = useDocument(docPackageKey, docPackageVersionKey, documentId)
  const [downloadPublishedFileDoc] = useDownloadPublishedDocument({
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
            <ArrowBackIcon/>
          </IconButton>
          <ToolbarTitle value={title}/>
        </Box>
      }
      action={
        type !== UNKNOWN_SPEC_TYPE && <>
          {specViewMode === DOC_SPEC_VIEW_MODE && (<>
              {DOC_VIEW_COMPATIBLE_TYPES.includes(type ?? '') && (
                <Toggler
                  modes={SCHEMA_VIEW_MODES}
                  mode={schemaViewMode}
                  onChange={setSchemaViewMode}
                />
              )}
            </>
          )}
          <SpecViewToggler
            mode={specViewMode as SpecViewMode}
            modes={[
              DOC_SPEC_VIEW_MODE,
              RAW_SPEC_VIEW_MODE,
            ]}
            onChange={setSpecViewMode}
          />
          <MenuButton
            variant="outlined"
            title="Export"
            icon={<KeyboardArrowDownOutlinedIcon/>}
            data-testid="ExportDocumentMenuButton"
          >
            {isOpenApiSpecType(type) ? (
              <Box component="div">
                <MenuItem
                  onClick={() => downloadPublishedFileDoc({
                    docType: RAW_DOC_TYPE,
                    rawOptions: { resultFileExtension: YAML_FILE_EXTENSION, inlineRefs: false },
                  })}
                  data-testid="DownloadYamlMenuItem"
                >
                  Download as YAML
                </MenuItem>
                <MenuItem
                  onClick={() => downloadPublishedFileDoc({
                    docType: RAW_DOC_TYPE,
                    rawOptions: { resultFileExtension: JSON_FILE_EXTENSION, inlineRefs: false },
                  })}
                  data-testid="DownloadJsonMenuItem"
                >
                  Download as JSON
                </MenuItem>
                <MenuItem
                  onClick={() => downloadPublishedFileDoc({
                    docType: RAW_DOC_TYPE,
                    rawOptions: { resultFileExtension: YAML_FILE_EXTENSION, inlineRefs: true },
                  })}
                  data-testid="DownloadYamlInlineRefsMenuItem"
                >
                  Download as YAML (inline refs)
                </MenuItem>
                <MenuItem
                  onClick={() => downloadPublishedFileDoc({
                    docType: RAW_DOC_TYPE,
                    rawOptions: { resultFileExtension: JSON_FILE_EXTENSION, inlineRefs: true },
                  })}
                  data-testid="DownloadJsonInlineRefsMenuItem"
                >
                  Download as JSON (inline refs)
                </MenuItem>
                <MenuItem
                  onClick={() => downloadPublishedFileDoc({ docType: INTERACTIVE_DOC_TYPE })}
                  data-testid="InteractiveHtmlMenuItem"
                >
                  HTML interactive
                </MenuItem>
              </Box>
            ) : (
              <MenuItem
                onClick={() => downloadPublishedFileDoc()}
              >
                Download
              </MenuItem>
            )}
          </MenuButton>
        </>
      }
    />
  )
})
