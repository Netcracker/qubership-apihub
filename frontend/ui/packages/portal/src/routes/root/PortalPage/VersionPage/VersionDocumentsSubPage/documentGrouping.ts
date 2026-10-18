import { groupBy, sortBy } from 'lodash-es'

import { compareMcpDocumentTypes } from '@netcracker/qubership-apihub-ui-shared/entities/contracts-mcp'
import { alphabeticallyBy } from '@netcracker/qubership-apihub-ui-shared/utils/comparers'
import {
  isAsyncApiSpecType,
  isDdlDocumentSpecType,
  isGraphQlSpecType,
  isMcpDocumentSpecType,
  isOpenApiSpecType,
  JSON_SCHEMA_SPEC_TYPE,
  MARKDOWN_SPEC_TYPE,
  type McpDocumentType,
  PROTOBUF_3_SPEC_TYPE,
  type SpecType,
} from '@netcracker/qubership-apihub-ui-shared/utils/specs'

import type { Document } from '@portal/entities/documents'
import type { Key } from '@portal/entities/keys'
import type { VersionFiles } from '@portal/entities/package-version-config'

const GROUP_NAME_MCP = 'MCP'
const GROUP_NAME_DDL = 'DDL'
const GROUP_NAME_MARKDOWN = 'Markdown'
const GROUP_NAME_OPENAPI = 'OpenAPI'
const GROUP_NAME_GRAPHQL = 'GraphQL'
const GROUP_NAME_PROTOBUF = 'Protobuf'
const GROUP_NAME_JSON_SCHEMA = 'JSON Schema'
const GROUP_NAME_ASYNCAPI = 'AsyncAPI'
const GROUP_NAME_OTHER = 'Other'

export type GroupName =
  | typeof GROUP_NAME_MCP
  | typeof GROUP_NAME_DDL
  | typeof GROUP_NAME_MARKDOWN
  | typeof GROUP_NAME_OPENAPI
  | typeof GROUP_NAME_GRAPHQL
  | typeof GROUP_NAME_PROTOBUF
  | typeof GROUP_NAME_JSON_SCHEMA
  | typeof GROUP_NAME_OTHER
  | typeof GROUP_NAME_ASYNCAPI

const GROUPS_DISPLAY_ORDER: ReadonlyArray<GroupName> = [
  GROUP_NAME_MCP,
  GROUP_NAME_OPENAPI,
  GROUP_NAME_GRAPHQL,
  GROUP_NAME_ASYNCAPI,
  GROUP_NAME_JSON_SCHEMA,
  GROUP_NAME_PROTOBUF,
  GROUP_NAME_DDL,
  GROUP_NAME_MARKDOWN,
  GROUP_NAME_OTHER,
]

export type DocumentSidebarMcpEndpointGroup = Readonly<{
  endpointLabel: string
  documents: ReadonlyArray<Document>
}>

export type DocumentSidebarMcpGroup = Readonly<{
  groupName: typeof GROUP_NAME_MCP
  mcpEndpointGroups: ReadonlyArray<DocumentSidebarMcpEndpointGroup>
}>

export type DocumentSidebarFlatGroup = Readonly<{
  groupName: Exclude<GroupName, typeof GROUP_NAME_MCP>
  documents: ReadonlyArray<Document>
}>

export type DocumentSidebarGroup = DocumentSidebarMcpGroup | DocumentSidebarFlatGroup

export function groupDocumentsForSidebar(
  documents: ReadonlyArray<Document>,
  mcpEndpointByFileKey: ReadonlyMap<Key, string>,
): ReadonlyArray<DocumentSidebarGroup> {
  const mcpDocuments: Document[] = []
  const ddlDocuments: Document[] = []
  const documentsByGroupName = new Map<Exclude<GroupName, typeof GROUP_NAME_MCP>, Document[]>()

  for (const document of documents) {
    if (isMcpDocumentSpecType(document.type)) {
      mcpDocuments.push(document)
      continue
    }
    if (isDdlDocumentSpecType(document.type)) {
      ddlDocuments.push(document)
      continue
    }
    const groupName = getGroupNameBySpecType(document.type)
    const groupDocuments = documentsByGroupName.get(groupName) ?? []
    groupDocuments.push(document)
    documentsByGroupName.set(groupName, groupDocuments)
  }

  const sidebarGroups: DocumentSidebarGroup[] = []

  for (const groupName of GROUPS_DISPLAY_ORDER) {
    if (groupName === GROUP_NAME_MCP) {
      const mcpEndpointGroups = buildMcpEndpointGroups(mcpDocuments, mcpEndpointByFileKey)
      if (mcpEndpointGroups.length > 0) {
        sidebarGroups.push({
          groupName: GROUP_NAME_MCP,
          mcpEndpointGroups: mcpEndpointGroups,
        })
      }
      continue
    }

    if (groupName === GROUP_NAME_DDL) {
      if (ddlDocuments.length > 0) {
        sidebarGroups.push({
          groupName: GROUP_NAME_DDL,
          documents: [...ddlDocuments].sort((it, that) => alphabeticallyBy('title', it, that)),
        })
      }
      continue
    }

    const groupDocuments = documentsByGroupName.get(groupName)
    if (groupDocuments && groupDocuments.length > 0) {
      sidebarGroups.push({
        groupName: groupName,
        documents: [...groupDocuments].sort((it, that) => alphabeticallyBy('title', it, that)),
      })
    }
  }

  return sidebarGroups
}

export function buildMcpEndpointByFileKey(files?: VersionFiles): ReadonlyMap<Key, string> {
  const mcpEndpointByFileKey = new Map<Key, string>()
  if (!files) {
    return mcpEndpointByFileKey
  }
  for (const file of files) {
    const mcpEndpoint = file.metadata?.mcpEndpoint?.trim()
    if (mcpEndpoint) {
      mcpEndpointByFileKey.set(file.fileKey, mcpEndpoint)
    }
  }
  return mcpEndpointByFileKey
}

export function isMcpSidebarGroup(group: DocumentSidebarGroup): group is DocumentSidebarMcpGroup {
  return group.groupName === GROUP_NAME_MCP
}

function buildMcpEndpointGroups(
  mcpDocuments: ReadonlyArray<Document>,
  mcpEndpointByFileKey: ReadonlyMap<Key, string>,
): ReadonlyArray<DocumentSidebarMcpEndpointGroup> {
  return sortBy(
    Object.entries(groupBy(mcpDocuments, document => mcpEndpointByFileKey.get(document.key) ?? '')),
    ([endpointLabel]) => endpointLabel,
  ).map(([endpointLabel, endpointDocuments]) => ({
    endpointLabel: endpointLabel,
    documents: [...endpointDocuments].sort(compareMcpDocuments),
  }))
}

function getGroupNameBySpecType(type: SpecType): Exclude<GroupName, typeof GROUP_NAME_MCP> {
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
  if (isAsyncApiSpecType(type)) {
    return GROUP_NAME_ASYNCAPI
  }

  return GROUP_NAME_OTHER
}

function compareMcpDocuments(documentA: Document, documentB: Document): number {
  const typeCompare = compareMcpDocumentTypes(
    documentA.type as McpDocumentType,
    documentB.type as McpDocumentType,
  )
  if (typeCompare !== 0) {
    return typeCompare
  }
  return alphabeticallyBy('title', documentA, documentB)
}
