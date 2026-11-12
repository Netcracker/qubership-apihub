import { useShowSuccessNotification } from '@portal/routes/root/BasePage/Notification'
import { useUsers } from '@portal/routes/root/useUsers'
import { Box } from '@mui/material'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { GenerateTokenForm } from '@netcracker/qubership-apihub-ui-shared/components/GenerateTokenForm'
import { TokensTable } from '@netcracker/qubership-apihub-ui-shared/components/TokensTable'
import { useUser } from '@netcracker/qubership-apihub-ui-shared/hooks/authorization/useUser'
import {
  useDeleteApiKey,
  useGenerateApiKey,
  useTokens,
} from '@netcracker/qubership-apihub-ui-shared/hooks/tokens/useTokens'
import { useRoles } from '@netcracker/qubership-apihub-ui-shared/hooks/user-roles/useRoles'
import type { GenerateApiKeyValue } from '@netcracker/qubership-apihub-ui-shared/types/tokens'
import type { FC } from 'react'
import { memo, useCallback, useMemo, useState } from 'react'

export const SystemTokensTab: FC = memo(() => {
  const [systemTokens, isSystemTokensLoading] = useTokens()
  const [deleteAPIKey, isDeleteLoading] = useDeleteApiKey()
  const [generatedApiKey, generateApiKey, isLoading] = useGenerateApiKey()
  const { data: roles, isLoading: isRolesLoading } = useRoles()

  const [user] = useUser()
  const [userSearch, setUserSearch] = useState<string>('')
  const [usersData, isUsersDataLoading] = useUsers({ searchValue: userSearch })

  const handleGenerateToken = useCallback((value: GenerateApiKeyValue): void => {
    generateApiKey({ value })
  }, [generateApiKey])

  const handleSetUserSearch = useCallback((search: string) => {
    setUserSearch(search)
  }, [setUserSearch])

  const availableRoles = useMemo(() => roles?.map(role => role.role) ?? [], [roles])

  const showSuccessNotification = useShowSuccessNotification()

  return (
    <BodyCard
      header="System Tokens"
      body={
        <>
          <Box>
            <GenerateTokenForm
              roles={availableRoles}
              defaultUser={user}
              users={usersData?.users}
              setUserSearch={handleSetUserSearch}
              generatedApiKey={generatedApiKey}
              generateApiKey={handleGenerateToken}
              isLoading={isLoading || isRolesLoading || isUsersDataLoading}
              showSuccessNotification={showSuccessNotification}
            />
          </Box>
          <TokensTable
            data={systemTokens}
            deleteApiKey={deleteAPIKey}
            isLoading={isSystemTokensLoading || isDeleteLoading}
          />
        </>
      }
    />)
})
