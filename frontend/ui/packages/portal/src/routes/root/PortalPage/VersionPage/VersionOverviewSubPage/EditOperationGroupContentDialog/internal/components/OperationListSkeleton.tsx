import type { FC } from 'react'
import { Box, ListItem, ListItemIcon, Skeleton } from '@mui/material'
import { BORDER } from '../consts'

export const OperationSkeleton: FC = () => {
  return (
    <ListItem
      sx={{
        h: '13px',
        px: 0,
        py: 1,
        borderBottom: BORDER,
      }}
    >
      <ListItemIcon
        sx={{minWidth: '16px', marginRight: '16px'}}
      >
        <Skeleton sx={{width: '16px', height: '28px', p: 0}}/>
      </ListItemIcon>
      <Box width="calc(100% - 32px)">
        <Skeleton sx={{width: '40%', height: '16px'}}/>
        <Skeleton sx={{width: '80%', height: '28px'}}/>
      </Box>
    </ListItem>
  )
}

export const OperationListSkeleton: FC = () => {
  return (
    <>
      {Array(7).fill(0).map((_, index) => {
        return <OperationSkeleton key={`operation-skeleton-${index}`}/>
      })}
    </>
  )
}
