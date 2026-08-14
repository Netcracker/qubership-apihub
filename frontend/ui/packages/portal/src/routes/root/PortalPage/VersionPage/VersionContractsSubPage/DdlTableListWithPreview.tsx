import type { ResizeCallback } from 're-resizable'
import { type FC, memo, useCallback, useMemo } from 'react'

import { DdlTableTitleWithMeta } from '@netcracker/qubership-apihub-ui-shared/components/Ddl/DdlTableTitleWithMeta'
import {
  type FetchNextMetaList,
  MetaClickableListWithPreview,
} from '@netcracker/qubership-apihub-ui-shared/components/MetaClickableListWithPreview'
import { NAVIGATION_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import {
  DDL_TABLES_EMPTY_MESSAGE,
  type DdlContractEntity,
  getDdlTableListKey,
} from '@netcracker/qubership-apihub-ui-shared/entities/contracts-ddl'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { DASHBOARD_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'

import { useSelectedPreviewOperation, useSetSelectedPreviewOperation } from '../../SelectedPreviewOperationProvider'
import { usePackageKind } from '../../usePackageKind'
import { usePackageParamsWithRef } from '../../usePackageParamsWithRef'
import { useRefSearchParam } from '../../useRefSearchParam'
import { useDdlTableDetails } from '../api/useDdlTableDetails'
import { useContractBrowseLinkHandlers } from '../useContractBrowseLinkHandlers'
import { getDdlTableLink } from '../useNavigateToOperation'
import { DdlTablePreview } from './DdlTablePreview'

export type DdlTableListWithPreviewProps = {
  tables: ReadonlyArray<DdlContractEntity>
  fetchNextPage?: FetchNextMetaList
  isNextPageFetching?: boolean
  hasNextPage?: boolean
  isListLoading: boolean
  packageKey: Key
  versionKey: Key
  initialSize: number
  handleResize: ResizeCallback
  maxPreviewWidth: number
}

export const DdlTableListWithPreview: FC<DdlTableListWithPreviewProps> = memo<DdlTableListWithPreviewProps>((props) => {
  const {
    tables,
    isListLoading,
    fetchNextPage,
    isNextPageFetching,
    hasNextPage,
    packageKey,
    versionKey,
    initialSize,
    handleResize,
    maxPreviewWidth,
  } = props

  const selectedPreviewOperation = useSelectedPreviewOperation()
  const setSelectedPreviewOperation = useSetSelectedPreviewOperation()
  const [refKey] = useRefSearchParam()
  const [kind] = usePackageKind()
  const isDashboard = kind === DASHBOARD_KIND

  const [detailsPackageKey, detailsVersionKey] = usePackageParamsWithRef(
    isDashboard ? selectedPreviewOperation?.packageRef?.key : '',
  )

  const selectedTable = useMemo(
    () =>
      tables.find(table =>
        table.ddlEntityId === selectedPreviewOperation?.operationKey &&
        table.packageRef?.key === selectedPreviewOperation?.packageRef?.key,
      ),
    [tables, selectedPreviewOperation?.operationKey, selectedPreviewOperation?.packageRef?.key],
  )

  const selectedItemKey = useMemo(() => {
    if (!selectedPreviewOperation?.operationKey) {
      return undefined
    }
    return `${selectedPreviewOperation.packageRef?.key ?? ''}:${selectedPreviewOperation.operationKey}`
  }, [selectedPreviewOperation?.operationKey, selectedPreviewOperation?.packageRef?.key])

  const { data: tableDetails, isInitialLoading } = useDdlTableDetails({
    packageKey: detailsPackageKey,
    versionKey: detailsVersionKey,
    ddlEntityId: selectedTable?.ddlEntityId,
    enabled: !!selectedTable?.ddlEntityId,
  })

  const onRowClick = useCallback((itemKey: Key) => {
    const table = tables.find(candidate => getDdlTableListKey(candidate) === itemKey)
    if (!table) {
      return
    }
    setSelectedPreviewOperation({
      operationKey: table.ddlEntityId,
      packageRef: table.packageRef,
    })
  }, [setSelectedPreviewOperation, tables])

  const prepareLinkFn = useCallback((table: DdlContractEntity) =>
    getDdlTableLink({
      packageKey: packageKey,
      versionKey: versionKey,
      ddlEntityId: table.ddlEntityId,
      ref: isDashboard ? table.packageRef?.key ?? refKey : undefined,
    }), [isDashboard, packageKey, refKey, versionKey])

  const onClickLink = useContractBrowseLinkHandlers()

  const renderTitle = useCallback(
    (table: DdlContractEntity, link?: Parameters<typeof DdlTableTitleWithMeta>[0]['link']) => (
      <DdlTableTitleWithMeta
        table={table}
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
      message={DDL_TABLES_EMPTY_MESSAGE}
      data-testid="NoItemsPlaceholder"
    />
  ), [])

  return (
    <MetaClickableListWithPreview
      items={tables}
      getItemKey={getDdlTableListKey}
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
        <DdlTablePreview
          table={selectedTable}
          tableDetails={tableDetails}
          isLoading={isInitialLoading}
          maxWidthHeaderToolbar={initialSize}
          noHeading={true}
          entityPackageKey={detailsPackageKey}
          entityVersionKey={detailsVersionKey}
        />
      }
    />
  )
})

DdlTableListWithPreview.displayName = 'DdlTableListWithPreview'
