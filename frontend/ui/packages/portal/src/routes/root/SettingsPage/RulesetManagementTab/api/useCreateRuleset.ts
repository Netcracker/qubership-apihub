import type { LinterApiType } from '@portal/entities/api-quality/linter-api-types'
import type { Linter } from '@portal/entities/api-quality/linters'
import { API_LINTER_API_V1 } from '@portal/api-hooks/ApiQuality/constants'
import type { RulesetDto } from '@portal/entities/api-quality/rulesets'
import { useShowSuccessNotification } from '@portal/routes/root/BasePage/Notification'
import { portalRequestJson } from '@portal/utils/requests'
import type { IsLoading, IsSuccess } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { useMutation } from '@tanstack/react-query'
import { useInvalidateRulesets } from './useRulesets'

type CreateRulesetRequest = {
  rulesetName: string
  apiType: LinterApiType
  linter: Linter['linter']
  rulesetFile: File
}

export const useCreateRuleset = (): [
  (request: CreateRulesetRequest) => void,
  IsLoading,
  IsSuccess,
] => {
  const invalidateRulesets = useInvalidateRulesets()
  const showNotification = useShowSuccessNotification()

  const { mutate, isLoading, isSuccess } = useMutation<RulesetDto, Error, CreateRulesetRequest>({
    mutationFn: (rulesetParams) => createRuleset(rulesetParams),
    onSuccess: async (data) => {
      showNotification({ message: `${data.name} ruleset has been created` })
      await invalidateRulesets()
    },
  })

  return [mutate, isLoading, isSuccess]
}

async function createRuleset(rulesetParams: CreateRulesetRequest): Promise<RulesetDto> {
  const { rulesetName, apiType, linter, rulesetFile } = rulesetParams
  const formData = new FormData()
  formData.append('rulesetName', rulesetName)
  formData.append('apiType', apiType)
  formData.append('linter', linter)
  formData.append('rulesetFile', rulesetFile)

  return await portalRequestJson<RulesetDto>(
    '/rulesets',
    {
      method: 'post',
      body: formData,
    },
    { basePath: API_LINTER_API_V1 },
  )
}
