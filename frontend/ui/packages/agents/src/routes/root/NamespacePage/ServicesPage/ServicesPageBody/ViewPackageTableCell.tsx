import type { Row } from '@tanstack/react-table'
import { type FC, memo } from 'react'

import type { Service } from '@agents/entities/services'
import { HoverLink } from './HoverLink'

type ViewPackageTableCellProps = {
  value: Row<CellData>
}

type CellData = Partial<{
  service: Service
}>

export const ViewPackageTableCell: FC<ViewPackageTableCellProps> = memo<ViewPackageTableCellProps>(({
  value: { original: { service } },
}) => <HoverLink url={service?.baseline?.url} label="View Package" data-testid="ViewPackageButton" />)

ViewPackageTableCell.displayName = 'ViewPackageTableCell'
