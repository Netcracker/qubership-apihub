import { Box, styled, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import { type FC, memo, useState } from 'react'

import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { FormattedDate } from '@netcracker/qubership-apihub-ui-shared/components/FormattedDate'
import { SearchBar } from '@netcracker/qubership-apihub-ui-shared/components/SearchBar'
import { UserView } from '@netcracker/qubership-apihub-ui-shared/components/Users/UserView'

import type { LibraryVersion } from '@portal/entities/libraries'
import { filterLibraryActivities } from './libraryActivities'

export const LibraryActivityTab: FC<Readonly<{ version: LibraryVersion }>> = memo(({ version }) => {
  const [textFilter, setTextFilter] = useState('')
  const activities = filterLibraryActivities(version.metadata?.activities ?? [], textFilter)
  return (
    <BodyCard
      header={
        <ActivityHeader>
          <Typography variant="inherit">Activity History</Typography>
          <SearchBar
            placeholder="Search"
            value={textFilter}
            onValueChange={setTextFilter}
            data-testid="SearchInHistory"
          />
        </ActivityHeader>
      }
      body={
        <Table aria-label="Library activity history">
          <TableHead>
            <TableRow>{['Activity', 'Date', 'User'].map(title => <TableCell key={title}>{title}</TableCell>)}</TableRow>
          </TableHead>
          <TableBody>
            {activities.map(activity => (
              <TableRow key={activity.id}>
                <TableCell>{activity.action}</TableCell>
                <TableCell>
                  <FormattedDate value={activity.createdAt} />
                </TableCell>
                <TableCell>
                  <UserView name={activity.createdBy} />
                </TableCell>
              </TableRow>
            ))}
            {!activities.length && (
              <TableRow>
                <TableCell colSpan={3}>
                  {textFilter ? 'No search results' : 'No activity has been recorded for this version.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      }
    />
  )
})
LibraryActivityTab.displayName = 'LibraryActivityTab'

const ActivityHeader = styled(Box)(({ theme }) => ({
  display: 'grid',
  gap: theme.spacing(1),
  gridTemplateColumns: '1fr auto',
  alignItems: 'center',
}))
