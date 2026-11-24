import type { FC } from 'react'
import React, { memo } from 'react'
import type { Path } from '@remix-run/router'
import Box from '@mui/material/Box'
import { Divider } from '@mui/material'
import { OperationTitleWithMeta } from './OperationTitleWithMeta'
import type { OperationData, OperationsData } from '../../entities/operations'

export type OperationWithMetaListProps = {
  operations: OperationsData
  onClick?: () => void
  prepareLinkFn: (operation: OperationData) => Partial<Path>
  nestedList?: boolean
  openLinkInNewTab?: boolean
}

// First Order Component //
export const OperationWithMetaList: FC<OperationWithMetaListProps> = memo<OperationWithMetaListProps>((props) => {
  const { operations, prepareLinkFn, onClick, nestedList = false, openLinkInNewTab } = props

  return (
    <Box>
      {operations?.map(operation => {
        const link = prepareLinkFn(operation)

        return (
          <Box key={operation.operationKey} data-testid="OperationListItem">
            <Box pl={nestedList ? 3 : 0}>
              <OperationTitleWithMeta
                operation={operation}
                link={link}
                onLinkClick={onClick}
                deprecated={operation.deprecated}
                openLinkInNewTab={openLinkInNewTab}
              />
            </Box>
            <Divider orientation="horizontal" variant="fullWidth" sx={{ pt: 1 }}/>
          </Box>
        )
      })}
    </Box>
  )
})
