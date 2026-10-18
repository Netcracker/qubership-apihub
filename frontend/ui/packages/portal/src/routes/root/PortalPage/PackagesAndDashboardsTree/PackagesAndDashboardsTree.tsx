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

import type { FC } from 'react'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material'
import { ReferenceRow } from './ReferenceRow'
import {
  DashboardCollapsedReferenceKeysContext,
  SetDashboardCollapsedReferenceKeysContext,
} from './CollapsedReferenceKeysContext'
import { useVersionReferences } from '../../useVersionReferences'
import { useParams } from 'react-router-dom'
import { useUpdateDeletedReferences } from '../useDeletedReferences'
import { useAddDashboardPackages, useDashboardPackages, useResetDashboardPackages } from '../useDashboardPackages'
import { useAddConflictedReferences } from '../useConflictedReferences'
import { useEffectOnce } from 'react-use'
import type { ColumnDef, ColumnSizingInfoState, ColumnSizingState, OnChangeFn } from '@tanstack/react-table'
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { PackageReferenceWithStatus } from '@apihub/routes/root/PortalPage/DashboardPage/configure-dashboard'
import type { ReferenceKind } from '@netcracker/qubership-apihub-ui-shared/entities/version-references'
import type { ColumnModel } from '@netcracker/qubership-apihub-ui-shared/hooks/table-resizing/useColumnResizing'
import {
  DEFAULT_CONTAINER_WIDTH,
  useColumnsSizing,
} from '@netcracker/qubership-apihub-ui-shared/hooks/table-resizing/useColumnResizing'
import { CustomTableHeadCell } from '@netcracker/qubership-apihub-ui-shared/components/CustomTableHeadCell'
import { CONTENT_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { ColumnDelimiter } from '@netcracker/qubership-apihub-ui-shared/components/ColumnDelimiter'
import { createComponents } from '@netcracker/qubership-apihub-ui-shared/utils/components'
import { DEFAULT_NUMBER_SKELETON_ROWS } from '@netcracker/qubership-apihub-ui-shared/utils/constants'
import { useResizeObserver } from '@netcracker/qubership-apihub-ui-shared/hooks/common/useResizeObserver'

export type PackagesAndDashboardsTreeProps = {
  currentDashboardReferences: PackageReferenceWithStatus[]
  onRemove?: (key: Key, version: Key, kind: ReferenceKind, deleted: boolean) => void
  isLoading: boolean
  readonly: boolean
}

export const PackagesAndDashboardsTree: FC<PackagesAndDashboardsTreeProps> = memo<PackagesAndDashboardsTreeProps>(({
  currentDashboardReferences,
  onRemove,
  isLoading,
  readonly,
}) => {
  const [collapsedKeys, setCollapsedKeys] = useState<Key[]>([])
  const { packageId, versionId } = useParams()
  const { data: versionReferences, isInitialLoading: isReferencesLoading } = useVersionReferences({
    packageKey: packageId!,
    version: versionId!,
    enabled: true,
  })

  const addedDashboardReferences = useMemo(() => {
    return currentDashboardReferences?.filter(({ added }) => added)
  }, [currentDashboardReferences])

  const { data: dashboardPackages } = useDashboardPackages(packageId!, versionId!)

  const [addDashboardPackages] = useAddDashboardPackages()
  const [addConflictedReferences] = useAddConflictedReferences()
  const [resetDashboardPackages] = useResetDashboardPackages()
  const [updateDeletedReferences] = useUpdateDeletedReferences()

  useEffectOnce(() => {
    resetDashboardPackages()
  })

  useEffect(() => {
    updateDeletedReferences({ versionReferences })
    addDashboardPackages({ versionReferences })
  }, [versionReferences, addDashboardPackages, updateDeletedReferences])

  useEffect(() => {
    addConflictedReferences({ versionReferences })
  }, [addConflictedReferences, dashboardPackages, versionReferences])

  const [containerWidth, setContainerWidth] = useState(DEFAULT_CONTAINER_WIDTH)
  const [columnSizingInfo, setColumnSizingInfo] = useState<ColumnSizingInfoState>()
  const [, setHandlingColumnSizing] = useState<ColumnSizingState>()

  const tableContainerRef = useRef<HTMLDivElement>(null)
  useResizeObserver(tableContainerRef, setContainerWidth)

  const actualColumnSizing = useColumnsSizing({
    containerWidth: containerWidth,
    columnModels: COLUMNS_MODELS,
    columnSizingInfo: columnSizingInfo,
    defaultMinColumnSize: 60,
  })

  const data: TableData[] = useMemo(() => currentDashboardReferences.map(pack => ({
    packageReference: pack,
  })), [currentDashboardReferences])

  const columns: ColumnDef<TableData>[] = useMemo(() => [
      {
        id: PACKAGE_COLUMN_ID,
        header: () => <CustomTableHeadCell title="Packages and Dashboards"/>,
      },
      {
        id: VERSION_COLUMN_ID,
        header: () => <CustomTableHeadCell title="Version"/>,
      },
      {
        id: STATUS_COLUMN_ID,
        header: () => <CustomTableHeadCell title="Status"/>,
      },
      {
        id: REMOVE_COLUMN_ID,
        header: () => <CustomTableHeadCell title=""/>,
      },
    ], [],
  )

  const { getHeaderGroups, setColumnSizing } = useReactTable({
    data: data,
    columns: columns,
    getCoreRowModel: getCoreRowModel(),
    // TODO: remove 'as' since compatible types
    columnResizeMode: 'onChange',
    onColumnSizingChange: setHandlingColumnSizing as OnChangeFn<ColumnSizingState>,
    onColumnSizingInfoChange: setColumnSizingInfo as OnChangeFn<ColumnSizingInfoState>,
  })

  useEffect(
    () => setColumnSizing(actualColumnSizing),
    [setColumnSizing, actualColumnSizing],
  )

  return (
    <DashboardCollapsedReferenceKeysContext.Provider value={collapsedKeys}>
      <SetDashboardCollapsedReferenceKeysContext.Provider value={setCollapsedKeys}>
        <Placeholder
          invisible={(isLoading || isReferencesLoading) || isNotEmpty(currentDashboardReferences)}
          area={CONTENT_PLACEHOLDER_AREA}
          message="No included packages or dashboards"
        >
          <TableContainer ref={tableContainerRef} sx={{ height: '100%' }}>
            <Table stickyHeader size="small" sx={{ tableLayout: 'fixed' }}>
              <TableHead>
                {getHeaderGroups().map(headerGroup => (
                  <TableRow
                    key={headerGroup.id}
                  >
                    {headerGroup.headers.map((headerColumn, index) => (
                      <TableCell
                        key={headerColumn.id}
                        align="left"
                        width={actualColumnSizing ? actualColumnSizing[headerColumn.id] : headerColumn.getSize()}
                        sx={{
                          '&:hover': {
                            borderRight: '2px solid rgba(224, 224, 224, 1)',
                          },
                        }}
                      >
                        {flexRender(headerColumn.column.columnDef.header, headerColumn.getContext())}
                        {index !== headerGroup.headers.length - 1 &&
                          <ColumnDelimiter header={headerColumn} resizable={true}/>}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableHead>
              <TableBody>
                {versionReferences.references?.filter(({ parentPackageRef }) => !parentPackageRef).map(ref => {
                  const packageByRef = versionReferences.packages![ref.packageRef!]
                  if (currentDashboardReferences?.some(({
                    packageReference: { key },
                    added,
                  }) => key === packageByRef.key && !added)) {
                    return (
                      <ReferenceRow
                        key={packageByRef.key}
                        reference={ref}
                        pack={packageByRef}
                        versionReferences={versionReferences}
                        level={0}
                        onRemove={onRemove}
                        added={false}
                        readonly={readonly}
                      />
                    )
                  }
                })}
                {addedDashboardReferences?.map(({ packageReference }) => {
                  return (
                    <ReferenceRow
                      key={packageReference.key}
                      reference={{}}
                      pack={packageReference}
                      versionReferences={{}}
                      level={0}
                      onRemove={onRemove}
                      added={true}
                      readonly={readonly}
                    />
                  )
                })
                }
                {(isLoading || isReferencesLoading) && <TableSkeleton/>}
              </TableBody>
            </Table>
          </TableContainer>
        </Placeholder>
      </SetDashboardCollapsedReferenceKeysContext.Provider>
    </DashboardCollapsedReferenceKeysContext.Provider>
  )
})

const PACKAGE_COLUMN_ID = 'packages'
const VERSION_COLUMN_ID = 'version'
const STATUS_COLUMN_ID = 'status'
const REMOVE_COLUMN_ID = 'remove'

const COLUMNS_MODELS: ColumnModel[] = [
  { name: PACKAGE_COLUMN_ID },
  { name: VERSION_COLUMN_ID, width: 115 },
  { name: STATUS_COLUMN_ID, width: 137 },
  { name: REMOVE_COLUMN_ID, fixedWidth: 47 },
]

type TableData = {
  packageReference: PackageReferenceWithStatus
}

const TableSkeleton: FC = memo(() => {
  return createComponents(<RowSkeleton/>, DEFAULT_NUMBER_SKELETON_ROWS)
})

const RowSkeleton: FC = memo(() => {
  return (
    <TableRow>
      <TableCell>
        <Skeleton variant="rectangular" width={'80%'}/>
      </TableCell>
      <TableCell>
        <Skeleton variant="rectangular" width={'80%'}/>
      </TableCell>
      <TableCell>
        <Skeleton variant="rectangular" width={'80%'}/>
      </TableCell>
      <TableCell/>
    </TableRow>
  )
})
