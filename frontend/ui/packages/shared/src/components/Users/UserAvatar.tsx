import type { AvatarProps } from '@mui/material'
import { Avatar, Tooltip, Typography } from '@mui/material'
import type { FC } from 'react'
import { memo } from 'react'
import type { SxProps } from '@mui/system'
import type { Theme } from '@mui/material/styles'
import { stringToColor } from '../../utils/strings'

type Size = 'small' | 'medium' | 'large'

export type CustomAvatarProps = {
  name: string
  size: Size
} & AvatarProps

export const UserAvatar: FC<CustomAvatarProps> = memo<CustomAvatarProps>(({ name, size, ...props }) => {
  const sx = {
    ...props.sx,
    ...SIZE_MAP[size],
    backgroundColor: props.src ? '' : stringToColor(name),
  } as SxProps<Theme>

  return (
    <Tooltip title={name}>
      <Avatar {...props} sx={sx} data-testid="UserIcon">
        <Typography noWrap sx={{ fontSize: 12 }}>
          {`${name[0]}${name[1]}`.toUpperCase()}
        </Typography>
      </Avatar>
    </Tooltip>
  )
})

const SIZE_MAP: Record<Size, SxProps<Theme>> = {
  ['small']: { width: 20, height: 20 },
  ['medium']: { width: 32, height: 32 },
  ['large']: { width: 64, height: 64 },
}
