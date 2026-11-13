import type { ColumnDef } from '@tanstack/table-core'
import { type FC, memo, useCallback, useMemo } from 'react'

import type { JavaApiClassListItem } from '@netcracker/qubership-apihub-api-doc-viewer'
import { CustomTableHeadCell } from '@netcracker/qubership-apihub-ui-shared/components/CustomTableHeadCell'
import type { ColumnModel } from '@netcracker/qubership-apihub-ui-shared/hooks/table-resizing/useColumnResizing'

import { ContractsEntityListTable } from '@portal/routes/root/PortalPage/VersionPage/VersionContractsSubPage/ContractsEntityListTable'
import { JAVA_CLASSES_EMPTY_MESSAGE } from './java-api'
import { JavaClassTitleWithMeta } from './JavaClassTitleWithMeta'

const JAVA_TYPES_COLUMN_ID = 'java-types'
const COLUMN_MODELS: ColumnModel[] = [{ name: JAVA_TYPES_COLUMN_ID }]

type JavaClassListViewRow = {
  javaClass: JavaApiClassListItem
}

type JavaClassListViewProps = {
  classes: ReadonlyArray<JavaApiClassListItem>
  onOpen: (className: string) => void
  isLoading?: boolean
}

export const JavaClassListView: FC<JavaClassListViewProps> = memo<JavaClassListViewProps>(
  ({ classes, onOpen, isLoading = false }) => {
    const columns: ColumnDef<JavaClassListViewRow>[] = useMemo(() => [
      {
        id: JAVA_TYPES_COLUMN_ID,
        header: () => <CustomTableHeadCell title="Java types" />,
        cell: ({ row: { original: { javaClass } } }) => (
          <JavaClassTitleWithMeta
            javaClass={javaClass}
            onTitleClick={() => onOpen(javaClass.className)}
          />
        ),
      },
    ], [onOpen])

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
      />
    )
  },
)

JavaClassListView.displayName = 'JavaClassListView'
