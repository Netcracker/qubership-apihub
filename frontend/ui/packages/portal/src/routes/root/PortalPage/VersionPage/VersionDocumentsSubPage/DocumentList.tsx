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

import type { Document } from '@apihub/entities/documents'
import type { FC } from 'react'
import * as React from 'react'
import { memo, useCallback, useMemo } from 'react'
import { Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, ListSubheader } from '@mui/material'
import type { To } from 'react-router-dom'
import { useNavigate, useParams } from 'react-router-dom'
import { DocumentActionsButton } from './DocumentActionsButton'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { SidebarSkeleton } from '@netcracker/qubership-apihub-ui-shared/components/SidebarSkeleton'
import { isEmpty, isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { NAVIGATION_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { optionalSearchParams, REF_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { SpecLogo } from '@netcracker/qubership-apihub-ui-shared/components/SpecLogo'
import type { SpecType } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import {
  isGraphQlSpecType,
  isOpenApiSpecType,
  JSON_SCHEMA_SPEC_TYPE,
  MARKDOWN_SPEC_TYPE,
  PROTOBUF_3_SPEC_TYPE,
} from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import { groupBy } from 'lodash-es'
import { alphabeticallyBy } from '@netcracker/qubership-apihub-ui-shared/utils/comparers'

export type DocumentListProps = {
  isLoading: boolean
  documents: ReadonlyArray<Document>
}

const GROUP_NAME_MARKDOWN = 'Markdown'
const GROUP_NAME_OPENAPI = 'OpenAPI'
const GROUP_NAME_GRAPHQL = 'GraphQL'
const GROUP_NAME_PROTOBUF = 'Protobuf'
const GROUP_NAME_JSON_SCHEMA = 'JSON Schema'
const GROUP_NAME_OTHER = 'Other'

export type GroupName =
  | typeof GROUP_NAME_MARKDOWN
  | typeof GROUP_NAME_OPENAPI
  | typeof GROUP_NAME_GRAPHQL
  | typeof GROUP_NAME_PROTOBUF
  | typeof GROUP_NAME_JSON_SCHEMA
  | typeof GROUP_NAME_OTHER

const GROUPS_DISPLAY_ORDER = [
  GROUP_NAME_MARKDOWN,
  GROUP_NAME_OPENAPI,
  GROUP_NAME_GRAPHQL,
  GROUP_NAME_PROTOBUF,
  GROUP_NAME_JSON_SCHEMA,
  GROUP_NAME_OTHER,
]

function getGroupNameBySpecType(type: SpecType): GroupName {
  if (type === MARKDOWN_SPEC_TYPE) {
    return GROUP_NAME_MARKDOWN
  }
  if (isOpenApiSpecType(type)) {
    return GROUP_NAME_OPENAPI
  }
  if (isGraphQlSpecType(type)) {
    return GROUP_NAME_GRAPHQL
  }
  if (type === PROTOBUF_3_SPEC_TYPE) {
    return GROUP_NAME_PROTOBUF
  }
  if (type === JSON_SCHEMA_SPEC_TYPE) {
    return GROUP_NAME_JSON_SCHEMA
  }
  return GROUP_NAME_OTHER
}

export const DocumentList: FC<DocumentListProps> = memo<DocumentListProps>(({ documents, isLoading }) => {
  const { packageId: packageKey, versionId: versionKey, documentId } = useParams()
  const escapedVersionKey = encodeURIComponent(versionKey ?? '')
  const ref = useSearchParam(REF_SEARCH_PARAM)

  const search = optionalSearchParams({
    [REF_SEARCH_PARAM]: { value: ref ?? '' },
  })

  const navigate = useNavigate()

  const navigateToSelectedDocument = useCallback((pathToNavigate: To): void => {
    navigate(pathToNavigate)
  }, [navigate])

  const groupedDocuments = useMemo(() => {
    const groupedDocuments = groupBy(documents, ({ type }) => getGroupNameBySpecType(type))
    return Object.entries(groupedDocuments)
      .sort(([groupNameA], [groupNameB]) => GROUPS_DISPLAY_ORDER.indexOf(groupNameA) - GROUPS_DISPLAY_ORDER.indexOf(groupNameB))
      .map(([groupName, documents]) => [groupName, documents.sort((it, that) => alphabeticallyBy('title', it, that))] as [GroupName, Document[]])
  }, [documents])

  if (isLoading) {
    return (
      <Box mt={1}>
        <SidebarSkeleton/>
      </Box>
    )
  } else if (isEmpty(documents)) {
    return (
      <Placeholder
        invisible={isNotEmpty(documents)}
        area={NAVIGATION_PLACEHOLDER_AREA}
        message="No documents"
      />
    )
  }

  return (
    <List sx={{
      paddingBottom: '30px',
      gap: '16px',
      display: 'flex',
      flexDirection: 'column',
    }} data-testid="DocumentsList"
    >
      {groupedDocuments.map(([groupName, documents]) => <Box key={groupName}>
        <ListSubheader
          sx={{
            fontSize: 12,
            lineHeight: '24px',
          }}
        >
          {groupName}
        </ListSubheader>
        {documents.map(({ key, type, title, slug, version, format }) => {
          const displayTitle = version ? `${title} ${version}` : title
          return (
            <ListItem
              key={key}
              sx={{ p: 0 }}
            >
              {/*TODO: Check flexDirection in theme*/}
              <ListItemButton
                sx={{
                  flexDirection: 'unset',
                  backgroundColor: documentId === slug ? '#ECEDEF' : 'transparent',
                  height: '36px',
                  alignItems: 'center',
                  '&:hover': {
                    '& .MuiButtonBase-root': {
                      visibility: 'visible',
                    },
                  },
                }}
                selected={documentId === slug}
                onClick={() => {
                  navigateToSelectedDocument({
                    pathname: `/portal/packages/${packageKey}/${escapedVersionKey}/documents/${slug}`,
                    search: `${search}`,
                  })
                }}
                data-testid="DocumentButton"
              >
                <ListItemIcon sx={{ minWidth: 2, mt: 0, mr: 1 }}>
                  <SpecLogo value={type}/>
                </ListItemIcon>
                <ListItemText primary={displayTitle} primaryTypographyProps={{ sx: { mt: 0.25 } }}/>
                <DocumentActionsButton
                  slug={slug}
                  docType={type}
                  format={format}
                  sx={{
                    ml: 1,
                    visibility: 'visible',
                    backgroundColor: 'transparent',
                    '&:hover': {
                      backgroundColor: '#ECEDEF',
                    },
                    width: 24,
                    minWidth: 24,
                    height: 24,
                  }}
                  icon={<MoreVertIcon sx={{ color: '#626D82' }} fontSize="small"/>}
                />
              </ListItemButton>
            </ListItem>
          )
        })}
      </Box>)}
    </List>
  )
})
