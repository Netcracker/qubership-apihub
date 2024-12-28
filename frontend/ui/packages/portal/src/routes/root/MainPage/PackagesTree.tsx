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
  IconButton,
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
import type { FC } from 'react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePackages } from '../usePackages'
import { useMainPageCollapsedGroupKeys, useSetMainPageCollapsedGroupKeys } from './MainPageProvider'
import { useDisfavorPackage } from './useDisfavorPackage'
import { useFavorPackage } from './useFavorPackage'
import { useIsFavoritesMainPage, useIsSharedMainPage } from './useMainPage'
import { FavoriteIconButton } from './FavoriteIconButton'
import { useUpdatingPackageKeyWritableContext } from './UpdatingPackageKeyProvider'
import type { ColumnDef, ColumnSizingInfoState, ColumnSizingState, OnChangeFn } from '@tanstack/react-table'
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined'
import KeyboardArrowRightOutlinedIcon from '@mui/icons-material/KeyboardArrowRightOutlined'
import { NavLink } from 'react-router-dom'
import { getGroupPath } from '../../NavigationProvider'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { Package } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { DASHBOARD_KIND, GROUP_KIND, PACKAGE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { MAIN_PAGE_REFERER } from '@netcracker/qubership-apihub-ui-shared/entities/referer-pages-names'
import type { ColumnModel } from '@netcracker/qubership-apihub-ui-shared/hooks/table-resizing/useColumnResizing'
import {
  DEFAULT_CONTAINER_WIDTH,
  useColumnsSizing,
} from '@netcracker/qubership-apihub-ui-shared/hooks/table-resizing/useColumnResizing'
import { CustomTableHeadCell } from '@netcracker/qubership-apihub-ui-shared/components/CustomTableHeadCell'
import { CONTENT_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { ColumnDelimiter } from '@netcracker/qubership-apihub-ui-shared/components/ColumnDelimiter'
import { PackageKindLogo } from '@netcracker/qubership-apihub-ui-shared/components/PackageKindLogo'
import { TextWithOverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/TextWithOverflowTooltip'
import { format } from '@netcracker/qubership-apihub-ui-shared/utils/strings'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'
import { StatusMarker } from '@netcracker/qubership-apihub-ui-shared/components/StatusMarker'
import { createComponents } from '@netcracker/qubership-apihub-ui-shared/utils/components'
import { DEFAULT_NUMBER_SKELETON_ROWS } from '@netcracker/qubership-apihub-ui-shared/utils/constants'
import { PackageSettingsButton } from '@apihub/components/PackageSettingsButton'
import { useResizeObserver } from '@netcracker/qubership-apihub-ui-shared/hooks/common/useResizeObserver'
import { getTooltipMessage } from '@netcracker/qubership-apihub-ui-shared/utils/tooltip-message'
import { getBwcData } from '@netcracker/qubership-apihub-ui-shared/utils/change-severities'

export type PackagesTreeProps = Readonly<{
  rootPackageKey?: Key
  refererPageName?: string
}>

export const PackagesTree: FC<PackagesTreeProps> = memo<PackagesTreeProps>(({ rootPackageKey, refererPageName }) => {
  //TODO: need to rewrite to lazy loading
  const onlyFavorite = useIsFavoritesMainPage()
  const onlyShared = useIsSharedMainPage()

  const [updatingPackageKey] = useUpdatingPackageKeyWritableContext()

  const [groups, isGroupsLoading] = usePackages({
    kind: GROUP_KIND,
    onlyFavorite: onlyFavorite,
    showParents: false,
    parentId: rootPackageKey,
    onlyShared: onlyShared,
    refererPageKey: refererPageName ?? MAIN_PAGE_REFERER,
  })
  const [packages, isPackagesLoading, isFetching] = usePackages({
    kind: [PACKAGE_KIND, DASHBOARD_KIND],
    parentId: rootPackageKey,
    enabled: true,
    onlyFavorite: onlyFavorite,
    onlyShared: onlyShared,
    lastReleaseVersionDetails: true,
    refererPageKey: refererPageName ?? MAIN_PAGE_REFERER,
  })

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

  const columns: ColumnDef<TableData>[] = useMemo(() => [
    {
      id: FAVORITE_COLUMN_ID,
      header: () => <CustomTableHeadCell title={''} />,
    },
    {
      id: NAME_COLUMN_ID,
      header: () => <CustomTableHeadCell title={'Name'} />,
    },
    {
      id: ID_COLUMN_ID,
      header: () => <CustomTableHeadCell title={'ID'} />,
    },
    {
      id: SERVICE_NAME_COLUMN_ID,
      header: () => <CustomTableHeadCell title={'Service Name'} />,
    },
    {
      id: LAST_VERSION_COLUMN_ID,
      header: () => <CustomTableHeadCell title={'Latest Release'} />,
    },
    {
      id: BWC_ERRORS_COLUMN_ID,
      header: () => <CustomTableHeadCell title={'BWC Status'} />,
    },
  ], [],
  )

  const { getHeaderGroups, setColumnSizing } = useReactTable({
    data: [],
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

  const isLoading = useMemo(() => (isGroupsLoading || isPackagesLoading), [isGroupsLoading, isPackagesLoading])

  return (
    <Placeholder
      invisible={isNotEmpty(packages) || isNotEmpty(groups) || isLoading}
      area={CONTENT_PLACEHOLDER_AREA}
      message="No packages"
    >
      <TableContainer ref={tableContainerRef} sx={{ overflowX: 'hidden' }}>
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
                      <ColumnDelimiter header={headerColumn} resizable={true} />}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>
            {!isLoading && groups && groups?.map(group => (
              <GroupRow
                key={group.key}
                group={group}
                level={0}
                onlyFavorite={onlyFavorite}
                onlyShared={onlyShared}
                refererPageName={refererPageName}
                isFetching={isFetching && updatingPackageKey === group.key}
              />
            ))}
            {!isLoading && packages?.map(packageItem => (
              <PackageRow
                key={packageItem.key}
                package={packageItem}
                level={0}
                refererPageName={refererPageName}
                isFetching={isFetching && updatingPackageKey === packageItem.key}
              />
            ))}
          </TableBody>
          {isLoading && <TableSkeleton />}
        </Table>
      </TableContainer>
    </Placeholder>
  )
})

type GroupRowProps = {
  group: Package
  level: number
  onlyFavorite?: boolean
  onlyShared?: boolean
  isFetching?: boolean
  refererPageName?: string
}

const GroupRow: FC<GroupRowProps> = memo<GroupRowProps>(props => {
  const {
    group: {
      key,
      name,
      serviceName,
      isFavorite,
      kind,
    },
    level,
    onlyFavorite,
    onlyShared,
    refererPageName,
    isFetching,
  } = props
  const [favorPackage] = useFavorPackage(key, refererPageName)
  const [disfavorPackage] = useDisfavorPackage(key, refererPageName)

  const collapsedKeys = useMainPageCollapsedGroupKeys()
  const setCollapsedKeys = useSetMainPageCollapsedGroupKeys()

  const [updatingPackageKey, setUpdatingPackageKey] = useUpdatingPackageKeyWritableContext()

  const [open, setOpen] = useState(collapsedKeys?.includes(key))
  const [groups, , isFetchingGroup] = usePackages({
    kind: GROUP_KIND,
    parentId: key,
    enabled: open,
    onlyFavorite: onlyFavorite,
    onlyShared: onlyShared,
    refererPageKey: refererPageName ?? MAIN_PAGE_REFERER,
    showParents: false,
  })
  const [packages, , isFetchingPackage] = usePackages({
    kind: [PACKAGE_KIND, DASHBOARD_KIND],
    parentId: key,
    enabled: open,
    onlyFavorite: onlyFavorite,
    onlyShared: onlyShared,
    lastReleaseVersionDetails: true,
    refererPageKey: refererPageName ?? MAIN_PAGE_REFERER,
  })

  const isLoading = useMemo(() => (isFetchingPackage || isFetchingGroup), [isFetchingPackage, isFetchingGroup])

  const nextLevel = level + 1

  const updateCollapseKeys = useCallback((key: Key) => {
    setOpen(!open)
    setCollapsedKeys(previousKey => (
      !previousKey.includes(key)
        ? [...previousKey, key]
        : previousKey.filter(id => id !== key)
    ))
  }, [open, setCollapsedKeys])

  return (
    <>
      <TableRow hover tabIndex={-1} key={key}>
        {
          columns.map(column => {
            switch (column.key) {
              case FAVORITE_COLUMN_ID: {
                return (
                  <TableCell
                    sx={{ width: 32 }}
                    key={column.key}
                    data-testid={`Cell-${FAVORITE_COLUMN_ID}`}
                    onClick={() => {
                      // TODO 11.08.23 // Has problems when user clicks on several buttons at the moment
                      if (!isFetching) {
                        setUpdatingPackageKey(key)
                        isFavorite ? disfavorPackage(key) : favorPackage(key)
                      }
                    }}
                  >
                    <FavoriteIconButton
                      isFetching={isFetching && updatingPackageKey === key}
                      isFavorite={isFavorite}
                    />
                  </TableCell>
                )
              }
              case NAME_COLUMN_ID: {
                const expandButtonSize = 16
                const paddingLeft = (level * 3.5)
                const entityIconSize = 10
                const paddingSettingsButtonSize = 20
                const totalIndent = `${expandButtonSize + paddingLeft + entityIconSize + paddingSettingsButtonSize}px`
                return (
                  <TableCell key={column.key} data-testid={`Cell-${NAME_COLUMN_ID}`}>
                    <Box sx={{
                      display: 'flex',
                      alignItems: 'center',
                      pl: paddingLeft,
                      width: '100%',
                    }}>
                      {(!open || isNotEmpty(groups) || isNotEmpty(packages))
                        ? (
                          <IconButton
                            sx={{ p: 0, mr: 1 }}
                            onClick={() => updateCollapseKeys(key)}
                          >
                            {
                              open
                                ? <KeyboardArrowDownOutlinedIcon sx={{ fontSize: expandButtonSize }} />
                                : <KeyboardArrowRightOutlinedIcon sx={{ fontSize: expandButtonSize }} />
                            }
                          </IconButton>
                        )
                        : <Box sx={{ width: '24px' }} />
                      }
                      <PackageKindLogo kind={kind} />
                      <Box sx={{
                        pl: 0.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: `calc(100% - ${totalIndent})`,
                      }}>
                        <TextWithOverflowTooltip tooltipText={name} variant="body2">
                          <Link
                            component={NavLink}
                            to={getGroupPath({ groupKey: key })}
                          >
                            {name}
                          </Link>
                        </TextWithOverflowTooltip>
                        <PackageSettingsButton packageKey={key} isIconButton={true} />
                      </Box>
                    </Box>
                  </TableCell>
                )
              }
              case ID_COLUMN_ID: {
                return (
                  <TableCell key={column.key} data-testid={`Cell-${ID_COLUMN_ID}`}>
                    <TextWithOverflowTooltip tooltipText={key}>
                      {key}
                    </TextWithOverflowTooltip>
                  </TableCell>
                )
              }
              case SERVICE_NAME_COLUMN_ID: {
                return (
                  <TableCell key={column.key} data-testid={`Cell-${SERVICE_NAME_COLUMN_ID}`}>
                    <TextWithOverflowTooltip tooltipText={serviceName}>
                      {serviceName}
                    </TextWithOverflowTooltip>
                  </TableCell>
                )
              }
              case LAST_VERSION_COLUMN_ID: {
                return (
                  //Group doesn't have version, leave empty column
                  <TableCell key={column.key} data-testid={`Cell-${LAST_VERSION_COLUMN_ID}`}>
                  </TableCell>
                )
              }
              case BWC_ERRORS_COLUMN_ID: {
                return (
                  //Group doesn't have bwc errors, leave empty column
                  <TableCell key={column.key} data-testid={`Cell-${BWC_ERRORS_COLUMN_ID}`}>
                  </TableCell>
                )
              }
            }
          })
        }
      </TableRow>
      {open && !isLoading && groups.map(group => (
        <GroupRow
          key={group.key}
          group={group}
          onlyFavorite={onlyFavorite}
          level={nextLevel}
          refererPageName={refererPageName}
          isFetching={isFetching && updatingPackageKey === group.key}
        />
      ))}
      {open && !isLoading && packages.map(packageItem => (
        <PackageRow
          key={packageItem.key}
          package={packageItem}
          level={nextLevel}
          refererPageName={refererPageName}
          isFetching={isFetching && updatingPackageKey === packageItem.key}
        />
      ))}
      {isLoading && <RowSkeleton />}
    </>
  )
})

type PackageRowProps = {
  package: Package
  level: number
  isFetching?: boolean
  refererPageName?: string
}

const PackageRow: FC<PackageRowProps> = memo<PackageRowProps>(props => {
  const {
    package: {
      key,
      name,
      kind,
      isFavorite,
      lastReleaseVersionDetails,
      defaultVersion,
      serviceName,
    },
    level,
    refererPageName,
    isFetching,
  } = props
  const [favorPackage] = useFavorPackage(key, refererPageName)
  const [disfavorPackage] = useDisfavorPackage(key, refererPageName)

  const [updatingPackageKey, setUpdatingPackageKey] = useUpdatingPackageKeyWritableContext()

  return (
    <>
      <TableRow hover tabIndex={-1} key={key}>
        {
          columns.map(column => {
            switch (column.key) {
              case FAVORITE_COLUMN_ID: {
                return (
                  <TableCell
                    sx={{ width: 32 }}
                    key={column.key}
                    onClick={() => {
                      // TODO 11.08.23 // Has problems when user clicks on several buttons at the moment
                      if (!isFetching) {
                        setUpdatingPackageKey(key)
                        isFavorite ? disfavorPackage(key) : favorPackage(key)
                      }
                    }}
                    data-testid={`Cell-${FAVORITE_COLUMN_ID}`}
                  >
                    <FavoriteIconButton
                      isFetching={isFetching && updatingPackageKey === key}
                      isFavorite={isFavorite}
                    />
                  </TableCell>
                )
              }
              case NAME_COLUMN_ID: {
                return (
                  <TableCell key={column.key} data-testid={`Cell-${NAME_COLUMN_ID}`}>
                    <Box sx={{
                      alignItems: 'center',
                      display: 'flex',
                      gap: '5px',
                      pl: (level * 3.5),
                    }}>
                      <Box ml="24px">
                        <PackageKindLogo kind={kind} />
                      </Box>
                      <TextWithOverflowTooltip tooltipText={name}>
                        <Link
                          component={NavLink}
                          to={{
                            pathname: format(
                              '/portal/packages/{}/{}',
                              encodeURIComponent(key),
                              defaultVersion ? encodeURIComponent(defaultVersion) : '',
                            ),
                          }}
                        >
                          {name}
                        </Link>
                      </TextWithOverflowTooltip>
                      <Box ml="auto">
                        <PackageSettingsButton packageKey={key} isIconButton={true} />
                      </Box>
                    </Box>
                  </TableCell>
                )
              }
              case ID_COLUMN_ID: {
                return (
                  <TableCell key={column.key} data-testid={`Cell-${ID_COLUMN_ID}`}>
                    <TextWithOverflowTooltip tooltipText={key}>
                      {key}
                    </TextWithOverflowTooltip>
                  </TableCell>
                )
              }
              case SERVICE_NAME_COLUMN_ID: {
                return (
                  <TableCell key={column.key} data-testid={`Cell-${SERVICE_NAME_COLUMN_ID}`}>
                    <TextWithOverflowTooltip tooltipText={serviceName}>
                      {serviceName}
                    </TextWithOverflowTooltip>
                  </TableCell>
                )
              }
              case LAST_VERSION_COLUMN_ID: {
                const { versionKey: lastVersion } = getSplittedVersionKey(
                  lastReleaseVersionDetails?.version,
                  lastReleaseVersionDetails?.latestRevision,
                ) || '―'

                return (
                  <TableCell key={column.key} data-testid={`Cell-${LAST_VERSION_COLUMN_ID}`}>
                    <TextWithOverflowTooltip tooltipText={lastVersion}>
                      {lastVersion}
                    </TextWithOverflowTooltip>
                  </TableCell>
                )
              }
              case BWC_ERRORS_COLUMN_ID: {
                const bwcData = getBwcData(lastReleaseVersionDetails?.summary)

                return (
                  <TableCell key={column.key} data-testid={`Cell-${BWC_ERRORS_COLUMN_ID}`}>
                    <Tooltip placement="right" title={getTooltipMessage(bwcData)}>
                      <Box width={'min-content'}>
                        {bwcData && (
                          <Box display="flex" gap={1}>
                            <StatusMarker value={bwcData.type} />
                            <Typography noWrap variant="inherit">
                              {bwcData.count}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Tooltip>
                  </TableCell>
                )
              }
            }
          })
        }
      </TableRow>
    </>
  )
})

const FAVORITE_COLUMN_ID = 'favorite'
const NAME_COLUMN_ID = 'name'
const ID_COLUMN_ID = 'id'
const SERVICE_NAME_COLUMN_ID = 'serviceName'
const LAST_VERSION_COLUMN_ID = 'lastVersion'
const BWC_ERRORS_COLUMN_ID = 'bwcErrors'

const columns: ReadonlyArray<Column> = [
  { key: FAVORITE_COLUMN_ID, label: '' },
  { key: NAME_COLUMN_ID, label: 'Name' },
  { key: ID_COLUMN_ID, label: 'ID' },
  { key: SERVICE_NAME_COLUMN_ID, label: 'Service Name' },
  { key: LAST_VERSION_COLUMN_ID, label: 'Latest Release' },
  { key: BWC_ERRORS_COLUMN_ID, label: 'BWC Status' },
]

interface Column {
  key: ColumnKey
  label: string
}

type ColumnKey =
  | typeof FAVORITE_COLUMN_ID
  | typeof NAME_COLUMN_ID
  | typeof ID_COLUMN_ID
  | typeof SERVICE_NAME_COLUMN_ID
  | typeof LAST_VERSION_COLUMN_ID
  | typeof BWC_ERRORS_COLUMN_ID

const COLUMNS_MODELS: ColumnModel[] = [
  { name: FAVORITE_COLUMN_ID, fixedWidth: 32 },
  { name: NAME_COLUMN_ID, width: 312 },
  { name: ID_COLUMN_ID },
  { name: SERVICE_NAME_COLUMN_ID },
  { name: LAST_VERSION_COLUMN_ID },
  { name: BWC_ERRORS_COLUMN_ID },
]

type TableData = {
  pack: Package
}

const TableSkeleton: FC = memo(() => {
  return createComponents(<RowSkeleton />, DEFAULT_NUMBER_SKELETON_ROWS)
})

const RowSkeleton: FC = memo(() => {
  return (
    <TableRow>
      <TableCell />
      <TableCell>
        <Skeleton variant="rectangular" width={'80%'} />
      </TableCell>
      <TableCell>
        <Skeleton variant="rectangular" width={'80%'} />
      </TableCell>
      <TableCell />
      <TableCell />
      <TableCell />
    </TableRow>
  )
})
