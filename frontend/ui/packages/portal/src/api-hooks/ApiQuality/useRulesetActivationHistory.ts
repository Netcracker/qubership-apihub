import type { RulesetActivationHistory } from '@apihub/entities/api-quality/rulesets'
import type { Key } from '@apihub/entities/keys'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { requestJson } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { generatePath } from 'react-router-dom'
import { API_LINTER_API_V1 } from './constants'

const QUERY_KEY_RULESET_ACTIVATION_HISTORY = 'query-key-ruleset-activation-history'

export function useRulesetActivationHistory(rulesetId: Key): [RulesetActivationHistory, IsLoading] {
  const { data, isLoading } = useQuery<RulesetActivationHistory, Error, RulesetActivationHistory>({
    queryKey: [QUERY_KEY_RULESET_ACTIVATION_HISTORY, rulesetId],
    queryFn: () => getRulesetActivationHistory(rulesetId),
  })

  const defaultEmptyData: RulesetActivationHistory = useMemo(() => ({ rulesetId: rulesetId, activationHistory: [] }), [rulesetId])

  return [data ?? defaultEmptyData, isLoading]
}

function getRulesetActivationHistory(rulesetId: Key): Promise<RulesetActivationHistory> {
  const pattern = '/rulesets/:rulesetId/activation'
  const rulesetKey = encodeURIComponent(rulesetId)
  const endpoint = generatePath(pattern, { rulesetId: rulesetKey })

  return requestJson<RulesetActivationHistory>(
    endpoint,
    { method: 'GET' },
    { basePath: API_LINTER_API_V1 },
  )
}
