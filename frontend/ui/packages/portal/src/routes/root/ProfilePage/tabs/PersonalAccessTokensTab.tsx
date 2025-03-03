import { GeneratePersonalAccessTokenForm } from '@apihub/components/GeneratePersonalAccessTokenForm'
import { PersonalAccessTokensTable } from '@apihub/components/PersonalAccessTokensTable'
import { useShowSuccessNotification } from '@apihub/routes/root/BasePage/Notification'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { useGeneratePersonalAccessToken, usePersonalAccessTokens } from '@netcracker/qubership-apihub-ui-shared/hooks/tokens/usePersonalAccessTokens'
import type { FC } from 'react'

const EXPIRATION_VARIANTS = [-1, 7, 30, 60, 90, 180, 365]

export const PersonalAccessTokensTab: FC = () => {
  const showSuccessNotification = useShowSuccessNotification()
  const [personalAccessToken, generatePersonalAccessToken, isLoading] = useGeneratePersonalAccessToken()

  const [personalAccessTokens, areTokensLoading, tokensLoadingError] = usePersonalAccessTokens()

  return <>
    <BodyCard
      header="Personal Access Tokens"
      action={<></>}
      body={<>
        <GeneratePersonalAccessTokenForm
          expirationVariants={EXPIRATION_VARIANTS}
          generatePersonalAccessToken={generatePersonalAccessToken}
          generatedPersonalAccessToken={personalAccessToken}
          showSuccessNotification={showSuccessNotification}
          isLoading={isLoading}
        />
        <PersonalAccessTokensTable
          data={personalAccessTokens}
          onDeletePersonalAccessToken={(id) => { console.log('deleted id', id) }}
          loading={areTokensLoading}
          disableDelete={false}
        />
      </>}
    />
  </>
}
