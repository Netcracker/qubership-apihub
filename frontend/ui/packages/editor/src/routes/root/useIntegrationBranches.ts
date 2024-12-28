/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useQuery } from '@tanstack/react-query'
import type { IntegrationBranches, IntegrationBranchesDto } from '@apihub/entities/integration-branches'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { editorRequestJson } from '@apihub/utils/requests'


const INTEGRATION_BRANCHES_QUERY_KEY = 'integration-branches-query-key'

export function useIntegrationBranches(repositoryKey: Key): IntegrationBranches {
  const { data } = useQuery<IntegrationBranchesDto, Error, IntegrationBranches>({
    queryKey: [INTEGRATION_BRANCHES_QUERY_KEY, repositoryKey],
    queryFn: () => getIntegrationBranches(repositoryKey),
    enabled: !!repositoryKey,
    select: toIntegrationBranches,
  })

  return data ?? []
}

async function getIntegrationBranches(
  repositoryKey: Key,
  limit = 100,
): Promise<IntegrationBranchesDto> {
  const repositoryId = encodeURIComponent(repositoryKey)

  const searchParams = optionalSearchParams({
    limit: { value: limit },
  })

  return await editorRequestJson<IntegrationBranchesDto>(
    `/integrations/gitlab/repositories/${repositoryId}/branches?${searchParams}`,
  )
}

function toIntegrationBranches(value: IntegrationBranchesDto): IntegrationBranches {
  return value.branches.map((branch, index) => ({
    key: `${branch.name}-${index}`,
    name: branch.name,
  }))
}
