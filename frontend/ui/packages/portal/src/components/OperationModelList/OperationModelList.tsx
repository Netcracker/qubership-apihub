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

import type { FC, SyntheticEvent } from 'react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Typography } from '@mui/material'
import TreeView from '@mui/lab/TreeView'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { OperationModelListSkeleton } from './OperationModelListSkeleton'
import type { JsonPath } from '@netcracker/qubership-apihub-json-crawl'
import { ModelLabel } from './ModelLabel'
import { ModelItem, SectionItem } from './ModelListItem'
import type {
  MediaType,
  OpenApiCustomSchemaObject,
  OpenApiData,
  OpenApiVisitorData,
  OpenApiVisitorDataWithSection,
  ResponseCode,
} from '../../entities/operation-structure'
import {
  OPEN_API_SECTION_PARAMETERS,
  OPEN_API_SECTION_REQUESTS,
  OPEN_API_SECTION_RESPONSES,
} from '../../entities/operation-structure'
import type {
  HashWithTitle,
  VisitorNavigationDetails,
} from '@netcracker/qubership-apihub-ui-shared/components/SchemaGraphView/oasToClassDiagramService'
import { isEmpty, isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { useShowInfoNotification } from '@apihub/routes/root/BasePage/Notification'
import { NavigationFailReason } from '@netcracker/qubership-apihub-ui-shared/components/SchemaGraphView/SchemaGraphView'

// First Order Component //
export type OperationSidebarProps = {
  models: OpenApiData | undefined
  onModelUsagesClick: (name: string) => void
  onNavigate: (navigationDetails: VisitorNavigationDetails) => void
  isSectionDisabled: (key: SectionKey) => boolean
  isLoading: boolean
}

export const OperationModelList: FC<OperationSidebarProps> = memo<OperationSidebarProps>(({
  models,
  onModelUsagesClick,
  onNavigate,
  isSectionDisabled,
  isLoading,
}) => {
  const parameters = models?.parameters
  const responses = models?.responses
  const requests = models?.requests

  const showNotification = useShowInfoNotification()
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [expandedTreeItems, setExpandedTreeItems] = useState<string[]>([])

  const sidebarSections = useMemo(() => {
    const sections: OperationSection[] = []
    if (parameters) {
      sections.push({
        sectionKey: OPEN_API_SECTION_PARAMETERS,
        kind: OPEN_API_SECTION_PARAMETERS,
        scopeDeclarationPath: parameters.scopeDeclarationPath,
        declarationPath: parameters.declarationPath,
        models: sortModels(parameters.data),
      })
    }
    sections.push(...(requests ? flatRequests(requests) : []))
    sections.push(...(responses ? flatResponses(responses) : []))
    return sections
  }, [responses, parameters, requests])

  const [availableSections, availableSidebarSectionKeys] = useMemo(() => {
    const availableSections = sidebarSections.filter(section => !isSectionDisabled(section.sectionKey))
    return [
      availableSections,
      availableSections.map(section => section.sectionKey),
    ]
  }, [isSectionDisabled, sidebarSections])

  const handleToggle = useCallback((event: SyntheticEvent, nodeIds: string[]): void => {
    if (isTreeViewExpandIcon(event.target as Element)) {
      setExpandedTreeItems(nodeIds)
    }
    event.stopPropagation()
  }, [])

  const getNavigationFailedCallback = useCallback((schemaObject?: OpenApiCustomSchemaObject) =>
    (failReason: NavigationFailReason): void => {
      if (!schemaObject) {
        return console.error('Something went wrong during the navigation')
      }
      if (!schemaObject.title) {
        return showNotification({ message: 'The graph does not have a node for the selected schema' })
      }
      switch (failReason) {
        case NavigationFailReason.NO_MATCHED_NODES:
          return showNotification({ message: `The graph does not have a node for the schema "${schemaObject.title}"` })
        case NavigationFailReason.MULTIPLE_MATCHED_NODES:
          return showNotification({ message: `There are multiple nodes on the graph that match the schema "${schemaObject.title}", so navigation to a specific node is not possible` })
      }
    }, [showNotification])

  const handleLabelClick = useCallback((
    event: SyntheticEvent,
    nodeId: string,
    scopeDeclarationPath: JsonPath,
    declarationPath: JsonPath,
    schemaTolerantHashWithTitle?: HashWithTitle,
    schemaObject?: OpenApiCustomSchemaObject,
  ): void => {
    if (isTreeViewLabel(event.target as Element)) {
      setSelectedItem(nodeId)
      onNavigate({
        scopeDeclarationPath: scopeDeclarationPath,
        declarationPath: declarationPath,
        schemaTolerantHashWithTitle: schemaTolerantHashWithTitle,
        navigationFailedCallback: getNavigationFailedCallback(schemaObject),
      })
    }
  }, [getNavigationFailedCallback, onNavigate])

  useEffect(() => {
    if (isEmpty(availableSections)) {
      return
    }

    const selectedItemIsSection = sidebarSections
      .some(({ sectionKey }) => sectionKey === selectedItem)

    if (!selectedItem || (selectedItemIsSection && !availableSidebarSectionKeys.includes(selectedItem))) {
      const { sectionKey, scopeDeclarationPath, declarationPath } = getDefaultAvailableSection(availableSections)
      setSelectedItem(sectionKey)
      onNavigate({
        scopeDeclarationPath: scopeDeclarationPath,
        declarationPath: declarationPath,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableSidebarSectionKeys, availableSections])

  const content = useMemo(() => {
    return sidebarSections.map(({
      sectionKey,
      kind,
      scopeDeclarationPath,
      declarationPath,
      code,
      mediaType,
      isSingleMediaType,
      models,
    }) => {
      const isParameters = kind === OPEN_API_SECTION_PARAMETERS
      const isAvailableSection = availableSidebarSectionKeys.includes(sectionKey)
      const sectionTitle = getSectionTitle(kind, code, mediaType, isSingleMediaType)
      return (
        <SectionItem
          sectionKey={sectionKey}
          scopeDeclarationPath={scopeDeclarationPath}
          declarationPath={declarationPath}
          disabled={!isAvailableSection}
          label={sectionTitle}
          onClick={isAvailableSection ? handleLabelClick : undefined}
        >
          {models.map(({ title, scopeDeclarationPath, declarationPath, schemaObjectName, schemaTolerantHashWithTitle, schemaObject }, index) => {
            const handleOnModelUsagesClick = (): void => {
              if (schemaObjectName) {
                onModelUsagesClick(schemaObjectName)
              }
            }

            return (
            <ModelItem
              key={`${sectionKey}-${index}`}
              scopeDeclarationPath={scopeDeclarationPath}
              declarationPath={declarationPath}
              schemaTolerantHashWithTitle={schemaTolerantHashWithTitle}
              schemaObject={schemaObject}
              label={isParameters ? title : <ModelLabel title={title} onModelUsagesClick={handleOnModelUsagesClick} />}
              onClick={handleLabelClick}
            />
          )})}
        </SectionItem>
      )
    })

  }, [availableSidebarSectionKeys, handleLabelClick, onModelUsagesClick, sidebarSections])

  const defaultCollapseIcon = useMemo(() => <ExpandMoreIcon />, [])
  const defaultExpandIcon = useMemo(() => <ChevronRightIcon />, [])

  return (
    <Box pt={1} pb={1} overflow="auto">
      <Box px={2} py={1}>
        <Typography variant="h2" color="inherit">{SIDEBAR_TITLE}</Typography>
      </Box>

      {isLoading && (
        <OperationModelListSkeleton />
      )}

      <TreeView
        disabledItemsFocusable
        selected={selectedItem ?? 'requests'}
        defaultCollapseIcon={defaultCollapseIcon}
        defaultExpandIcon={defaultExpandIcon}
        expanded={expandedTreeItems}
        onNodeToggle={handleToggle}
        sx={TREE_GROUP_STYLES}
        data-testid="OperationModelList"
      >
        {content}
      </TreeView>
    </Box>
  )
})

const SIDEBAR_TITLE = 'Models'

const TREE_GROUP_STYLES = {
  '& > .MuiTreeItem-root > .MuiTreeItem-group': {
    marginLeft: '0px',
  },
}

export type SectionKey = string

type OperationSection = {
  sectionKey: Key
  kind: typeof OPEN_API_SECTION_PARAMETERS | typeof OPEN_API_SECTION_REQUESTS | typeof OPEN_API_SECTION_RESPONSES
  code?: ResponseCode
  mediaType?: MediaType
  isSingleMediaType?: boolean
  scopeDeclarationPath: JsonPath
  declarationPath: JsonPath
  models: OpenApiVisitorData[]
}

function flatResponses(responses: Record<ResponseCode, Record<MediaType, OpenApiVisitorDataWithSection>>): OperationSection[] {
  const result: OperationSection[] = []
  Object.entries(responses).forEach(([code, response]) => {
    Object.entries(response).forEach(([mediaType, content]) => {
      result.push({
        sectionKey: `response-${code}-${mediaType}`,
        kind: OPEN_API_SECTION_RESPONSES,
        code: code,
        mediaType: mediaType,
        isSingleMediaType: Object.keys(response).length === 1,
        scopeDeclarationPath: content.scopeDeclarationPath,
        declarationPath: content.declarationPath,
        models: sortModels(content.data),
      })
    })
  })
  return result
}

function flatRequests(responses: Record<MediaType, OpenApiVisitorDataWithSection>): OperationSection[] {
  const result: OperationSection[] = []
  Object.entries(responses).forEach(([mediaType, content]) => {
    result.push({
      sectionKey: `request-${mediaType}`,
      kind: OPEN_API_SECTION_REQUESTS,
      mediaType: mediaType,
      isSingleMediaType: Object.keys(responses).length === 1,
      scopeDeclarationPath: content.scopeDeclarationPath,
      declarationPath: content.declarationPath,
      models: sortModels(content.data),
    })
  })
  return result
}

function getSectionTitle(
  kind: typeof OPEN_API_SECTION_PARAMETERS | typeof OPEN_API_SECTION_REQUESTS | typeof OPEN_API_SECTION_RESPONSES,
  code?: ResponseCode,
  mediaType?: MediaType,
  isSingleMediaType?: boolean,
): string {
  if (kind === OPEN_API_SECTION_PARAMETERS) {
    return 'Parameters'
  }
  if (kind === OPEN_API_SECTION_REQUESTS) {
    return `Requests ${!isSingleMediaType ? `(${mediaType})` : ''}`
  }
  if (kind === OPEN_API_SECTION_RESPONSES) {
    return `Response ${code} ${!isSingleMediaType ? `(${mediaType})` : ''}`
  }

  return ''
}

function isTreeViewLabel(element: Element): boolean {
  return !!element.closest('.MuiTreeItem-label')
}

function isTreeViewExpandIcon(element: Element): boolean {
  return !!element.closest('.MuiTreeItem-iconContainer')
}

function sortModels(models: OpenApiVisitorData[]): OpenApiVisitorData[] {
  return models.sort((model1, model2) =>
    model1.title.localeCompare(model2.title),
  )
}

function getDefaultAvailableSection(sections: OperationSection[]): OperationSection {
  const firstPriorityResponses = sections.filter(section => section.code === FIRST_PRIORITY_CODE)
  if (isNotEmpty(firstPriorityResponses)) {
    return firstPriorityResponses.find(response => response.mediaType === FIRST_PRIORITY_MEDIA_TYPE) ?? firstPriorityResponses[0]
  }

  const secondPriorityResponses = sections.filter(section => section.code === SECOND_PRIORITY_CODE)
  if (isNotEmpty(secondPriorityResponses)) {
    return secondPriorityResponses[0]
  }

  return sections.find(section => section.sectionKey === OPEN_API_SECTION_REQUESTS) ?? sections[0]
}

const FIRST_PRIORITY_CODE = '200'
const SECOND_PRIORITY_CODE = '2XX'
const FIRST_PRIORITY_MEDIA_TYPE = 'application/json'
