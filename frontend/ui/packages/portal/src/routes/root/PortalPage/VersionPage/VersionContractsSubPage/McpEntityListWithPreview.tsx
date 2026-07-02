import type { ResizeCallback } from 're-resizable'
import type { FC } from 'react'
import { memo, useCallback, useMemo } from 'react'

import { McpEntityTitleWithMeta } from '@netcracker/qubership-apihub-ui-shared/components/Mcp/McpEntityTitleWithMeta'
import type { FetchNextMetaList } from '@netcracker/qubership-apihub-ui-shared/components/MetaClickableListWithPreview'
import { MetaClickableListWithPreview } from '@netcracker/qubership-apihub-ui-shared/components/MetaClickableListWithPreview'
import { NAVIGATION_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import type { McpCollection, McpEntity } from '@netcracker/qubership-apihub-ui-shared/entities/contracts-mcp'
import { MCP_COLLECTION_EMPTY_MESSAGES } from '@netcracker/qubership-apihub-ui-shared/entities/contracts-mcp'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'

import { useSelectedPreviewOperation, useSetSelectedPreviewOperation } from '../../SelectedPreviewOperationProvider'
import { useMcpEntityDetails } from '../api/useMcpEntityDetails'
import { useContractBrowseLinkHandlers } from '../useContractBrowseLinkHandlers'
import { useMcpEndpointSearchParam } from '../useMcpEndpointSearchParam'
import { useMcpEntitySearchParam } from '../useMcpEntitySearchParam'
import { getMcpEntityLink } from '../useNavigateToOperation'
import { McpEntityPreview } from './McpEntityPreview'

export type McpEntityListWithPreviewProps = {
  entities: ReadonlyArray<McpEntity>
  fetchNextPage?: FetchNextMetaList
  isNextPageFetching?: boolean
  hasNextPage?: boolean
  isListLoading: boolean
  packageKey: Key
  versionKey: Key
  collection: McpCollection
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
    const [mcpEntity] = useMcpEntitySearchParam()

    const selectedPreviewOperation = useSelectedPreviewOperation()
    const setSelectedPreviewOperation = useSetSelectedPreviewOperation()

    const selectedEntity = useMemo(
      () => entities.find(entity => entity.mcpEntityId === selectedPreviewOperation?.operationKey),
      [entities, selectedPreviewOperation?.operationKey],
    )

    const { data: entityDetails, isInitialLoading } = useMcpEntityDetails({
      packageKey: packageKey,
      versionKey: versionKey,
      collection: collection,
      mcpEntityId: selectedEntity?.mcpEntityId,
      enabled: !!selectedEntity?.mcpEntityId,
    })

    const onRowClick = useCallback((selectedMcpEntityId: Key) => {
      setSelectedPreviewOperation({ operationKey: selectedMcpEntityId })
    }, [setSelectedPreviewOperation])

    const prepareLinkFn = useCallback((entity: McpEntity) =>
      getMcpEntityLink({
        packageKey: packageKey,
        versionKey: versionKey,
        mcpEntityId: entity.mcpEntityId,
        mcpEndpoint: mcpEndpoint ?? entity.mcpEndpoint,
        mcpEntity: mcpEntity ?? collection,
      }), [collection, mcpEndpoint, mcpEntity, packageKey, versionKey])

    const onClickLink = useContractBrowseLinkHandlers()

    const renderTitle = useCallback(
      (entity: McpEntity, link?: Parameters<typeof McpEntityTitleWithMeta>[0]['link']) => (
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
        getItemKey={entity => entity.mcpEntityId}
        renderTitle={renderTitle}
        prepareLinkFn={prepareLinkFn}
        onRowClick={onRowClick}
        fetchNextPage={fetchNextPage}
        isNextPageFetching={isNextPageFetching}
        hasNextPage={hasNextPage}
        isLoading={isListLoading}
        selectedItemKey={selectedPreviewOperation?.operationKey}
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
