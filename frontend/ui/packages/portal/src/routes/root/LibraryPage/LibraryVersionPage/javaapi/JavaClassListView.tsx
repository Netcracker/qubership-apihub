import { Box, styled } from '@mui/material'
import type { Path } from '@remix-run/router'
import type { ColumnDef } from '@tanstack/table-core'
import { type FC, memo, useCallback, useMemo } from 'react'

import type { JavaApiClassListItem } from '@netcracker/qubership-apihub-api-doc-viewer'
import { CustomTableHeadCell } from '@netcracker/qubership-apihub-ui-shared/components/CustomTableHeadCell'
import type { FetchNextMetaList } from '@netcracker/qubership-apihub-ui-shared/components/MetaClickableListWithPreview'
import { TextWithOverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/TextWithOverflowTooltip'
import type { ColumnModel } from '@netcracker/qubership-apihub-ui-shared/hooks/table-resizing/useColumnResizing'

import { ContractsEntityListTable } from '@portal/routes/root/PortalPage/VersionPage/VersionContractsSubPage/ContractsEntityListTable'
import { formatMemberCounts, JAVA_CLASSES_EMPTY_MESSAGE } from './javaApi'
import { JavaClassTitleWithMeta } from './JavaClassTitleWithMeta'

const JAVA_TYPES_COLUMN_ID = 'java-types'
const MEMBERS_COLUMN_ID = 'members'
const COLUMN_MODELS: ColumnModel[] = [{ name: JAVA_TYPES_COLUMN_ID }, { name: MEMBERS_COLUMN_ID }]

type JavaClassListViewRow = {
  javaClass: JavaApiClassListItem
}

type JavaClassListViewProps = Readonly<{
  classes: ReadonlyArray<JavaApiClassListItem>
  prepareLinkFn: (javaClass: JavaApiClassListItem) => Partial<Path>
  isLoading?: boolean
  fetchNextPage: FetchNextMetaList
  hasNextPage: boolean | undefined
  isNextPageFetching: boolean
}>

export const JavaClassListView: FC<JavaClassListViewProps> = memo<JavaClassListViewProps>(
  ({ classes, prepareLinkFn, isLoading = false, fetchNextPage, hasNextPage, isNextPageFetching }) => {
    const columns = useMemo((): ColumnDef<JavaClassListViewRow>[] => [
      {
        id: JAVA_TYPES_COLUMN_ID,
        header: () => <CustomTableHeadCell title="Java types" />,
        cell: ({ row: { original: { javaClass } } }) => (
          <RowTitleBox>
            <JavaClassTitleWithMeta
              javaClass={javaClass}
              link={prepareLinkFn(javaClass)}
            />
          </RowTitleBox>
        ),
      },
      {
        id: MEMBERS_COLUMN_ID,
        header: () => <CustomTableHeadCell title="Members" />,
        cell: ({ row: { original: { javaClass } } }) => {
          const members = formatMemberCounts(javaClass.memberKindCounts, ', ')
          return <TextWithOverflowTooltip tooltipText={members}>{members}</TextWithOverflowTooltip>
        },
      },
    ], [prepareLinkFn])

    const data: JavaClassListViewRow[] = useMemo(() => classes.map(javaClass => ({ javaClass })), [classes])
    const resolveRowId = useCallback((row: JavaClassListViewRow) => row.javaClass.className, [])

    return (
      <ContractsEntityListTable
        columns={columns}
        data={data}
        getRowId={resolveRowId}
        columnModels={COLUMN_MODELS}
        emptyMessage={JAVA_CLASSES_EMPTY_MESSAGE}
        isLoading={isLoading}
        fetchNextPage={fetchNextPage}
        hasNextPage={hasNextPage}
        isNextPageFetching={isNextPageFetching}
      />
    )
  },
)

JavaClassListView.displayName = 'JavaClassListView'

// The package rows put py 4px around the title (ExpandableItem); the API Changes table already uses ExpandableItem
const RowTitleBox = styled(Box)({
  padding: '4px 0',
  width: '100%',
  minWidth: 0,
})
