import { Link, List, ListItem, ListItemIcon, ListItemText, Skeleton } from '@mui/material'
import { SpecLogo } from '@netcracker/qubership-apihub-ui-shared/components/SpecLogo'
import type { FC } from 'react'
import { memo } from 'react'
import type { To } from 'react-router-dom'
import { NavLink } from 'react-router-dom'

export type ApiDocumentListProps = {
  isLoading: boolean
  value: ApiDocument[]
}

export const ApiDocumentList: FC<ApiDocumentListProps> = memo<ApiDocumentListProps>(({ value, isLoading }) => {
  if (isLoading) {
    return (
      <Skeleton variant="rectangular" width={150} />
    )
  }

  return (
    <List>
      {value.map(({ type, title, url, subtitle }) => (
        <ListItem
          key={`api-document-${type}-${title}`}
          sx={{ px: 0, alignItems: 'start' }}
        >
          <ListItemIcon sx={{ minWidth: 2, mt: 0, mr: 1 }}>
            <SpecLogo value={type} />
          </ListItemIcon>
          <ListItemText
            primary={
              <Link
                component={NavLink}
                to={url}
              >
                {title}
              </Link>
            }
            secondary={subtitle}
            primaryTypographyProps={{ color: '#0068FF' }}
            secondaryTypographyProps={{ noWrap: true }}
          />
        </ListItem>
      ))}
    </List>
  )
})

export type ApiDocument = {
  type: string
  title: string
  subtitle: string
  url: To
}
