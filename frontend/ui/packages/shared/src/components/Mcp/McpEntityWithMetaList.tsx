import { Box, Divider } from '@mui/material'
import type { Path } from '@remix-run/router'
import type { FC } from 'react'
import { memo } from 'react'

import { getMcpContractEntityListKey, type McpContractEntity } from '../../entities/contracts-mcp'
import { McpEntityTitleWithMeta } from './McpEntityTitleWithMeta'

export type McpEntityWithMetaListProps = {
  entities: ReadonlyArray<McpContractEntity>
  onClick?: () => void
  prepareLinkFn: (entity: McpContractEntity) => Partial<Path>
}

export const McpEntityWithMetaList: FC<McpEntityWithMetaListProps> = memo<McpEntityWithMetaListProps>(({
  entities,
  prepareLinkFn,
  onClick,
}) => (
  <Box>
    {entities.map(entity => {
      const link = prepareLinkFn(entity)

      return (
        <Box key={getMcpContractEntityListKey(entity)} data-testid="McpEntityListItem">
          <McpEntityTitleWithMeta
            entity={entity}
            link={link}
            onLinkClick={onClick}
          />
          <Divider orientation="horizontal" variant="fullWidth" />
        </Box>
      )
    })}
  </Box>
))

McpEntityWithMetaList.displayName = 'McpEntityWithMetaList'
