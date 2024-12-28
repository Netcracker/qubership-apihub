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

import {
  Box,
  Link,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import type { FC, RefObject } from 'react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useFavorPackage } from './useFavorPackage'
import { useDisfavorPackage } from './useDisfavorPackage'
import { useTextSearchParam } from '../useTextSearchParam'
import { useIsFavoritesMainPage, useIsSharedMainPage, useIsWorkspacesPage } from './useMainPage'
import { FavoriteIconButton } from './FavoriteIconButton'
import { useUpdatingPackageKeyWritableContext } from './UpdatingPackageKeyProvider'
import type { ColumnDef, ColumnSizingInfoState, ColumnSizingState, OnChangeFn } from '@tanstack/react-table'
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { usePagedPackages } from '../usePagedPackages'
import { MAIN_PAGE_REFERER } from '@netcracker/qubership-apihub-ui-shared/entities/referer-pages-names'
import type { Package, PackageKind } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { GROUP_KIND, WORKSPACE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { useIntersectionObserver } from '@netcracker/qubership-apihub-ui-shared/hooks/common/useIntersectionObserver'
import type { ColumnModel } from '@netcracker/qubership-apihub-ui-shared/hooks/table-resizing/useColumnResizing'
import {
  DEFAULT_CONTAINER_WIDTH,
  useColumnsSizing,
} from '@netcracker/qubership-apihub-ui-shared/hooks/table-resizing/useColumnResizing'
import { CustomTableHeadCell } from '@netcracker/qubership-apihub-ui-shared/components/CustomTableHeadCell'
import { PackageKindLogo } from '@netcracker/qubership-apihub-ui-shared/components/PackageKindLogo'
import { TextWithOverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/TextWithOverflowTooltip'
import { PackageSettingsButton } from '@apihub/components/PackageSettingsButton'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'
import { StatusMarker } from '@netcracker/qubership-apihub-ui-shared/components/StatusMarker'
import {
  CONTENT_PLACEHOLDER_AREA,
  NO_SEARCH_RESULTS,
  Placeholder,
} from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { ColumnDelimiter } from '@netcracker/qubership-apihub-ui-shared/components/ColumnDelimiter'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { format } from '@netcracker/qubership-apihub-ui-shared/utils/strings'
import { createComponents } from '@netcracker/qubership-apihub-ui-shared/utils/components'
import { DEFAULT_NUMBER_SKELETON_ROWS } from '@netcracker/qubership-apihub-ui-shared/utils/constants'
import { useSuperAdminCheck } from '@netcracker/qubership-apihub-ui-shared/hooks/user-roles/useSuperAdminCheck'
import { useResizeObserver } from '@netcracker/qubership-apihub-ui-shared/hooks/common/useResizeObserver'
import { getTooltipMessage } from '@netcracker/qubership-apihub-ui-shared/utils/tooltip-message'
import { getBwcData } from '@netcracker/qubership-apihub-ui-shared/utils/change-severities'

export type PackagesTableProps = {
  rootPackageKey?: Key
  packageKinds: PackageKind[]
  refererPageName?: string
}

export const PackagesTable: FC<PackagesTableProps> = memo(({ rootPackageKey, packageKinds, refererPageName }) => {
  const isSuperAdmin = useSuperAdminCheck()
  const [textFilter] = useTextSearchParam()
  const onlyFavorite = useIsFavoritesMainPage()
  const onlyShared = useIsSharedMainPage()
  const isWorkspacesPage = useIsWorkspacesPage()
  const withIcons = useMemo(() => packageKinds.length > 1, [packageKinds])

  const [updatingPackageKey, setUpdatingPackageKey] = useUpdatingPackageKeyWritableContext()

  const {
    packages,
    isLoading,
    isFetching,
    fetchNextPage,
    fetchingNextPage,
    hasNextPage,
  } = usePagedPackages({
    kind: packageKinds,
    onlyFavorite: onlyFavorite,
    textFilter: textFilter,
    showParents: !isWorkspacesPage,
    parentId: rootPackageKey,
    onlyShared: onlyShared,
    showAllDescendants: !isWorkspacesPage,
    lastReleaseVersionDetails: true,
    refererPageName: refererPageName ?? MAIN_PAGE_REFERER,
  })

  const [favorPackage] = useFavorPackage(rootPackageKey, refererPageName)
  const [disfavorPackage] = useDisfavorPackage(rootPackageKey, refererPageName)

  const calculateGroup = useCallback(
    (parents?: ReadonlyArray<Package>) => parents?.map((parent) => parent?.name)?.join(' / '),
    [],
  )

  const ref = useRef<HTMLTableRowElement>(null)
  useIntersectionObserver(ref, fetchingNextPage, hasNextPage, fetchNextPage)

  const [containerWidth, setContainerWidth] = useState(DEFAULT_CONTAINER_WIDTH)
  const [columnSizingInfo, setColumnSizingInfo] = useState<ColumnSizingInfoState>()
  const [, setHandlingColumnSizing] = useState<ColumnSizingState>()

  const tableContainerRef = useRef<HTMLDivElement>(null)
  useResizeObserver(tableContainerRef, setContainerWidth)

  const actualColumnSizing = useColumnsSizing({
    containerWidth: containerWidth,
    columnModels: isWorkspacesPage ? WORKSPACES_COLUMNS_MODELS : FAVORITE_SHARED_COLUMNS_MODELS,
    columnSizingInfo: columnSizingInfo,
    defaultMinColumnSize: 60,
  })

  const data: TableData[] = useMemo(() => packages.map(pack => ({
    workspace: pack,
  })), [packages])

  const columns: ColumnDef<TableData>[] = useMemo(() => [
      {
        id: FAVORITE_COLUMN_ID,
        header: () => <CustomTableHeadCell title={''}/>,
        cell: ({ row: { original: { workspace } } }) => {
          return (
            <Box
              onClick={() => {
                // TODO 11.08.23 // Has problems when user clicks on several buttons at the moment
                if (!isFetching) {
                  setUpdatingPackageKey(workspace.key)
                  workspace.isFavorite ? disfavorPackage(workspace.key) : favorPackage(workspace.key)
                }
              }}
            >
              <FavoriteIconButton
                isFetching={isFetching && updatingPackageKey === workspace.key}
                isFavorite={workspace.isFavorite}
              />
            </Box>)
        },
      },
      {
        id: NAME_COLUMN_ID,
        header: () => <CustomTableHeadCell title={'Name'}/>,
        cell: ({ row: { original: { workspace } } }) => {
          return (
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
            }}
            >
              {withIcons && <PackageKindLogo kind={workspace.kind}/>}
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                pl: 0.5,
                justifyContent: 'space-between',
              }}>
                <TextWithOverflowTooltip tooltipText={workspace.name} variant="body2">
                  <Link
                    component={NavLink}
                    to={{ pathname: getNavigationLink(workspace.key, workspace.kind, workspace.defaultVersion) }}
                  >
                    {workspace.name}
                  </Link>
                </TextWithOverflowTooltip>
                {(!isWorkspacesPage || isSuperAdmin) &&
                  <PackageSettingsButton packageKey={workspace.key} isIconButton={true}/>}
              </Box>
            </Box>
          )
        },
      },
      {
        id: ID_COLUMN_ID,
        header: () => <CustomTableHeadCell title={'ID'}/>,
        cell: ({ row: { original: { workspace } } }) => {
          return (
            <TextWithOverflowTooltip tooltipText={workspace.key}>
              {workspace.key}
            </TextWithOverflowTooltip>
          )
        },
      },
      {
        id: DESCRIPTION_COLUMN_ID,
        header: () => <CustomTableHeadCell title={'Description'}/>,
        cell: ({ row: { original: { workspace } } }) => {
          return (
            <TextWithOverflowTooltip tooltipText={workspace.description}>
              {workspace.description}
            </TextWithOverflowTooltip>
          )
        },
      },
      {
        id: GROUP_COLUMN_ID,
        header: () => <CustomTableHeadCell title={'Group'}/>,
        cell: ({ row: { original: { workspace } } }) => {
          const groupPath = calculateGroup(workspace.parents)
          return (
            <TextWithOverflowTooltip tooltipText={groupPath}>
              {groupPath}
            </TextWithOverflowTooltip>
          )
        },
      },
      {
        id: SERVICE_NAME_COLUMN_ID,
        header: () => <CustomTableHeadCell title={'Service Name'}/>,
        cell: ({ row: { original: { workspace } } }) => {
          return (
            <TextWithOverflowTooltip tooltipText={workspace.serviceName}>
              {workspace.serviceName}
            </TextWithOverflowTooltip>
          )
        },
      },
      {
        id: LAST_VERSION_COLUMN_ID,
        header: () => <CustomTableHeadCell title={'Latest Release'}/>,
        cell: ({ row: { original: { workspace } } }) => {
          const { versionKey: lastVersion } = getSplittedVersionKey(
            workspace.lastReleaseVersionDetails?.version,
            workspace.lastReleaseVersionDetails?.latestRevision,
          ) || '―'

          return (
            <TextWithOverflowTooltip tooltipText={lastVersion}>
              {lastVersion}
            </TextWithOverflowTooltip>
          )
        },
      },
      {
        id: BWC_ERRORS_COLUMN_ID,
        header: () => <CustomTableHeadCell title={'BWC Status'}/>,
        cell: ({ row: { original: { workspace } } }) => {
          const bwcData = getBwcData(workspace.lastReleaseVersionDetails?.summary)

          return (
            <Tooltip placement={'right'} title={getTooltipMessage(bwcData)}>
              <Box width={'min-content'}>
                {bwcData && (
                  <Box display="flex" gap={1}>
                    <StatusMarker value={bwcData.type}/>
                    <Typography noWrap variant="inherit">
                      {bwcData.count}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Tooltip>
          )
        },
      },
    ], [calculateGroup, disfavorPackage, favorPackage, isFetching, isSuperAdmin, isWorkspacesPage, setUpdatingPackageKey, updatingPackageKey, withIcons],
  )

  const { getHeaderGroups, getRowModel, setColumnSizing } = useReactTable({
    data: data,
    columns: columns,
    getCoreRowModel: getCoreRowModel(),

    columnResizeMode: 'onChange',
    onColumnSizingChange: setHandlingColumnSizing as OnChangeFn<ColumnSizingState>,
    onColumnSizingInfoChange: setColumnSizingInfo as OnChangeFn<ColumnSizingInfoState>,
  })

  useEffect(
    () => setColumnSizing(actualColumnSizing),
    [setColumnSizing, actualColumnSizing],
  )

  return (
    <Placeholder
      invisible={isLoading || isNotEmpty(packages)}
      area={CONTENT_PLACEHOLDER_AREA}
      message={textFilter ? NO_SEARCH_RESULTS : 'No packages'}
    >
      <TableContainer sx={{ overflowX: 'hidden' }} ref={tableContainerRef}>
        <Table>
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
            {getRowModel().rows.map(row => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.column.id}
                    data-testid={`Cell-${cell.column.id}`}
                    sx={{ overflow: 'hidden' }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {hasNextPage && <RowSkeleton refObject={ref}/>}
            {isLoading && <TableSkeleton/>}
          </TableBody>
        </Table>
      </TableContainer>
    </Placeholder>
  )
})

type TableData = {
  workspace: Package
}

const FAVORITE_COLUMN_ID = 'favorite'
const NAME_COLUMN_ID = 'name'
const ID_COLUMN_ID = 'id'
const DESCRIPTION_COLUMN_ID = 'description'
const GROUP_COLUMN_ID = 'group'
const SERVICE_NAME_COLUMN_ID = 'serviceName'
const LAST_VERSION_COLUMN_ID = 'lastVersion'
const BWC_ERRORS_COLUMN_ID = 'bwcErrors'

const WORKSPACES_COLUMNS_MODELS: ColumnModel[] = [
  { name: FAVORITE_COLUMN_ID, fixedWidth: 32 },
  { name: NAME_COLUMN_ID, width: 256 },
  { name: ID_COLUMN_ID, width: 151 },
  { name: DESCRIPTION_COLUMN_ID },
]

const FAVORITE_SHARED_COLUMNS_MODELS: ColumnModel[] = [
  { name: FAVORITE_COLUMN_ID, fixedWidth: 32 },
  { name: NAME_COLUMN_ID, width: 256 },
  { name: ID_COLUMN_ID, width: 151 },
  { name: GROUP_COLUMN_ID },
  { name: SERVICE_NAME_COLUMN_ID },
  { name: LAST_VERSION_COLUMN_ID },
  { name: BWC_ERRORS_COLUMN_ID },
]

function getNavigationLink(packageKey: Key, kind: PackageKind, defaultVersion?: Key): string {
  if (kind === WORKSPACE_KIND) {
    return format(
      '/portal/workspaces/{}',
      encodeURIComponent(packageKey),
    )
  }

  if (kind === GROUP_KIND) {
    return format(
      '/portal/groups/{}',
      encodeURIComponent(packageKey!),
    )
  }

  return format(
    '/portal/packages/{}/{}',
    encodeURIComponent(packageKey),
    defaultVersion ? encodeURIComponent(defaultVersion) : '',
  )
}

export const TableSkeleton: FC = memo(() => {
  return createComponents(<RowSkeleton/>, DEFAULT_NUMBER_SKELETON_ROWS)
})

type RowSkeletonProps = {
  refObject?: RefObject<HTMLDivElement>
}

const RowSkeleton: FC<RowSkeletonProps> = memo<RowSkeletonProps>(({ refObject }) => {
  return (
    <TableRow>
      <TableCell/>
      <TableCell ref={refObject}>
        <Skeleton variant="rectangular" width={'80%'}/>
      </TableCell>
      <TableCell>
        <Skeleton variant="rectangular" width={'80%'}/>
      </TableCell>
      <TableCell/>
      <TableCell/>
      <TableCell/>
      <TableCell/>
      <TableCell/>
    </TableRow>
  )
})
