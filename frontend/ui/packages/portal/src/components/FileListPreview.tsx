import type { FC } from 'react'
import { memo } from 'react'
import { IconButton, List, ListItem, ListItemIcon, ListItemText } from '@mui/material'
import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined'
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined'

export type FileListPreviewProps = {
  value: ReadonlyArray<FileInfo>
  onDelete?: (file: FileInfo) => void
}

type FileInfo = {
  name: string
  path?: string
}

export const FileListPreview: FC<FileListPreviewProps> = memo<FileListPreviewProps>(({ value, onDelete }) => {
  return (
    <List sx={{ height: 188 }}>
      {
        value.map((file, index) => (
          <ListItem
            key={`${index}-${file.name}`}
            sx={{
              p: file.path !== undefined ? 0 : 1,
              '&:hover': {
                backgroundColor: '#F2F3F5',
                '& button': {
                  opacity: 1,
                },
              },
            }}
            secondaryAction={
              onDelete && <IconButton
                sx={{ p: 0, opacity: 0 }}
                onClick={() => onDelete(file)}
              >
                <ClearOutlinedIcon/>
              </IconButton>
            }
          >
            <ListItemIcon sx={{ minWidth: 2 }}>
              <InsertDriveFileOutlinedIcon
                sx={{ color: '#B4BFCF', mr: 1 }}
                fontSize="small"
              />
            </ListItemIcon>
            <ListItemText
              sx={{ m: 0 }}
              primary={file.name}
              secondary={file.path && `/${file.path}`}
              primaryTypographyProps={{ fontSize: '13px' }}
              secondaryTypographyProps={{ fontSize: '11px' }}
            />
          </ListItem>
        ))
      }
    </List>
  )
})
