import type { Key } from '@portal/entities/keys'
import {
  ADD_CHANGE_ROLE_ACTION,
  type ChangeRoleAction,
  type PackageMember,
  type PackageMembers,
  REMOVE_CHANGE_ROLE_ACTION,
} from '@portal/routes/root/PortalPage/PackageSettingsPage/package-settings'
import { Box, Checkbox, TableCell, Tooltip, Typography } from '@mui/material'
import { ButtonWithHint } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/ButtonWithHint'
import {
  ConfirmationDialog,
} from '@netcracker/qubership-apihub-ui-shared/components/ConfirmationDialog/ConfirmationDialog'
import { InfinityScrollableMatrix } from '@netcracker/qubership-apihub-ui-shared/components/InfinityScrollableMatrix'
import { UserView } from '@netcracker/qubership-apihub-ui-shared/components/Users/UserView'
import { CheckboxCheckedIcon } from '@netcracker/qubership-apihub-ui-shared/icons/CheckboxCheckedIcon'
import { CheckboxDisabledCheckedIcon } from '@netcracker/qubership-apihub-ui-shared/icons/CheckboxDisabledCheckedIcon'
import { CheckboxDisabledIcon } from '@netcracker/qubership-apihub-ui-shared/icons/CheckboxDisabledIcon'
import { CheckboxIcon } from '@netcracker/qubership-apihub-ui-shared/icons/CheckboxIcon'
import { DeleteIcon } from '@netcracker/qubership-apihub-ui-shared/icons/DeleteIcon'
import type { Role, Roles } from '@netcracker/qubership-apihub-ui-shared/types/roles'
import { DEFAULT_USER_NAME } from '@netcracker/qubership-apihub-ui-shared/types/user'
import type { FC } from 'react'
import { useCallback, useMemo, useState } from 'react'

export type UserAccessControlTableProps = {
  onDeleteMember: (member: PackageMember) => void
  onChangeRole: (member: PackageMember, role: Role, action: ChangeRoleAction) => void
  isDeletingMember: boolean
  resourceName?: string
  hasUserAccessManagementPermission: boolean
  roles: Roles
  availablePackageRoles: Roles
  packageMembers: PackageMembers
  isLoading: boolean
  searchValue: string
}

const CHANGE_ROLE_PERMISSION_TOOLTIP = 'You cannot change the role that is higher than your role'
const DELETE_USER_PERMISSION_TOOLTIP = 'You cannot remove the user with role higher than your role'
const DELETE_INHERITED_USER_PERMISSION_TOOLTIP = 'You cannot remove the user with inherited role'

export const UserAccessControlTable: FC<UserAccessControlTableProps> = (props) => {

  const {
    onDeleteMember,
    onChangeRole,
    isDeletingMember,
    resourceName = 'package',
    roles,
    availablePackageRoles,
    packageMembers,
    hasUserAccessManagementPermission,
    searchValue,
  } = props
  const managementPermissionTooltip = `You do not have permission to manage user roles in current ${resourceName}`

  const members = useMemo(() => {
    return packageMembers.filter(packageMember => (packageMember.user.name ?? DEFAULT_USER_NAME).toLowerCase().includes(searchValue.toLowerCase()))
  }, [packageMembers, searchValue])

  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false)
  const [deleteConfirmationData, setDeleteConfirmationData] = useState<PackageMember | undefined>(undefined)
  const onChangePackageMemberRole = useCallback((userId: Key, roleId: Key, checked: boolean) => {
    onChangeRole(
      packageMembers.find(member => member.user.id === userId)!,
      roles.find(role => role.key === roleId)!,
      checked ? REMOVE_CHANGE_ROLE_ACTION : ADD_CHANGE_ROLE_ACTION,
    )
  }, [onChangeRole, packageMembers, roles])

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
            checkboxTooltip: managementPermissionTooltip,
            deleteTooltip: managementPermissionTooltip,
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
  }, [roles, hasUserAccessManagementPermission, maxCurrentUserRoleKey, members, roleRankMap, managementPermissionTooltip])

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
              icon={item.disabled ? <CheckboxDisabledIcon /> : <CheckboxIcon />}
              checkedIcon={item.disabled ? <CheckboxDisabledCheckedIcon /> : <CheckboxCheckedIcon />}
              onChange={() => onChangePackageMemberRole(item.userId, item.roleId, item.checked)}
            />
          </Box>
        </Tooltip>
      </TableCell>
    )
  }, [onChangePackageMemberRole])

  const deleteColumnHeaderRender = useCallback(() => {
    return (
      <TableCell sx={{ width: '42px' }} className="rightHeaderSticky" />
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
          startIcon={<DeleteIcon color="#626D82" />}
          sx={{ visibility: 'hidden' }}
          onClick={() => {
            setDeleteConfirmationData(item)
            setDeleteConfirmationOpen(true)
          }}
          data-testid="DeleteButton"
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
        title={`Remove ${deleteConfirmationData?.user.name} from the ${resourceName}?`}
        loading={isDeletingMember}
        confirmButtonName="Remove"
        onConfirm={() => onDeleteMember(deleteConfirmationData!)}
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
