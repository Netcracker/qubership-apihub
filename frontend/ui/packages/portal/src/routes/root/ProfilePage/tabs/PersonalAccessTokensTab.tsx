import { GeneratePersonalAccessTokenForm } from '@apihub/components/GeneratePersonalAccessTokenForm'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import type { GeneratePersonalAccessTokenDto } from '@netcracker/qubership-apihub-ui-shared/types/tokens'
import type { FC } from 'react'
import { useShowSuccessNotification } from '@apihub/routes/root/BasePage/Notification'

const EXPIRATION_VARIANTS = [-1, 7, 30, 60, 90, 180, 365]

export const PersonalAccessTokensTab: FC = () => {
  const showSuccessNotification = useShowSuccessNotification()

  return <>
    <BodyCard
      header="Personal Access Tokens"
      action={<></>}
      body={<>
        <GeneratePersonalAccessTokenForm
          expirationVariants={EXPIRATION_VARIANTS}
          generateApiKey={(data: GeneratePersonalAccessTokenDto) => { console.log('Form data', data) }}
          showSuccessNotification={showSuccessNotification}
          isLoading={false}
        />
      </>}
    />
  </>
}
