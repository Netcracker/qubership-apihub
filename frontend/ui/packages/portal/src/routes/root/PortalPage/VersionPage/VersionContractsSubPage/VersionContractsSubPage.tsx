import type { NumberSize, ResizeDirection } from 're-resizable'
import type { FC, MutableRefObject } from 'react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'

import type { Key } from '@apihub/entities/keys'
import { usePortalPageSettingsContext } from '@apihub/routes/PortalPageSettingsProvider'
import { type ApiType, isApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import {
  CONTRACT_TYPE_DDL,
  CONTRACT_TYPE_MCP,
  type ContractType,
  toRouteApiType,
} from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'
import { MCP_COLLECTION_INIT, type McpListCollection } from '@netcracker/qubership-apihub-ui-shared/entities/contracts-mcp'
import { DEFAULT_API_TYPE } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { DASHBOARD_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { isEmpty, isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { NAVIGATION_MAX_WIDTH } from '@netcracker/qubership-apihub-ui-shared/utils/page-layouts'
import { isEmptyTag } from '@netcracker/qubership-apihub-ui-shared/utils/tags'

import { useSetSelectedPreviewOperation } from '../../SelectedPreviewOperationProvider'
import { usePackageKind } from '../../usePackageKind'
import { useRefSearchParam } from '../../useRefSearchParam'
import { useDdlTables } from '../api/useDdlTables'
import { useMcpEntities } from '../api/useMcpEntities'
import { ExportDdlTablesMenu } from '../ExportDdlTablesMenu'
import { ExportMcpEntitiesMenu } from '../ExportMcpEntitiesMenu'
import { ExportOperationsMenu } from '../ExportOperationsMenu'
import { McpContractsSelectors } from '../McpContractsSelectors'
import { OperationTable } from '../OpenApiViewer/OperationTable'
import { OperationListWithPreview } from '../OperationListWithPreview'
import { OperationsNavigation } from '../OperationsNavigation'
import { useApiAudienceSearchFilter } from '../useApiAudienceSearchFilters'
import { useApiKindSearchFilter } from '../useApiKindSearchFilters'
import { useMcpContractsScope } from '../useMcpContractsScope'
import { useOperationGroupSearchFilter } from '../useOperationGroupSearchFilter'
import { useOperations } from '../useOperations'
import { useStatusSearchFilter } from '../useStatusSearchFIlter'
import { useTagSearchFilter } from '../useTagSearchFilter'
import { VersionContractsPanel } from '../VersionContractsPanel'
import { VERSION_TAB_IDS } from '../VersionTabApiTypes/version-tab-allowed-api-types'
import { DdlTableListView } from './DdlTableListView'
import { DdlTableListWithPreview } from './DdlTableListWithPreview'
import { McpEntityListView } from './McpEntityListView'
import { McpEntityListWithPreview } from './McpEntityListWithPreview'
import { McpOverview } from './McpOverview'

export const VersionContractsSubPage: FC = memo(() => {
  const [searchValue, setSearchValue] = useState('')
  const { packageId, versionId, apiType = DEFAULT_API_TYPE } = useParams<{
    packageId: Key
    versionId: Key
    apiType?: ApiType | ContractType
  }>()
  const routeApiType = toRouteApiType(apiType)
  const bodyRef: MutableRefObject<HTMLDivElement | null> = useRef(null)

  const [apiKindFilter] = useApiKindSearchFilter()
  const [apiAudienceFilter] = useApiAudienceSearchFilter()
  const [selectedTag] = useTagSearchFilter()
  const [statusFilter] = useStatusSearchFilter()
  const [refKey] = useRefSearchParam()
  const [packageKind] = usePackageKind()
  const isDashboard = packageKind === DASHBOARD_KIND

  const emptyTag = isEmptyTag(selectedTag)
  const [operationGroup] = useOperationGroupSearchFilter()
  const setPreviewOperation = useSetSelectedPreviewOperation()

  const isMcp = routeApiType === CONTRACT_TYPE_MCP
  const isDdl = routeApiType === CONTRACT_TYPE_DDL
  const isOperationsApiType = isApiType(routeApiType)
  const hideContractFiltersOnPackage = (isMcp || isDdl) && !isDashboard

  const {
    mcpEndpoint,
    mcpCollection: mcpCollectionParam,
    endpointOptions,
    mcpSummary,
    isEmptyMcpScope,
  } = useMcpContractsScope(isMcp)

  const mcpCollection = mcpCollectionParam ?? MCP_COLLECTION_INIT
  const isMcpOverview = isMcp && mcpCollection === MCP_COLLECTION_INIT
  const mcpListCollection = mcpCollection as McpListCollection

  useEffect(() => {
    if (isMcpOverview) {
      setSearchValue('')
    }
  }, [isMcpOverview])

  const mcpOverview = useMemo(() => (
    <McpOverview
      packageKey={packageId!}
      versionKey={versionId!}
      mcpEndpoint={mcpEndpoint}
      refPackageKey={refKey}
      isEmptyMcpScope={isEmptyMcpScope}
    />
  ), [isEmptyMcpScope, mcpEndpoint, packageId, refKey, versionId])

  const [
    operations,
    isOperationsLoading,
    fetchNextOperationsPage,
    isFetchingNextOperationsPage,
    hasNextOperationsPage,
  ] = useOperations({
    packageKey: packageId,
    versionKey: versionId,
    kind: apiKindFilter,
    apiAudience: apiAudienceFilter,
    deprecated: statusFilter,
    tag: selectedTag,
    textFilter: searchValue,
    apiType: isOperationsApiType ? routeApiType : DEFAULT_API_TYPE,
    groupName: operationGroup,
    refPackageKey: refKey,
    page: 1,
    limit: 100,
    enabled: isOperationsApiType,
  })

  const [mcpEntities, isMcpEntitiesLoading, fetchNextMcpPage, isFetchingNextMcpPage, hasNextMcpPage] = useMcpEntities({
    packageKey: packageId,
    versionKey: versionId,
    collection: mcpCollection,
    textFilter: searchValue,
    mcpEndpoint: mcpEndpoint,
    refPackageKey: refKey,
    limit: 100,
    enabled: isMcp,
  })

  const [ddlTables, isDdlTablesLoading, fetchNextDdlPage, isFetchingNextDdlPage, hasNextDdlPage] = useDdlTables({
    packageKey: packageId,
    versionKey: versionId,
    textFilter: searchValue,
    refPackageKey: refKey,
    limit: 100,
    enabled: isDdl,
  })

  useEffect(() => {
    if (isMcpOverview) {
      setPreviewOperation(undefined)
      return
    }
    if (isMcp && isNotEmpty(mcpEntities)) {
      setPreviewOperation({
        operationKey: mcpEntities[0].mcpEntityId,
        packageRef: mcpEntities[0].packageRef,
      })
      return
    }
    if (isDdl && isNotEmpty(ddlTables)) {
      setPreviewOperation({
        operationKey: ddlTables[0].ddlEntityId,
        packageRef: ddlTables[0].packageRef,
      })
      return
    }
    if (isOperationsApiType) {
      isNotEmpty(operations)
        ? setPreviewOperation(operations[0])
        : setPreviewOperation(undefined)
    }
  }, [
    ddlTables,
    isOperationsApiType,
    isDdl,
    isMcp,
    isMcpOverview,
    mcpEntities,
    operations,
    setPreviewOperation,
  ])

  const {
    previewSize,
    togglePreviewSize,
    hideFiltersPanel,
    toggleHideFiltersPanel,
    toggleOperationsViewMode,
    operationsViewMode,
  } = usePortalPageSettingsContext()

  const onResize = useCallback(
    (_: MouseEvent | TouchEvent, __: ResizeDirection, ___: HTMLElement, delta: NumberSize) => {
      togglePreviewSize(previewSize + delta.width)
    },
    [previewSize, togglePreviewSize],
  )

  const maxPreviewWidth = useMemo(() => {
    if (bodyRef.current?.clientWidth) {
      return bodyRef.current.clientWidth - SUBPAGE_MARGIN
    }
    return NAVIGATION_MAX_WIDTH
    // We need to reset maxPreviewWidth when body width changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodyRef.current?.clientWidth])

  const searchPlaceholder = isOperationsApiType ? 'Search Operations' : 'Search'

  const table = useMemo(() => {
    if (isMcpOverview) {
      return mcpOverview
    }
    if (isMcp) {
      return (
        <McpEntityListView
          entities={mcpEntities}
          packageKey={packageId!}
          versionKey={versionId!}
          collection={mcpListCollection}
          fetchNextPage={fetchNextMcpPage}
          isNextPageFetching={isFetchingNextMcpPage}
          hasNextPage={hasNextMcpPage}
          isLoading={isMcpEntitiesLoading}
        />
      )
    }
    if (isDdl) {
      return (
        <DdlTableListView
          tables={ddlTables}
          packageKey={packageId!}
          versionKey={versionId!}
          fetchNextPage={fetchNextDdlPage}
          isNextPageFetching={isFetchingNextDdlPage}
          hasNextPage={hasNextDdlPage}
          isLoading={isDdlTablesLoading}
        />
      )
    }
    if (isOperationsApiType) {
      return (
        <OperationTable
          value={operations}
          fetchNextPage={fetchNextOperationsPage}
          isNextPageFetching={isFetchingNextOperationsPage}
          hasNextPage={hasNextOperationsPage}
          isLoading={isOperationsLoading}
          apiType={routeApiType}
          textFilter={searchValue}
        />
      )
    }
    return null
  }, [
    routeApiType,
    ddlTables,
    fetchNextDdlPage,
    fetchNextMcpPage,
    fetchNextOperationsPage,
    hasNextDdlPage,
    hasNextMcpPage,
    hasNextOperationsPage,
    isDdl,
    isDdlTablesLoading,
    isFetchingNextDdlPage,
    isFetchingNextMcpPage,
    isFetchingNextOperationsPage,
    isMcp,
    isMcpEntitiesLoading,
    isMcpOverview,
    isOperationsApiType,
    isOperationsLoading,
    mcpEntities,
    mcpListCollection,
    mcpOverview,
    operations,
    packageId,
    searchValue,
    versionId,
  ])

  const list = useMemo(() => {
    if (isMcpOverview) {
      return mcpOverview
    }
    if (isMcp) {
      return (
        <McpEntityListWithPreview
          entities={mcpEntities}
          fetchNextPage={fetchNextMcpPage}
          hasNextPage={hasNextMcpPage}
          isListLoading={isMcpEntitiesLoading}
          isNextPageFetching={isFetchingNextMcpPage}
          packageKey={packageId!}
          versionKey={versionId!}
          collection={mcpListCollection}
          initialSize={previewSize}
          handleResize={onResize}
          maxPreviewWidth={maxPreviewWidth}
        />
      )
    }
    if (isDdl) {
      return (
        <DdlTableListWithPreview
          tables={ddlTables}
          fetchNextPage={fetchNextDdlPage}
          hasNextPage={hasNextDdlPage}
          isListLoading={isDdlTablesLoading}
          isNextPageFetching={isFetchingNextDdlPage}
          packageKey={packageId!}
          versionKey={versionId!}
          initialSize={previewSize}
          handleResize={onResize}
          maxPreviewWidth={maxPreviewWidth}
        />
      )
    }
    if (isOperationsApiType) {
      return (
        <OperationListWithPreview
          operations={operations}
          fetchNextPage={fetchNextOperationsPage}
          hasNextPage={hasNextOperationsPage}
          isListLoading={isOperationsLoading}
          isNextPageFetching={isFetchingNextOperationsPage}
          packageKey={packageId!}
          versionKey={versionId!}
          apiType={routeApiType}
          initialSize={previewSize}
          handleResize={onResize}
          maxPreviewWidth={maxPreviewWidth}
        />
      )
    }
    return null
  }, [
    routeApiType,
    ddlTables,
    fetchNextDdlPage,
    fetchNextMcpPage,
    fetchNextOperationsPage,
    hasNextDdlPage,
    hasNextMcpPage,
    hasNextOperationsPage,
    isDdl,
    isDdlTablesLoading,
    isFetchingNextDdlPage,
    isFetchingNextMcpPage,
    isFetchingNextOperationsPage,
    isMcp,
    isMcpEntitiesLoading,
    isMcpOverview,
    isOperationsApiType,
    isOperationsLoading,
    maxPreviewWidth,
    mcpEntities,
    mcpListCollection,
    mcpOverview,
    onResize,
    operations,
    packageId,
    previewSize,
    versionId,
  ])

  const exportButton = useMemo(() => {
    if (isMcp) {
      return (
        <ExportMcpEntitiesMenu
          collection={mcpCollection}
          textFilter={searchValue}
          refPackageId={refKey}
          disabled={isEmptyMcpScope || isEmpty(mcpEntities)}
        />
      )
    }
    if (isDdl) {
      return (
        <ExportDdlTablesMenu
          textFilter={searchValue}
          refPackageId={refKey}
          disabled={isEmpty(ddlTables)}
        />
      )
    }
    if (isOperationsApiType) {
      return (
        <ExportOperationsMenu
          disabled={isEmpty(operations)}
          textFilter={searchValue}
          kind={apiKindFilter}
          apiAudience={apiAudienceFilter}
          tag={selectedTag}
          group={operationGroup}
          refPackageId={refKey}
          emptyTag={emptyTag}
        />
      )
    }
    return null
  }, [
    apiAudienceFilter,
    apiKindFilter,
    ddlTables,
    emptyTag,
    isEmptyMcpScope,
    isOperationsApiType,
    isDdl,
    isMcp,
    mcpCollection,
    mcpEntities,
    operationGroup,
    operations,
    refKey,
    searchValue,
    selectedTag,
  ])

  const mcpToolbarSelectors = isMcp
    ? (
      <McpContractsSelectors
        endpointOptions={endpointOptions}
        mcpSummary={mcpSummary}
      />
    )
    : undefined

  return (
    <VersionContractsPanel
      versionTabId={VERSION_TAB_IDS.contracts}
      onContextSearch={setSearchValue}
      title={VERSION_CONTRACTS_TITLE}
      bodyRef={bodyRef}
      hideFiltersPanel={hideContractFiltersOnPackage || hideFiltersPanel}
      toggleHideFiltersPanel={toggleHideFiltersPanel}
      operationsViewMode={operationsViewMode}
      toggleOperationsViewMode={toggleOperationsViewMode}
      additionalSelectors={mcpToolbarSelectors}
      hideSearch={isMcpOverview}
      hideFilterButton={hideContractFiltersOnPackage}
      hideViewToggle={isMcpOverview}
      searchPlaceholder={searchPlaceholder}
      table={table}
      list={list}
      filters={<OperationsNavigation />}
      exportButton={exportButton}
      data-testid="ContractsTab"
    />
  )
})

VersionContractsSubPage.displayName = 'VersionContractsSubPage'

const VERSION_CONTRACTS_TITLE = 'API Contracts'

const SUBPAGE_MARGIN = 24
