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
import { memo, useMemo } from 'react'
import { Box, Link, Typography } from '@mui/material'
import { isUrl } from '@netcracker/qubership-apihub-ui-shared/utils/urls'

export type MetaDataContentProps = {
  metaData: object | undefined
}
export const MetaDataContent: FC<MetaDataContentProps> = memo<MetaDataContentProps>(({ metaData }) => {
  const metaValues = useMemo(() => {
    if (metaData) {
      return Object.entries(metaData).filter(([, value]) => !!value).map(
        ([key, value]) => ({
          key: key,
          value: value,
        }),
      )
    }
  }, [metaData])

  return (
    <Box>
      {metaValues?.map(({ key, value }) => {
        return (
          <Box key={key} display="flex" gap={1}>
            <Typography variant="subtitle1">{key}:</Typography>
            <Box sx={{ wordBreak: 'break-word' }}>
              {isUrl(value)
                ? <Link href={value} target="_blank">
                  {value}
                </Link>
                : <Typography variant="body2">{value}</Typography>
              }
            </Box>
          </Box>
        )
      })}
    </Box>
  )
})
