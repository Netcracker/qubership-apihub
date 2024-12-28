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
import type { IntegrationRepositories, IntegrationRepositoriesDto } from '@apihub/entities/integration-repository'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { editorRequestJson } from '@apihub/utils/requests'

const INTEGRATION_REPOSITORIES_QUERY_KEY = 'integration-repositories-query-key'

export function useIntegrationRepositories(namePart: string): IntegrationRepositories {
  const { data } = useQuery<IntegrationRepositoriesDto, Error, IntegrationRepositories>({
    queryKey: [INTEGRATION_REPOSITORIES_QUERY_KEY, namePart],
    queryFn: () => getIntegrationRepositories(namePart),
    select: toIntegrationRepositories,
  })

  return data ?? []
}

async function getIntegrationRepositories(
  namePart: string,
): Promise<IntegrationRepositoriesDto> {
  const searchParams = optionalSearchParams({
    filter: { value: namePart },
  })
  return await editorRequestJson<IntegrationRepositoriesDto>(`/integrations/gitlab/repositories?${searchParams}`, {
    method: 'GET',
  })
}

function toIntegrationRepositories(
  { repositories }: IntegrationRepositoriesDto,
): IntegrationRepositories {
  return repositories.map(({ repositoryId, name, defaultBranch }) => ({
    key: repositoryId,
    name: name,
    defaultBranchName: defaultBranch,
  }))
}
