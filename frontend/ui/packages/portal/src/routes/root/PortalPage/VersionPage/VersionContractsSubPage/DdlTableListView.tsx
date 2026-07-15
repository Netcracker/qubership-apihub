import { Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material'
import type { FC } from 'react'
import { memo, useRef } from 'react'

import { DdlTableTitleWithMeta } from '@netcracker/qubership-apihub-ui-shared/components/Ddl/DdlTableTitleWithMeta'
import type { FetchNextMetaList } from '@netcracker/qubership-apihub-ui-shared/components/MetaClickableListWithPreview'
import { CONTENT_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import type { DdlContractEntity } from '@netcracker/qubership-apihub-ui-shared/entities/contracts-ddl'
import { DDL_TABLES_EMPTY_MESSAGE } from '@netcracker/qubership-apihub-ui-shared/entities/contracts-ddl'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { useIntersectionObserver } from '@netcracker/qubership-apihub-ui-shared/hooks/common/useIntersectionObserver'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'

import { getDdlTableLink } from '../useNavigateToOperation'

export type DdlTableListViewProps = {
  tables: ReadonlyArray<DdlContractEntity>
  packageKey: Key
  versionKey: Key
  fetchNextPage?: FetchNextMetaList
  isNextPageFetching?: boolean
  hasNextPage?: boolean
  isLoading?: boolean
}

export const DdlTableListView: FC<DdlTableListViewProps> = memo<DdlTableListViewProps>(({
  tables,
  packageKey,
  versionKey,
  fetchNextPage,
  isNextPageFetching,
  hasNextPage,
  isLoading = false,
}) => {
  const ref = useRef<HTMLTableRowElement>(null)
  useIntersectionObserver(ref, isNextPageFetching, hasNextPage, fetchNextPage)

  return (
    <Placeholder
      invisible={isNotEmpty(tables) || isLoading}
      area={CONTENT_PLACEHOLDER_AREA}
      message={DDL_TABLES_EMPTY_MESSAGE}
      data-testid="NoItemsPlaceholder"
    >
      <TableContainer>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Tables</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tables.map(table => (
              <TableRow key={table.ddlEntityId} hover>
                <TableCell data-testid="Cell-tables">
                  <DdlTableTitleWithMeta
                    table={table}
                    link={getDdlTableLink({
                      packageKey: packageKey,
                      versionKey: versionKey,
                      ddlEntityId: table.ddlEntityId,
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

DdlTableListView.displayName = 'DdlTableListView'
