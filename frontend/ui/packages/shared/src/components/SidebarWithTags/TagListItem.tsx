import type { FC } from 'react'
import * as React from 'react'
import { memo, useCallback } from 'react'
import { ListItem, ListItemButton, ListItemText } from '@mui/material'

export const TagListItem: FC<{
  tag: string
  selected: boolean
  onClick: (value?: string) => void
}> = memo((props) => {
  const { tag, selected, onClick } = props

  const handleTagClick = useCallback(() => {
    onClick(selected ? '' : tag)
  }, [onClick, selected, tag])

  return (
    <ListItem
      sx={{ p: 0 }}
    >
      <ListItemButton
        sx={{
          height: '36px',
          alignItems: 'center',
        }}
        selected={selected}
        onClick={handleTagClick}
      >
        <ListItemText primary={tag} primaryTypographyProps={{ sx: { mt: 1 } }}/>
      </ListItemButton>
    </ListItem>
  )
})
