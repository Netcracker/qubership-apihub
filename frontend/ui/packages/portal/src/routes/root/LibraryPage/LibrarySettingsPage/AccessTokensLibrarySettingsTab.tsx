import { Alert, Box } from '@mui/material'
import { type FC, useState } from 'react'

import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { GenerateTokenForm } from '@netcracker/qubership-apihub-ui-shared/components/GenerateTokenForm'
import { TokensTable } from '@netcracker/qubership-apihub-ui-shared/components/TokensTable'
import { ACCESS_TOKEN_MANAGEMENT_PERMISSION } from '@netcracker/qubership-apihub-ui-shared/entities/package-permissions'
import { useUser } from '@netcracker/qubership-apihub-ui-shared/hooks/authorization/useUser'
import { useAvailablePackageRoles } from '@netcracker/qubership-apihub-ui-shared/hooks/tokens/useTokens'
import type { DeleteApiKeyData, GenerateApiKeyValue } from '@netcracker/qubership-apihub-ui-shared/types/tokens'
import { HttpError } from '@netcracker/qubership-apihub-ui-shared/utils/responses'

import { useShowErrorNotification, useShowSuccessNotification } from '@portal/routes/root/BasePage/Notification'
import { useUsers } from '@portal/routes/root/useUsers'
import { useDeleteLibraryApiKey, useGenerateLibraryApiKey, useLibraryAccessTokens } from './useLibraryAccessTokens'

import type { LibrarySettingsTabProps } from './library-settings'

export const AccessTokensLibrarySettingsTab: FC<LibrarySettingsTabProps> = ({ library }) => {
  const hasPermission = !!library.permissions?.includes(ACCESS_TOKEN_MANAGEMENT_PERMISSION)
  const [user] = useUser()
  const [userSearch, setUserSearch] = useState('')
  const [availableRoles, isRolesLoading, rolesError] = useAvailablePackageRoles(
    library.parentPackageId ?? '',
    user?.key ?? '',
    !!library.parentPackageId && hasPermission,
  )
  const [usersData, isUsersLoading] = useUsers({ searchValue: userSearch, enabled: hasPermission })
  const { tokens, isLoading: isTokensLoading, error } = useLibraryAccessTokens(library.libraryId, hasPermission)
  const { generateApiKey, generatedApiKey, isLoading: isGenerating } = useGenerateLibraryApiKey(library.libraryId)
  const { deleteApiKey, isLoading: isDeleting } = useDeleteLibraryApiKey(library.libraryId)
  const showSuccessNotification = useShowSuccessNotification()
  const showErrorNotification = useShowErrorNotification()

  // A failed request already shows its own snackbar, and a 401 rejects with no error at all;
  // notify only about the errors the request helpers do not report, such as a network failure
  const notifyError = (error: unknown): void => {
    if (!(error instanceof Error) || error instanceof HttpError) return
    showErrorNotification({ message: error.message })
  }

  const handleGenerateToken = async (value: GenerateApiKeyValue): Promise<void> => {
    try {
      await generateApiKey(value)
      showSuccessNotification({ message: 'Library access token has been generated' })
    } catch (error) {
      notifyError(error)
    }
  }

  const handleDeleteToken = async ({ key }: DeleteApiKeyData): Promise<void> => {
    try {
      await deleteApiKey(key)
      showSuccessNotification({ message: 'Library access token has been deleted' })
    } catch (error) {
      notifyError(error)
    }
  }

  return (
    <BodyCard
      header="Access Tokens"
      body={
        <Box data-testid="AccessTokensLibrarySettingsTab">
          {(error || rolesError) && <Alert severity="error">{(error ?? rolesError)?.message}</Alert>}
          <GenerateTokenForm
            roles={availableRoles.map(role => role.role)}
            users={usersData?.users}
            defaultUser={user}
            setUserSearch={setUserSearch}
            generatedApiKey={generatedApiKey}
            disabled={!hasPermission}
            generateApiKey={handleGenerateToken}
            isLoading={isGenerating || isRolesLoading || isUsersLoading}
            showSuccessNotification={showSuccessNotification}
          />
          <TokensTable
            data={tokens}
            disableDelete={!hasPermission || isDeleting}
            deleteApiKey={handleDeleteToken}
            isLoading={isTokensLoading}
          />
        </Box>
      }
    />
  )
}
AccessTokensLibrarySettingsTab.displayName = 'AccessTokensLibrarySettingsTab'
