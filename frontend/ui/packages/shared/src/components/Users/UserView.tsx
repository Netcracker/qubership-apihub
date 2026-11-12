import type { FC } from 'react'
import { memo } from 'react'
import { Box } from '@mui/material'
import { UserAvatar } from './UserAvatar'
import { TextWithOverflowTooltip } from '../TextWithOverflowTooltip'
import { EmptyUserIcon } from '../../icons/EmptyUserIcon'

export type UserViewProps = Partial<{
  name: string
  avatarUrl: string
}>

export const UserView: FC<UserViewProps> = memo<UserViewProps>(({ name = '', avatarUrl }) => {
  return (
    <Box display="flex" alignItems="center" gap="4px" overflow="hidden" data-testid="UserView">
      {avatarUrl
        ? <UserAvatar
          name={name}
          src={avatarUrl}
          size="small"
        />
        : <EmptyUserIcon/>
      }
      <TextWithOverflowTooltip tooltipText={name}>
        {name}
      </TextWithOverflowTooltip>
    </Box>
  )
})
