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

import type { FC } from 'react'
import { memo } from 'react'
import { Box, Link, List, ListItem, ListItemText, Typography } from '@mui/material'
import { NavLink } from 'react-router-dom'
import { RefSpecList } from './RefSpecList'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { isEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import type { Ref } from '@apihub/entities/refs'

export type DocumentListProps = {
  isLoading: boolean
  documents: ReadonlyArray<Ref>
}

export const DocumentList: FC<DocumentListProps> = memo<DocumentListProps>(({ isLoading, documents }) => {
  if (isLoading) {
    return (
      <LoadingIndicator/>
    )
  }

  if (isEmpty(documents)) {
    return (
      <Typography noWrap variant="body2" mt={2}>No documents</Typography>
    )
  }

  return (
    <List>
      {documents.map(({ key, version, kind, name }, index) => (
        <Box key={index}>
          <ListItem
            key={`${key}-${version}`}
            sx={{ px: 0 }}
          >
            <ListItemText
              sx={{ m: 0 }}
              primary={
                <Link
                  component={NavLink}
                  to={{
                    pathname: `/portal/${kind}s/${encodeURIComponent(key!)}`,
                    search: `version=${encodeURIComponent(version!)}`,
                  }}
                >
                  {name}
                </Link>
              }
              secondary={<Typography noWrap variant="subtitle2">{key} • {version}</Typography>}
            />
          </ListItem>
          <Box marginLeft={1} marginTop={-1}>
            <RefSpecList
              kind={kind}
              refKey={key}
              versionKey={version}
            />
          </Box>
        </Box>
      ))}
    </List>
  )
})
