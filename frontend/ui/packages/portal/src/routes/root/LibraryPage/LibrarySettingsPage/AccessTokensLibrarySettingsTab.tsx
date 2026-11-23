import { Box } from '@mui/material'
import { type FC, memo, useCallback, useMemo, useState } from 'react'

import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { GenerateTokenForm } from '@netcracker/qubership-apihub-ui-shared/components/GenerateTokenForm'
import { TokensTable } from '@netcracker/qubership-apihub-ui-shared/components/TokensTable'
import { ACCESS_TOKEN_MANAGEMENT_PERMISSION } from '@netcracker/qubership-apihub-ui-shared/entities/package-permissions'
import { useUser } from '@netcracker/qubership-apihub-ui-shared/hooks/authorization/useUser'
import { useAvailablePackageRoles } from '@netcracker/qubership-apihub-ui-shared/hooks/tokens/useTokens'
import type { GenerateApiKeyValue } from '@netcracker/qubership-apihub-ui-shared/types/tokens'

import { useShowSuccessNotification } from '@portal/routes/root/BasePage/Notification'
import { useUsers } from '@portal/routes/root/useUsers'
import { useDeleteLibraryApiKey, useGenerateLibraryApiKey, useLibraryAccessTokens } from './useLibraryAccessTokens'

import type { LibrarySettingsTabProps } from './librarySettings'

export const AccessTokensLibrarySettingsTab: FC<LibrarySettingsTabProps> = memo<LibrarySettingsTabProps>(
  ({ library }) => {
    const hasTokenManagementPermission = useMemo(
      () => !!library.permissions?.includes(ACCESS_TOKEN_MANAGEMENT_PERMISSION),
      [library],
    )

    const [user] = useUser()

    const [availableRoles, isLoadingRoles] = useAvailablePackageRoles(
      library.parentPackageId ?? '',
      user?.key ?? '',
      !!library.parentPackageId && hasTokenManagementPermission,
    )

    const { tokens, isLoading: isTokensLoading } = useLibraryAccessTokens(
      library.libraryId,
      hasTokenManagementPermission,
    )
    const { deleteApiKey } = useDeleteLibraryApiKey(library.libraryId)
    const { generatedApiKey, generateApiKey, isLoading } = useGenerateLibraryApiKey(library.libraryId)

    const [userSearch, setUserSearch] = useState<string>('')
    const [usersData, isUsersDataLoading] = useUsers({ searchValue: userSearch, enabled: hasTokenManagementPermission })

    const handleGenerateToken = useCallback((value: GenerateApiKeyValue): void => {
      generateApiKey(value)
    }, [generateApiKey])

    const handleSetUserSearch = useCallback((search: string): void => {
      setUserSearch(search)
    }, [setUserSearch])

    const availableRolesForPackage = useMemo(
      () => availableRoles?.map(role => role.role) ?? [],
      [availableRoles],
    )

    const showSuccessNotification = useShowSuccessNotification()

    return (
      <BodyCard
        header="Access Tokens"
        body={
          <>
            <Box>
              <GenerateTokenForm
                roles={availableRolesForPackage}
                users={usersData?.users}
                defaultUser={user}
                setUserSearch={handleSetUserSearch}
                generatedApiKey={generatedApiKey}
                disabled={!hasTokenManagementPermission}
                generateApiKey={handleGenerateToken}
                isLoading={isLoading || isLoadingRoles || isUsersDataLoading}
                showSuccessNotification={showSuccessNotification}
              />
            </Box>
            <TokensTable
              data={tokens}
              disableDelete={!hasTokenManagementPermission}
              deleteApiKey={deleteApiKey}
              isLoading={isTokensLoading}
            />
          </>
        }
      />
    )
  },
)
AccessTokensLibrarySettingsTab.displayName = 'AccessTokensLibrarySettingsTab'
