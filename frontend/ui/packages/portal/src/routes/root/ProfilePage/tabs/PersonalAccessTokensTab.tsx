import { GeneratePersonalAccessTokenForm } from '@apihub/components/GeneratePersonalAccessTokenForm'
import { PersonalAccessTokensTable } from '@apihub/components/PersonalAccessTokensTable'
import { useShowSuccessNotification } from '@apihub/routes/root/BasePage/Notification'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { useDeletePersonalAccessToken, useGeneratePersonalAccessToken, usePersonalAccessTokens } from '@netcracker/qubership-apihub-ui-shared/hooks/tokens/usePersonalAccessTokens'
import type { FC } from 'react'

const EXPIRATION_VARIANTS = [-1, 7, 30, 60, 90, 180, 365]

export const PersonalAccessTokensTab: FC = () => {
  const showSuccessNotification = useShowSuccessNotification()
  const [personalAccessToken, generatePersonalAccessToken, isTokenGenerating] = useGeneratePersonalAccessToken()
  const [personalAccessTokens, areTokensLoading, tokensLoadingError] = usePersonalAccessTokens()
  const [deletePersonalAccessToken, isTokenBeingDeleted] = useDeletePersonalAccessToken()
  
  return <>
    <BodyCard
      header="Personal Access Tokens"
      body={<>
        <GeneratePersonalAccessTokenForm
          onGenerateToken={generatePersonalAccessToken}
          generatedToken={personalAccessToken}
          disabled={personalAccessTokens.length >= 100} // Wrong!
          loading={isTokenGenerating || areTokensLoading}
          fieldExpirationVariants={EXPIRATION_VARIANTS}
          showSuccessNotification={showSuccessNotification}
        />
        <PersonalAccessTokensTable
          data={personalAccessTokens}
          loading={areTokensLoading}
          onDelete={deletePersonalAccessToken}
          disableDelete={isTokenBeingDeleted}
        />
      </>}
    />
  </>
}
