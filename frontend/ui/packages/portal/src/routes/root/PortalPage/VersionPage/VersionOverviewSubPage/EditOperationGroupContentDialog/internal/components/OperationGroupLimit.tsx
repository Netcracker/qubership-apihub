/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
