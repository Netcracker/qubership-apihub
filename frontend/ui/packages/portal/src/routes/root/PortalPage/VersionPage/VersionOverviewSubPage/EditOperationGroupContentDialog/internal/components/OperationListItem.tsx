import type { CSSProperties, FC } from 'react'
import * as React from 'react'
import { memo, useCallback, useMemo } from 'react'
import type { Path } from '@remix-run/router'
import { Box, Checkbox, ListItem, ListItemIcon } from '@mui/material'
import { BORDER } from '../consts'
import type { Operation, OperationData } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { OperationTitleWithMeta } from '@netcracker/qubership-apihub-ui-shared/components/Operations/OperationTitleWithMeta'
import type { Pixel } from '@netcracker/qubership-apihub-ui-shared/utils/types'

export const OPERATION_LIST_ITEM_HEIGHT: Pixel = 64

export const OperationListItem: FC<{
  style: CSSProperties
  operation: OperationData
  isChecked: boolean
  prepareLinkFn: (operation: OperationData) => Partial<Path>
  onToggleOperationCheckbox: (value: Operation) => void
  onClickLink: () => void
}> = memo((props) => {
  const { style, operation, isChecked, onToggleOperationCheckbox, prepareLinkFn, onClickLink } = props

  const handleOperationCheckboxClick = useCallback(() => {
    onToggleOperationCheckbox(operation)
  }, [onToggleOperationCheckbox, operation])

  const link = useMemo(() => {
    return prepareLinkFn(operation)
  }, [prepareLinkFn, operation])

  return (
    <ListItem
      key={operation.operationKey}
      component="div"
      style={style}
      sx={{
        px: 0,
        py: 1,
        fontSize: '13px',
        lineHeight: 1.43,
        height: OPERATION_LIST_ITEM_HEIGHT,
        borderBottom: BORDER,
      }}
      data-testid="OperationListItem"
    >
      <ListItemIcon
        sx={{ minWidth: 0, marginRight: '16px' }}
      >
        <Checkbox
          sx={{ p: 0 }}
          checked={isChecked}
          onClick={handleOperationCheckboxClick}
          tabIndex={-1}
          disableRipple
        />
      </ListItemIcon>
      <Box width="calc(100% - 32px)">
        <OperationTitleWithMeta
          operation={operation}
          link={link}
          onLinkClick={onClickLink}
          deprecated={operation.deprecated}
        />
      </Box>
    </ListItem>
  )
})
