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
import { memo, useCallback, useState } from 'react'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material'
import type { Emails } from '@apihub/entities/settings'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { DeleteIcon } from '@netcracker/qubership-apihub-ui-shared/icons/DeleteIcon'

const boxSX = {
  backgroundColor: '#fff',
  color: '#000',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '2px solid #ccc',
  padding: '6px 12px',
  width: '410px',
  height: '20',
  '&:hover': {
    backgroundColor: '#F5F5FA',
  },
}

const flexBoxSX = {
  display: 'flex',
  justifyContent: 'flex-start',
  alignItems: 'center',
  width: '450px',
}

const itemsBoxSX = {
  width: '420px',
  overflow: 'hidden',
  overflowY: 'scroll',
  height: 'calc(100vh - 655px)',
  paddingBottom: '20px',
}

const buttonSX = {
  marginLeft: '10px',
  padding: '18.3px',
}

export type NotificationListProps = {
  value: Emails
  onChange: (value: Emails) => void
}

// TODO: Refactor this later
export const EmailNotificationList: FC<NotificationListProps> = memo<NotificationListProps>(({ value, onChange }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [newEmail, setNewEmail] = useState('')
  const [deletingIndex, setDeletingIndex] = useState(-1)

  const handleMouseEnter = (index: number): void => {
    setHoveredIndex(index)
  }

  const handleMouseLeave = (): void => {
    setHoveredIndex(null)
  }

  const addMail = useCallback(
    (onChange: (value: Emails) => void, value: Emails): void => {
      const updatedList = newEmail ? new Set([...value, newEmail]) : [...value]
      onChange([...updatedList])
      setNewEmail('')
    },
    [newEmail],
  )
  return (
    <Box>
      <Box sx={flexBoxSX}>
        <TextField
          id="filled-required"
          sx={{ width: '300px', marginTop: '0px', marginBottom: '0px' }}
          placeholder="Email"
          hiddenLabel
          variant="filled"
          type={'email'}
          onChange={(e) => setNewEmail(e.target.value)}
        />
        <Button variant="contained"
                sx={buttonSX}
                onClick={() => addMail(onChange, value)}
        >
          Add Email
        </Button>
      </Box>
      {value && isNotEmpty(value) && (
        <Box width="410px">
          <Typography variant="body2" mt={1} paddingBottom={'4px'} borderBottom={'3px solid #ccc'}>
            Emails
          </Typography>
        </Box>
      )}
      <Box sx={itemsBoxSX}>
        {value && isNotEmpty(value) && value.map((data: string, index: number) => {
          return (
            <Box sx={boxSX} onMouseEnter={() => handleMouseEnter(index)} onMouseLeave={handleMouseLeave} key={index}>
              <Typography variant="body2">{data}</Typography>
              {hoveredIndex === index && (
                <Box
                  style={{ cursor: 'pointer' }}
                  onClick={() => setDeletingIndex(index)}
                >
                  <DeleteIcon color="#626D82"/>
                </Box>
              )}
            </Box>
          )
        })}
        <Dialog open={deletingIndex !== -1} onClose={() => setDeletingIndex(-1)}>
          <DialogTitle>Confirm Deletion</DialogTitle>
          <DialogContent>
            <Typography>Are you sure you want to delete this Email?</Typography>
          </DialogContent>
          <DialogActions style={{ justifyContent: 'flex-end' }}>
            <Button variant="contained"
                    sx={buttonSX}
                    onClick={() => {
                      const updatedList = value?.filter((_email: string, i: number) => i !== deletingIndex) ?? []
                      onChange(updatedList)
                      setDeletingIndex(-1)
                    }}
            >
              Yes
            </Button>
            <Button
              variant="outlined"
              sx={buttonSX}
              onClick={() => setDeletingIndex(-1)}
            >
              No
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  )
})
