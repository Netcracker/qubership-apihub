import { GeneratePersonalAccessTokenForm } from '@apihub/components/GeneratePersonalAccessTokenForm'
import { PersonalAccessTokensTable } from '@apihub/components/PersonalAccessTokensTable'
import { useShowSuccessNotification } from '@apihub/routes/root/BasePage/Notification'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { useDeletePersonalAccessToken, useGeneratePersonalAccessToken, usePersonalAccessTokens } from '@netcracker/qubership-apihub-ui-shared/hooks/tokens/usePersonalAccessTokens'
import { useCallback, type FC } from 'react'

const EXPIRATION_VARIANTS = [-1, 7, 30, 60, 90, 180, 365]

export const PersonalAccessTokensTab: FC = () => {
  const showSuccessNotification = useShowSuccessNotification()
  const [personalAccessToken, generatePersonalAccessToken, isTokenGenerating] = useGeneratePersonalAccessToken()
  const [personalAccessTokens, areTokensLoading] = usePersonalAccessTokens()
  const [deletePersonalAccessToken, isTokenBeingDeleted] = useDeletePersonalAccessToken()

  const validateTokenName = useCallback((name: string) => {
    return personalAccessTokens.every(token => token.name !== name)
  }, [personalAccessTokens])

  return <>
    <BodyCard
      header="Personal Access Tokens"
      body={<>
        <GeneratePersonalAccessTokenForm
          onValidateTokenName={validateTokenName}
          onGenerateToken={generatePersonalAccessToken}
          generatedToken={personalAccessToken}
          disabled={personalAccessTokens.length >= 100}
          loading={isTokenGenerating || areTokensLoading}
          fieldExpirationVariants={EXPIRATION_VARIANTS}
          showSuccessNotification={showSuccessNotification}
        />
        <PersonalAccessTokensTable
          data={personalAccessTokens}
          loading={areTokensLoading}
          onDelete={deletePersonalAccessToken}
          isTokenBeingDeleted={isTokenBeingDeleted}
        />
      </>}
    />
  </>
}
