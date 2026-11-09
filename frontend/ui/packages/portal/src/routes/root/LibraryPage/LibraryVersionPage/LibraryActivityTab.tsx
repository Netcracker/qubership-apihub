import { Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material'
import type { FC } from 'react'

import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { FormattedDate } from '@netcracker/qubership-apihub-ui-shared/components/FormattedDate'
import { UserView } from '@netcracker/qubership-apihub-ui-shared/components/Users/UserView'

import type { LibraryVersionDto } from '@portal/entities/libraries'

export const LibraryActivityTab: FC<{ version: LibraryVersionDto }> = ({ version }) => {
  const activities = version.metadata?.activities ?? []
  return (
    <BodyCard
      header="Activity History"
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
                <TableCell colSpan={3}>No activity has been recorded for this version.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      }
    />
  )
}
LibraryActivityTab.displayName = 'LibraryActivityTab'
