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
import React from 'react'
import { CircularProgress } from '@mui/material'
import StarRoundedIcon from '@mui/icons-material/StarRounded'
import StarOutlineRoundedIcon from '@mui/icons-material/StarOutlineRounded'

export type FavoriteIconButtonProps = {
  isFetching?: boolean
  isFavorite?: boolean
}

export const FavoriteIconButton: FC<FavoriteIconButtonProps> = (props) => {
  const { isFetching = false, isFavorite = false } = props
  return (
    <>
      {
        isFetching
          ? <CircularProgress sx={{ ml: '2px', mt: '4px' }} size={16}/>
          : isFavorite
            ? <StarRoundedIcon fontSize="small" color="warning" data-testid="FilledStarIcon"/>
            : <StarOutlineRoundedIcon fontSize="small" color="action" data-testid="EmptyStarIcon"/>
      }
    </>
  )
}
