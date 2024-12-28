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
import * as React from 'react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Button } from '@mui/material'
import { toRolesOrder, useRoles, useUpdateRolesOrder } from '@netcracker/qubership-apihub-ui-shared/hooks/user-roles/useRoles'
import { isEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { RolesList } from '@netcracker/qubership-apihub-ui-shared/components/RolesList'

export const RolesHierarchySettingsTab: FC = memo(() => {
  const { data: roles, isLoading: isRolesLoading } = useRoles()
  const [rolesOrder, setRolesOrder] = useState(roles)
  const [updateRolesOrder] = useUpdateRolesOrder()

  useEffect(() => {
    if (isEmpty(roles)) {
      return
    }
    setRolesOrder(roles)
  }, [setRolesOrder, roles])

  const handleSaveRolesOrder = useCallback(() => {
    updateRolesOrder(toRolesOrder(rolesOrder))
  }, [rolesOrder, updateRolesOrder])

  const handleCansel = useCallback(() => {
    setRolesOrder(roles)
  }, [roles])

  const isChanged = useMemo(() => {
    if (isEmpty(rolesOrder)) {
      return false
    }
    for (let i = 0; i < roles.length; i++) {
      if (roles[i].key !== rolesOrder[i].key) {
        return true
      }
    }
    return false
  }, [roles, rolesOrder])

  return <>
    <BodyCard
      header="Roles Hierarchy"
      action={
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            onClick={handleSaveRolesOrder}
            disabled={!isChanged}
            sx={{ width: '100px' }}
          >
            Save
          </Button>
          <Button
            variant="outlined"
            onClick={handleCansel}
            disabled={!isChanged}
            sx={{ width: '100px' }}
          >
            Cancel
          </Button>
        </Box>
      }
      body={<>
        <Box sx={{ fontSize: '12px' }}>
          The role hierarchy is taken into account when the user generates or assigns a role to another user:
          <Box sx={{ display: 'list-item', listStyle: 'disc', ml: 3 }}>a user cannot generate a token with role(s)
            higher than his own</Box>
          <Box sx={{ display: 'list-item', listStyle: 'disc', ml: 3 }}>a user cannot add a package member with role(s)
            higher than his own</Box>
        </Box>
        {isRolesLoading
          ? (<LoadingIndicator/>)
          : (
            <Box overflow="hidden">
              <Box marginTop="8px" height="100%" overflow="hidden">
                <RolesList roles={rolesOrder} setRoles={setRolesOrder}/>
              </Box>
            </Box>
          )}
      </>}
    />
  </>
})
