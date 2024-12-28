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
import React, { useCallback, useMemo, useState } from 'react'
import type { Role, Roles } from '@netcracker/qubership-apihub-ui-shared/types/roles'
import type { PackageMember, PackageMembers } from '@apihub/routes/root/PortalPage/PackageSettingsPage/package-settings'
import {
  ADD_CHANGE_ROLE_ACTION,
  REMOVE_CHANGE_ROLE_ACTION,
} from '@apihub/routes/root/PortalPage/PackageSettingsPage/package-settings'
import { InfinityScrollableMatrix } from '@netcracker/qubership-apihub-ui-shared/components/InfinityScrollableMatrix'
import { Box, Checkbox, TableCell, Tooltip, Typography } from '@mui/material'
import { CheckboxDisabledCheckedIcon } from '@netcracker/qubership-apihub-ui-shared/icons/CheckboxDisabledCheckedIcon'
import { CheckboxCheckedIcon } from '@netcracker/qubership-apihub-ui-shared/icons/CheckboxCheckedIcon'
import { CheckboxDisabledIcon } from '@netcracker/qubership-apihub-ui-shared/icons/CheckboxDisabledIcon'
import { CheckboxIcon } from '@netcracker/qubership-apihub-ui-shared/icons/CheckboxIcon'
import {
  useChangePackageMemberRole,
  useDeletePackageMember,
} from '@apihub/routes/root/PortalPage/PackageSettingsPage/UserPackageAccessControlSettingsTab/useUserPackageAccess'
import type { Key } from '@apihub/entities/keys'
import { ButtonWithHint } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/ButtonWithHint'
import { DeleteIcon } from '@netcracker/qubership-apihub-ui-shared/icons/DeleteIcon'
import { ConfirmationDialog } from '@netcracker/qubership-apihub-ui-shared/components/ConfirmationDialog'
import { UserView } from '@netcracker/qubership-apihub-ui-shared/components/Users/UserView'

export type UserAccessControlTableProps = {
  packageKey: Key
  hasUserAccessManagementPermission: boolean
  roles: Roles
  availablePackageRoles: Roles
  packageMembers: PackageMembers
  isLoading: boolean
  searchValue: string
}

const MANAGEMENT_PERMISSION_TOOLTIP = 'You do not have permission to manage user roles in current package'
const CHANGE_ROLE_PERMISSION_TOOLTIP = 'You cannot change the role that is higher than your role'
const DELETE_USER_PERMISSION_TOOLTIP = 'You cannot remove the user with role higher than your role'
const DELETE_INHERITED_USER_PERMISSION_TOOLTIP = 'You cannot remove the user with inherited role'

export const UserAccessControlTable: FC<UserAccessControlTableProps> = (props) => {

  const {
    packageKey,
    roles,
    availablePackageRoles,
    packageMembers,
    hasUserAccessManagementPermission,
    searchValue,
  } = props

  const members = useMemo(() => {
    return packageMembers.filter(packageMember => packageMember.user.name.toLowerCase().includes(searchValue.toLowerCase()))
  }, [packageMembers, searchValue])

  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false)
  const [deleteConfirmationData, setDeleteConfirmationData] = useState<PackageMember | undefined>(undefined)
  const [deletePackageMember, isDeletingPackageMember] = useDeletePackageMember()
  const onDeletePackageMember = useCallback((packageKey: string, userId: string, userName: string) => {
    deletePackageMember({ packageKey: packageKey, userId: userId, userName: userName })
  }, [deletePackageMember])

  const [changePackageMemberRole] = useChangePackageMemberRole()
  const onChangePackageMemberRole = useCallback((userId: Key, roleId: Key, checked: boolean) => {
    changePackageMemberRole({
      packageKey: packageKey,
      userId: userId,
      roleId: roleId,
      action: checked ? REMOVE_CHANGE_ROLE_ACTION : ADD_CHANGE_ROLE_ACTION,
    })
  }, [changePackageMemberRole, packageKey])

  const roleRankMap: Map<string, number> = useMemo(() => {
    return new Map<string, number>(roles.map((role, index) => {
      return [role.key, index]
    }))
  }, [roles])

  const maxCurrentUserRoleKey = useMemo(() => {
    return availablePackageRoles[0]?.key
  }, [availablePackageRoles])

  const matrix: MatrixItem[][] = useMemo(() => {
    return [...members.map(member => {
      const userId = member.user.id
      return [...roles.map(role => {
        const memberRole = member.roles.find(memberRole => memberRole.roleId === role.key)
        const checked = !!memberRole
        const matrixValue = {
          userId: userId,
          roleId: role.key,
          checked: checked,
        }
        if (!hasUserAccessManagementPermission) {
          return {
            ...matrixValue,
            disabled: true,
            checkboxTooltip: MANAGEMENT_PERMISSION_TOOLTIP,
            deleteTooltip: MANAGEMENT_PERMISSION_TOOLTIP,
          }
        }
        if (!maxCurrentUserRoleKey || !roleRankMap) {
          return {
            ...matrixValue,
            disabled: true,
            checkboxTooltip: CHANGE_ROLE_PERMISSION_TOOLTIP,
            deleteTooltip: DELETE_USER_PERMISSION_TOOLTIP,
          }
        }
        const currentUserRoleRank = roleRankMap.get(maxCurrentUserRoleKey)
        const roleRank = roleRankMap.get(role.key)
        if (currentUserRoleRank! > roleRank!) {
          return {
            ...matrixValue,
            disabled: true,
            checkboxTooltip: CHANGE_ROLE_PERMISSION_TOOLTIP,
            deleteTooltip: DELETE_USER_PERMISSION_TOOLTIP,
          }
        }
        if (checked && memberRole.inheritance) {
          return {
            ...matrixValue,
            disabled: true,
            checkboxTooltip: `The role is inherited from ${memberRole.inheritance.name}`,
            deleteTooltip: DELETE_INHERITED_USER_PERMISSION_TOOLTIP,
          }
        }
        return {
          ...matrixValue,
          disabled: false,
          checkboxTooltip: '',
          deleteTooltip: '',
        }
      })]
    })]
  }, [roles, hasUserAccessManagementPermission, maxCurrentUserRoleKey, members, roleRankMap])

  const firstColumnHeaderRender = useCallback(() => {
    return (
      <TableCell sx={{ width: '200px' }} className="leftHeaderSticky">
        <Typography noWrap variant="subtitle2" sx={{ pl: 0 }}>
          User
        </Typography>
      </TableCell>
    )
  }, [])

  const horizontalItemRender = useCallback((role: Role) => {
    return (
      <TableCell
        key={role.key}
        sx={{ textAlign: 'center', width: '121px' }}
      >
        <Typography noWrap variant="subtitle2">
          {role.role}
        </Typography>
      </TableCell>
    )
  }, [])

  const verticalItemRender = useCallback((packageMember: PackageMember) => {
    return (
      <TableCell
        key={packageMember.user.id}
        className="leftSticky"
        data-testid="Cell-user"
      >
        <UserView
          name={packageMember.user.name}
          avatarUrl={packageMember.user.avatarUrl}
        />
      </TableCell>
    )
  }, [])

  const matrixItemRender = useCallback((key: string, item: MatrixItem) => {
    return (
      <TableCell key={key} data-testid={`Cell-${item.roleId}`}>
        <Tooltip title={item.checkboxTooltip} placement="right">
          <Box sx={{ width: '36px', ml: 'auto', mr: 'auto' }}>
            <Checkbox
              checked={item.checked}
              disabled={item.disabled}
              icon={item.disabled ? <CheckboxDisabledIcon/> : <CheckboxIcon/>}
              checkedIcon={item.disabled ? <CheckboxDisabledCheckedIcon/> : <CheckboxCheckedIcon/>}
              onChange={() => onChangePackageMemberRole(item.userId, item.roleId, item.checked)}
            />
          </Box>
        </Tooltip>
      </TableCell>
    )
  }, [onChangePackageMemberRole])

  const deleteColumnHeaderRender = useCallback(() => {
    return (
      <TableCell sx={{ width: '42px' }} className="rightHeaderSticky"/>
    )
  }, [])

  const deleteCellRender = useCallback((key: string, item: PackageMember, rowItems: MatrixItem[]) => {
    const disabledItem = rowItems.find(item => item.disabled && item.checked)
    return (
      <TableCell key={key} className="rightSticky">
        <ButtonWithHint
          size="small"
          area-label="delete-icon"
          className="hoverable"
          disabled={!!disabledItem}
          disableHint={false}
          hint={!disabledItem ? 'Delete' : disabledItem.deleteTooltip}
          tooltipPlacement="left"
          startIcon={<DeleteIcon color="#626D82"/>}
          sx={{ visibility: 'hidden' }}
          onClick={() => {
            setDeleteConfirmationData(item)
            setDeleteConfirmationOpen(true)
          }}
          testId="DeleteButton"
        />
      </TableCell>
    )
  }, [])

  return (
    <>
      <InfinityScrollableMatrix<Role, PackageMember, MatrixItem>
        horizontalItems={roles}
        verticalItems={members}
        matrix={matrix}
        firstColumnHeaderRender={firstColumnHeaderRender}
        horizontalItemRender={horizontalItemRender}
        verticalItemRender={verticalItemRender}
        matrixCellRender={matrixItemRender}
        deleteColumnHeaderRender={deleteColumnHeaderRender}
        deleteCellRender={deleteCellRender}
      />
      <ConfirmationDialog
        open={deleteConfirmationOpen}
        title={`Remove ${deleteConfirmationData?.user.name} from the package?`}
        loading={isDeletingPackageMember}
        confirmButtonName="Remove"
        onConfirm={() => onDeletePackageMember(packageKey, deleteConfirmationData!.user.id, deleteConfirmationData?.user.name ?? '')}
        onCancel={() => setDeleteConfirmationOpen(false)}
      />
    </>
  )
}

type MatrixItem = {
  userId: Key
  roleId: Key
  checked: boolean
  disabled: boolean
  checkboxTooltip: string
  deleteTooltip: string
}
