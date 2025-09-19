import { API_LINTER_API_V1 } from '@netcracker/qubership-apihub-ui-portal/src/api-hooks/ApiQuality/constants'
import type { Ruleset } from '@netcracker/qubership-apihub-ui-portal/src/entities/api-quality/rulesets'
import { useShowSuccessNotification } from '@netcracker/qubership-apihub-ui-portal/src/routes/root/BasePage/Notification'
import { portalRequestVoid } from '@netcracker/qubership-apihub-ui-portal/src/utils/requests'
import type { IsLoading, IsSuccess } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { useMutation } from '@tanstack/react-query'
import { generatePath } from 'react-router-dom'
import { useInvalidateRulesets } from './useRulesets'

export const useActivateRuleset = (): [
  (ruleset: Ruleset) => void,
  IsLoading,
  IsSuccess,
] => {
  const invalidateRulesets = useInvalidateRulesets()
  const showNotification = useShowSuccessNotification()

  const { mutate, isLoading, isSuccess } = useMutation<void, Error, Ruleset>({
    mutationFn: (ruleset) => activateRuleset(ruleset.id),
    onSuccess: async (_, variables) => {
      showNotification({ message: `${variables.name} ruleset has been activated` })
      await invalidateRulesets()
    },
  })

  return [mutate, isLoading, isSuccess]
}

async function activateRuleset(rulesetId: string): Promise<void> {
  const id = encodeURIComponent(rulesetId)
  const pattern = '/rulesets/:id/activation'
  const endpoint = generatePath(pattern, { id })
  await portalRequestVoid(
    endpoint,
    { method: 'post' },
    { basePath: API_LINTER_API_V1 },
  )
}
