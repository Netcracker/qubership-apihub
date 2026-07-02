import { Box, Divider } from '@mui/material'
import type { Path } from '@remix-run/router'
import type { FC } from 'react'
import { memo } from 'react'

import type { DdlContractEntity } from '../../entities/contracts-ddl'
import { DdlTableTitleWithMeta } from './DdlTableTitleWithMeta'

export type DdlTableWithMetaListProps = {
  tables: ReadonlyArray<DdlContractEntity>
  onClick?: () => void
  prepareLinkFn: (table: DdlContractEntity) => Partial<Path>
}

export const DdlTableWithMetaList: FC<DdlTableWithMetaListProps> = memo<DdlTableWithMetaListProps>(({
  tables,
  prepareLinkFn,
  onClick,
}) => (
  <Box>
    {tables.map(table => {
      const link = prepareLinkFn(table)

      return (
        <Box key={table.ddlEntityId} data-testid="DdlTableListItem">
          <DdlTableTitleWithMeta
            table={table}
            link={link}
            onLinkClick={onClick}
          />
          <Divider orientation="horizontal" variant="fullWidth" />
        </Box>
      )
    })}
  </Box>
))

DdlTableWithMetaList.displayName = 'DdlTableWithMetaList'
