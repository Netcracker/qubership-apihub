import { type FC, memo, useRef } from 'react'
import { Marker } from 'react-mark.js'

import { DdlSchemaChip } from '@netcracker/qubership-apihub-ui-shared/components/Ddl/DdlSchemaChip'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import {
  OperationPathMeta,
  useOperationTitleMeta,
} from '@netcracker/qubership-apihub-ui-shared/components/Operations/OperationTitleWithMeta'
import { CONTRACT_TYPE_MCP } from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'
import {
  getMcpKindDefinition,
  MCP_COLLECTION_INIT,
} from '@netcracker/qubership-apihub-ui-shared/entities/contracts-mcp'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { useIntersectionObserver } from '@netcracker/qubership-apihub-ui-shared/hooks/common/useIntersectionObserver'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'

import {
  type ContractElementSearchResult,
  DDL_LEVEL,
  type DdlContractSearchResult,
  MCP_LEVEL,
  type McpContractSearchResult,
  OPERATION_LEVEL,
  type OperationSearchResult,
} from '@apihub/entities/global-search'
import { getOperationsPath } from '../../../NavigationProvider'
import { MCP_COLLECTION_SEARCH_PARAM } from '../../PortalPage/VersionPage/useMcpCollectionSearchParam'
import { MCP_ENDPOINT_SEARCH_PARAM } from '../../PortalPage/VersionPage/useMcpEndpointSearchParam'
import { getDdlTableLink, getMcpEntityLink } from '../../PortalPage/VersionPage/useNavigateToOperation'
import type { FetchNextSearchResultList } from './global-search'
import { ResultCommonHeader } from './ResultCommonHeader'
import {
  SearchResultListRoot,
  SearchResultListSentinel,
  SearchResultMetaLine,
  SearchResultRowRoot,
  SearchResultRowSection,
} from './SearchResultRowLayout'

type ContractElementSearchListProps = {
  value: ContractElementSearchResult[]
  searchText: string
  fetchNextPage?: FetchNextSearchResultList
  isNextPageFetching?: boolean
  hasNextPage?: boolean
}

export const ContractElementSearchList: FC<ContractElementSearchListProps> = memo<ContractElementSearchListProps>((
  { value, searchText, isNextPageFetching, hasNextPage, fetchNextPage },
) => {
  const ref = useRef<HTMLDivElement>(null)
  useIntersectionObserver(ref, isNextPageFetching, hasNextPage, fetchNextPage)

  return (
    <SearchResultListRoot>
      {value.map((item) => (
        <ContractElementSearchResultRow
          key={getContractElementSearchResultKey(item)}
          item={item}
          searchText={searchText}
        />
      ))}

      {hasNextPage && (
        <SearchResultListSentinel ref={ref}>
          <LoadingIndicator />
        </SearchResultListSentinel>
      )}
    </SearchResultListRoot>
  )
})

ContractElementSearchList.displayName = 'ContractElementSearchList'

type ContractElementSearchResultRowProps = {
  item: ContractElementSearchResult
  searchText: string
}

const ContractElementSearchResultRow: FC<ContractElementSearchResultRowProps> = memo<
  ContractElementSearchResultRowProps
>(({
  item,
  searchText,
}) => {
  switch (item.level) {
    case OPERATION_LEVEL:
      return <OperationSearchResultRow result={item.result} searchText={searchText} />
    case MCP_LEVEL:
      return <McpContractSearchResultRow result={item.result} searchText={searchText} />
    case DDL_LEVEL:
      return <DdlContractSearchResultRow result={item.result} searchText={searchText} />
  }
})

ContractElementSearchResultRow.displayName = 'ContractElementSearchResultRow'

type OperationSearchResultRowProps = {
  result: OperationSearchResult
  searchText: string
}

const OperationSearchResultRow: FC<OperationSearchResultRowProps> = memo<OperationSearchResultRowProps>(({
  result,
  searchText,
}) => {
  const { version, operationKey, packageKey, apiType, parentPackages, name, title } = result
  const { versionKey, parents } = getSearchResultParents(parentPackages, name, version)
  const { subtitle, operationType } = useOperationTitleMeta(result)

  return (
    <SearchResultRowRoot data-testid="SearchResultRow">
      <ResultCommonHeader
        url={getOperationsPath({ packageKey, versionKey, operationKey, apiType })}
        title={title}
        parents={parents}
        searchText={searchText}
      />
      <Marker mark={searchText}>
        <OperationPathMeta subtitle={subtitle} operationType={operationType} />
      </Marker>
    </SearchResultRowRoot>
  )
})

OperationSearchResultRow.displayName = 'OperationSearchResultRow'

type McpContractSearchResultRowProps = {
  result: McpContractSearchResult
  searchText: string
}

const McpContractSearchResultRow: FC<McpContractSearchResultRowProps> = memo<McpContractSearchResultRowProps>(({
  result,
  searchText,
}) => {
  const {
    packageKey,
    name,
    parentPackages,
    version,
    entityId,
    entityName,
    kind,
    mcpEndpoint,
  } = result
  const { versionKey, parents } = getSearchResultParents(parentPackages, name, version)
  const { mcpCollection, mcpDocumentType } = getMcpKindDefinition(kind)
  const url = mcpCollection === MCP_COLLECTION_INIT
    ? getOperationsPath({
      packageKey: packageKey,
      versionKey: versionKey,
      apiType: CONTRACT_TYPE_MCP,
      search: {
        [MCP_ENDPOINT_SEARCH_PARAM]: { value: mcpEndpoint },
        [MCP_COLLECTION_SEARCH_PARAM]: { value: MCP_COLLECTION_INIT },
      },
    })
    : getMcpEntityLink({
      packageKey: packageKey,
      versionKey: versionKey,
      mcpEntityId: entityId,
      mcpEndpoint: mcpEndpoint,
      mcpCollection: mcpCollection,
    })

  return (
    <SearchResultRowRoot data-testid="SearchResultRow">
      <ResultCommonHeader
        url={url}
        icon={mcpDocumentType}
        title={entityName ?? entityId}
        parents={parents}
        searchText={searchText}
      />
      <SearchResultMetaLine
        label="MCP Endpoint"
        value={mcpEndpoint}
        searchText={searchText}
        data-testid="McpEndpointValue"
        valueTestId="McpEndpointPath"
      />
    </SearchResultRowRoot>
  )
})

McpContractSearchResultRow.displayName = 'McpContractSearchResultRow'

type DdlContractSearchResultRowProps = {
  result: DdlContractSearchResult
  searchText: string
}

const DdlContractSearchResultRow: FC<DdlContractSearchResultRowProps> = memo<DdlContractSearchResultRowProps>(({
  result,
  searchText,
}) => {
  const {
    packageKey,
    name,
    parentPackages,
    version,
    entityId,
    entityName,
    schemaName,
  } = result
  const { versionKey, parents } = getSearchResultParents(parentPackages, name, version)

  return (
    <SearchResultRowRoot data-testid="SearchResultRow">
      <ResultCommonHeader
        url={getDdlTableLink({
          packageKey: packageKey,
          versionKey: versionKey,
          ddlEntityId: entityId,
        })}
        title={entityName ?? entityId}
        parents={parents}
        searchText={searchText}
      />
      {schemaName && (
        <SearchResultRowSection>
          <DdlSchemaChip
            label={schemaName}
            data-testid="DdlSchemaNameChip"
          />
        </SearchResultRowSection>
      )}
    </SearchResultRowRoot>
  )
})

DdlContractSearchResultRow.displayName = 'DdlContractSearchResultRow'

type SearchResultParents = {
  versionKey: Key
  parents: string[]
}

function getSearchResultParents(
  parentPackages: string[],
  name: string,
  version: Key,
): SearchResultParents {
  const { versionKey } = getSplittedVersionKey(version)
  const parents = [...parentPackages, name, versionKey]
  return { versionKey, parents }
}

function getContractElementSearchResultKey(item: ContractElementSearchResult): string {
  const { level, result } = item
  if (level === OPERATION_LEVEL) {
    return `${level}-${result.packageKey}-${result.operationKey}-${result.version}`
  }
  return `${level}-${result.packageKey}-${result.entityId}-${result.version}`
}
