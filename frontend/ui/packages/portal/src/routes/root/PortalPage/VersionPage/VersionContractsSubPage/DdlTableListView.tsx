import type { ColumnDef } from '@tanstack/table-core'
import { type FC, memo, useCallback, useMemo } from 'react'

import { CustomTableHeadCell } from '@netcracker/qubership-apihub-ui-shared/components/CustomTableHeadCell'
import { DdlTableTitleWithMeta } from '@netcracker/qubership-apihub-ui-shared/components/Ddl/DdlTableTitleWithMeta'
import type { FetchNextMetaList } from '@netcracker/qubership-apihub-ui-shared/components/MetaClickableListWithPreview'
import { TextWithOverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/TextWithOverflowTooltip'
import {
  DDL_TABLES_EMPTY_MESSAGE,
  type DdlContractEntity,
  getDdlTableListKey,
} from '@netcracker/qubership-apihub-ui-shared/entities/contracts-ddl'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { DASHBOARD_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import type { ColumnModel } from '@netcracker/qubership-apihub-ui-shared/hooks/table-resizing/useColumnResizing'

import { usePackageKind } from '../../usePackageKind'
import { useRefSearchParam } from '../../useRefSearchParam'
import { useContractBrowseLinkHandlers } from '../useContractBrowseLinkHandlers'
import { getDdlTableLink } from '../useNavigateToOperation'
import { ContractsEntityListTable } from './ContractsEntityListTable'

const TABLES_COLUMN_ID = 'tables'
const PACKAGE_COLUMN_ID = 'package'

const PACKAGE_COLUMNS_MODELS: ColumnModel[] = [
  { name: TABLES_COLUMN_ID },
]

const DASHBOARD_COLUMNS_MODELS: ColumnModel[] = [
  { name: TABLES_COLUMN_ID },
  { name: PACKAGE_COLUMN_ID, width: 226 },
]

type DdlTableListViewRow = {
  table: DdlContractEntity
}

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
  const [refKey] = useRefSearchParam()
  const [packageKind] = usePackageKind()
  const isDashboard = packageKind === DASHBOARD_KIND
  const onLinkClick = useContractBrowseLinkHandlers()

  const columns: ColumnDef<DdlTableListViewRow>[] = useMemo(() => {
    const result: ColumnDef<DdlTableListViewRow>[] = [
      {
        id: TABLES_COLUMN_ID,
        header: () => <CustomTableHeadCell title="Tables" />,
        cell: ({ row: { original: { table } } }) => (
          <DdlTableTitleWithMeta
            table={table}
            link={getDdlTableLink({
              packageKey: packageKey,
              versionKey: versionKey,
              ddlEntityId: table.ddlEntityId,
              ref: isDashboard ? table.packageRef?.key ?? refKey : undefined,
            })}
            onLinkClick={onLinkClick}
          />
        ),
      },
    ]

    if (isDashboard) {
      result.push({
        id: PACKAGE_COLUMN_ID,
        header: () => <CustomTableHeadCell title="Package" />,
        cell: ({ row: { original: { table } } }) => {
          if (table.packageRef?.name) {
            return (
              <TextWithOverflowTooltip tooltipText={table.packageRef.name}>
                {table.packageRef.name}
              </TextWithOverflowTooltip>
            )
          }
        },
      })
    }

    return result
  }, [isDashboard, onLinkClick, packageKey, refKey, versionKey])

  const data: DdlTableListViewRow[] = useMemo(
    () => tables.map(table => ({ table })),
    [tables],
  )

  const columnModels = isDashboard ? DASHBOARD_COLUMNS_MODELS : PACKAGE_COLUMNS_MODELS
  const resolveRowId = useCallback((row: DdlTableListViewRow) => getDdlTableListKey(row.table), [])

  return (
    <ContractsEntityListTable
      columns={columns}
      data={data}
      getRowId={resolveRowId}
      columnModels={columnModels}
      emptyMessage={DDL_TABLES_EMPTY_MESSAGE}
      fetchNextPage={fetchNextPage}
      isNextPageFetching={isNextPageFetching}
      hasNextPage={hasNextPage}
      isLoading={isLoading}
    />
  )
})

DdlTableListView.displayName = 'DdlTableListView'
