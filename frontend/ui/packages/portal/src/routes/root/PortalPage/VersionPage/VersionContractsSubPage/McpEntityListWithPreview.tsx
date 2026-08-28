import type { ResizeCallback } from 're-resizable'
import { type FC, memo, useCallback, useMemo } from 'react'

import { McpEntityTitleWithMeta } from '@netcracker/qubership-apihub-ui-shared/components/Mcp/McpEntityTitleWithMeta'
import {
  type FetchNextMetaList,
  MetaClickableListWithPreview,
} from '@netcracker/qubership-apihub-ui-shared/components/MetaClickableListWithPreview'
import { NAVIGATION_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import {
  MCP_COLLECTION_EMPTY_MESSAGES,
  getMcpContractEntityListKey,
  type McpListCollection,
  type McpContractEntity,
} from '@netcracker/qubership-apihub-ui-shared/entities/contracts-mcp'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { DASHBOARD_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'

import { useSelectedPreviewOperation, useSetSelectedPreviewOperation } from '../../SelectedPreviewOperationProvider'
import { usePackageKind } from '../../usePackageKind'
import { usePackageParamsWithRef } from '../../usePackageParamsWithRef'
import { useRefSearchParam } from '../../useRefSearchParam'
import { useMcpEntityDetails } from '../api/useMcpEntityDetails'
import { useContractBrowseLinkHandlers } from '../useContractBrowseLinkHandlers'
import { useMcpEndpointSearchParam } from '../useMcpEndpointSearchParam'
import { getMcpEntityLink } from '../useNavigateToOperation'
import { McpEntityPreview } from './McpEntityPreview'

export type McpEntityListWithPreviewProps = {
  entities: ReadonlyArray<McpContractEntity>
  fetchNextPage?: FetchNextMetaList
  isNextPageFetching?: boolean
  hasNextPage?: boolean
  isListLoading: boolean
  packageKey: Key
  versionKey: Key
  collection: McpListCollection
  initialSize: number
  handleResize: ResizeCallback
  maxPreviewWidth: number
}

export const McpEntityListWithPreview: FC<McpEntityListWithPreviewProps> = memo<McpEntityListWithPreviewProps>(
  (props) => {
    const {
      packageKey,
      versionKey,
      collection,
      entities,
      isListLoading,
      fetchNextPage,
      isNextPageFetching,
      hasNextPage,
      initialSize,
      handleResize,
      maxPreviewWidth,
    } = props

    const [mcpEndpoint] = useMcpEndpointSearchParam()
    const [refKey] = useRefSearchParam()
    const [kind] = usePackageKind()
    const isDashboard = kind === DASHBOARD_KIND

    const selectedPreviewOperation = useSelectedPreviewOperation()
    const setSelectedPreviewOperation = useSetSelectedPreviewOperation()

    const [detailsPackageKey, detailsVersionKey] = usePackageParamsWithRef(
      isDashboard ? selectedPreviewOperation?.packageRef?.key : '',
    )

    const selectedEntity = useMemo(
      () =>
        entities.find(entity =>
          entity.mcpEntityId === selectedPreviewOperation?.operationKey &&
          entity.packageRef?.key === selectedPreviewOperation?.packageRef?.key,
        ),
      [entities, selectedPreviewOperation?.operationKey, selectedPreviewOperation?.packageRef?.key],
    )

    const selectedItemKey = useMemo(() => {
      if (!selectedPreviewOperation?.operationKey) {
        return undefined
      }
      return `${selectedPreviewOperation.packageRef?.key ?? ''}:${selectedPreviewOperation.operationKey}`
    }, [selectedPreviewOperation?.operationKey, selectedPreviewOperation?.packageRef?.key])

    const { data: entityDetails, isInitialLoading } = useMcpEntityDetails({
      packageKey: detailsPackageKey,
      versionKey: detailsVersionKey,
      collection: collection,
      mcpEntityId: selectedEntity?.mcpEntityId,
      enabled: !!selectedEntity?.mcpEntityId,
    })

    const onRowClick = useCallback((itemKey: Key) => {
      const entity = entities.find(candidate => getMcpContractEntityListKey(candidate) === itemKey)
      if (!entity) {
        return
      }
      setSelectedPreviewOperation({
        operationKey: entity.mcpEntityId,
        packageRef: entity.packageRef,
      })
    }, [entities, setSelectedPreviewOperation])

    const prepareLinkFn = useCallback((entity: McpContractEntity) =>
      getMcpEntityLink({
        packageKey: packageKey,
        versionKey: versionKey,
        mcpEntityId: entity.mcpEntityId,
        mcpEndpoint: mcpEndpoint ?? entity.mcpEndpoint,
        mcpCollection: collection,
        ref: isDashboard ? entity.packageRef?.key ?? refKey : undefined,
      }), [collection, isDashboard, mcpEndpoint, packageKey, refKey, versionKey])

    const onClickLink = useContractBrowseLinkHandlers()

    const renderTitle = useCallback(
      (entity: McpContractEntity, link?: Parameters<typeof McpEntityTitleWithMeta>[0]['link']) => (
        <McpEntityTitleWithMeta
          entity={entity}
          link={link}
          onLinkClick={onClickLink}
        />
      ),
      [onClickLink],
    )

    const emptyListPlaceholder = useMemo(() => (
      <Placeholder
        invisible={false}
        area={NAVIGATION_PLACEHOLDER_AREA}
        message={MCP_COLLECTION_EMPTY_MESSAGES[collection]}
        data-testid="NoItemsPlaceholder"
      />
    ), [collection])

    return (
      <MetaClickableListWithPreview
        items={entities}
        getItemKey={getMcpContractEntityListKey}
        renderTitle={renderTitle}
        prepareLinkFn={prepareLinkFn}
        onRowClick={onRowClick}
        fetchNextPage={fetchNextPage}
        isNextPageFetching={isNextPageFetching}
        hasNextPage={hasNextPage}
        isLoading={isListLoading}
        selectedItemKey={selectedItemKey}
        initialSize={initialSize}
        handleResize={handleResize}
        maxWidth={maxPreviewWidth}
        emptyListPlaceholder={emptyListPlaceholder}
        previewComponent={
          <McpEntityPreview
            entity={selectedEntity}
            entityDetails={entityDetails}
            isLoading={isInitialLoading}
            maxWidthHeaderToolbar={initialSize}
          />
        }
      />
    )
  },
)

McpEntityListWithPreview.displayName = 'McpEntityListWithPreview'
