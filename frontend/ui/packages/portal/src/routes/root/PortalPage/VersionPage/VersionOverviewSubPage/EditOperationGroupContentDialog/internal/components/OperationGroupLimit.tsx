import type { FC } from 'react'
import { Box, Typography } from '@mui/material'
import { OPERATION_GROUP_LIMIT } from '../consts'

export type OperationGroupLimitProps = {
  count: number
}

export const OperationGroupLimit: FC<OperationGroupLimitProps> = ({ count }) => {
  return (
    <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1, gap: 0.5 }}>
      <Box>
        Number of operations in the group:
      </Box>
      <Box color={count < OPERATION_GROUP_LIMIT ? 'black' : 'red'} data-testid="OperationGroupLimit">
        {count} out of {OPERATION_GROUP_LIMIT}
      </Box>
    </Typography>
  )
}
