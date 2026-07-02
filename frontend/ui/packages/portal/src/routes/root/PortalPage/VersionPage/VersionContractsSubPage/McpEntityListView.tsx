import { Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material'
import type { FC } from 'react'
import { memo, useRef } from 'react'

import { McpEntityTitleWithMeta } from '@netcracker/qubership-apihub-ui-shared/components/Mcp/McpEntityTitleWithMeta'
import type { FetchNextMetaList } from '@netcracker/qubership-apihub-ui-shared/components/MetaClickableListWithPreview'
import { CONTENT_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import type { McpCollection, McpEntity } from '@netcracker/qubership-apihub-ui-shared/entities/contracts-mcp'
import { MCP_COLLECTION_EMPTY_MESSAGES } from '@netcracker/qubership-apihub-ui-shared/entities/contracts-mcp'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { useIntersectionObserver } from '@netcracker/qubership-apihub-ui-shared/hooks/common/useIntersectionObserver'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'

import { useMcpEndpointSearchParam } from '../useMcpEndpointSearchParam'
import { useMcpEntitySearchParam } from '../useMcpEntitySearchParam'
import { getMcpEntityLink } from '../useNavigateToOperation'

export type McpEntityListViewProps = {
  entities: ReadonlyArray<McpEntity>
  packageKey: Key
  versionKey: Key
  collection: McpCollection
  fetchNextPage?: FetchNextMetaList
  isNextPageFetching?: boolean
  hasNextPage?: boolean
  isLoading?: boolean
}

export const McpEntityListView: FC<McpEntityListViewProps> = memo<McpEntityListViewProps>(({
  entities,
  packageKey,
  versionKey,
  collection,
  fetchNextPage,
  isNextPageFetching,
  hasNextPage,
  isLoading = false,
}) => {
  const [mcpEndpoint] = useMcpEndpointSearchParam()
  const [mcpEntity] = useMcpEntitySearchParam()
  const ref = useRef<HTMLTableRowElement>(null)
  useIntersectionObserver(ref, isNextPageFetching, hasNextPage, fetchNextPage)

  return (
    <Placeholder
      invisible={isNotEmpty(entities) || isLoading}
      area={CONTENT_PLACEHOLDER_AREA}
      message={MCP_COLLECTION_EMPTY_MESSAGES[collection]}
      data-testid="NoItemsPlaceholder"
    >
      <TableContainer>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entities.map(entity => (
              <TableRow key={entity.mcpEntityId} hover>
                <TableCell data-testid="Cell-name">
                  <McpEntityTitleWithMeta
                    entity={entity}
                    link={getMcpEntityLink({
                      packageKey: packageKey,
                      versionKey: versionKey,
                      mcpEntityId: entity.mcpEntityId,
                      mcpEndpoint: mcpEndpoint ?? entity.mcpEndpoint,
                      mcpEntity: mcpEntity ?? collection,
                    })}
                  />
                </TableCell>
              </TableRow>
            ))}
            {isLoading && (
              <TableRow>
                <TableCell>
                  <Skeleton variant="rectangular" height={20} />
                </TableCell>
              </TableRow>
            )}
            {hasNextPage && (
              <TableRow ref={ref}>
                <TableCell>
                  <Skeleton variant="rectangular" height={20} />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Placeholder>
  )
})

McpEntityListView.displayName = 'McpEntityListView'
