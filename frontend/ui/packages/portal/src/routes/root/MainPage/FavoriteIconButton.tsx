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
