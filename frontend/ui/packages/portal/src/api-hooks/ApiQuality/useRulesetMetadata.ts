import type { Ruleset, RulesetDto } from '@apihub/entities/api-quality/rulesets'
import type { Key } from '@apihub/entities/keys'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { requestJson } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { useQuery } from '@tanstack/react-query'
import { generatePath } from 'react-router'
import { API_LINTER_API_V1 } from './constants'

const QUERY_KEY_RULESET_METADATA = 'ruleset-metadata'

export function useRulesetMetadata(rulesetId: Key): [Ruleset | undefined, IsLoading, Error | null] {
  const rulesetKey = encodeURIComponent(rulesetId)

  const { data, isLoading, error } = useQuery<RulesetDto, Error, Ruleset>({
    queryKey: [QUERY_KEY_RULESET_METADATA, rulesetKey],
    queryFn: () => getRulesetMetadata(rulesetKey),
  })

  return [data, isLoading, error]
}

function getRulesetMetadata(rulesetKey: Key): Promise<RulesetDto> {
  const pattern = '/rulesets/:rulesetId'
  const endpoint = generatePath(pattern, { rulesetId: rulesetKey })

  return requestJson<RulesetDto>(
    endpoint,
    { method: 'GET' },
    { basePath: API_LINTER_API_V1 },
  )
}
