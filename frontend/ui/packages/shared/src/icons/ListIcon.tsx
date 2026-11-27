import type { FC } from 'react'
import { memo } from 'react'
import type { SvgIconProps } from '@mui/material'
import ListOutlinedIcon from '@mui/icons-material/ListOutlined'

export const ListIcon: FC<SvgIconProps> = memo((props) => {
  return <ListOutlinedIcon viewBox="0 0 24 18" {...props}/>
})
