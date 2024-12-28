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

import type { FC, PropsWithChildren } from 'react'
import { memo } from 'react'
import { Box, List, ListItemText, Typography } from '@mui/material'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'

export type QuickStartPlaceholderProps = PropsWithChildren<{
  invisible: boolean
}>

export const QuickStartPlaceholder: FC<QuickStartPlaceholderProps> = memo<QuickStartPlaceholderProps>(({
  invisible,
  children,
}) => {
  if (invisible) {
    return (<>{children}</>)
  }

  return (
    <BodyCard
      header="APIHUB Editor"
      subheader="Design and publish API specification"
      body={
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'start',
          gap: 1,
        }}>
          <Typography variant="subtitle1" fontSize={15}>Quick start guide:</Typography>
          <List>
            <ListItemText sx={{['& .MuiListItemText-primary'] : { whiteSpace: 'normal' }}}>
              1. Select the branch in the page subheader. Make sure you have permissions in
              GitLab to commit to the selected branch. Otherwise, you will not be able to continue working with Edtior.</ListItemText>
            <ListItemText>2. Select the file (REST or GraphQl specification, markdown file) to edit in the left sidebar.</ListItemText>
            <ListItemText>3. If the project is empty, add the file using Add button.</ListItemText>
            <ListItemText>4. Design your specification.</ListItemText>
            <ListItemText>5. Publish your specification to APIHUB Portal in Publish tab.</ListItemText>
          </List>
        </Box>
      }
    />
  )
})
