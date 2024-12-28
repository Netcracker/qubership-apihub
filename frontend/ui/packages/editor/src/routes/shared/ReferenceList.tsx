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
import { Link, List, ListItem, ListItemText, Typography } from '@mui/material'
import { NavLink } from 'react-router-dom'
import type { Ref } from '@apihub/entities/refs'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { isEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'

export type ReferenceListProps = {
  isLoading: boolean
  references: ReadonlyArray<Ref>
}

export const ReferenceList: FC<ReferenceListProps> = memo<ReferenceListProps>(({ isLoading, references }) => {
  if (isLoading) {
    return (
      <LoadingIndicator/>
    )
  }

  if (isEmpty(references)) {
    return (
      <Typography noWrap variant="body2" mt={2}>No references</Typography>
    )
  }

  return (
    <List>
      {references.map(({ key, version, name, kind }, index) => (
        <ListItem
          key={`${key}-${index}`}
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
      ))}
    </List>
  )
})
