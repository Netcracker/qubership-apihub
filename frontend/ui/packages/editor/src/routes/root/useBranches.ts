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

import { useQuery, useQueryClient } from '@tanstack/react-query'

import { useParams } from 'react-router-dom'
import { useMemo } from 'react'
import type { Branches, BranchesDto } from '@apihub/entities/branches'
import type { InvalidateQuery } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { editorRequestJson } from '@apihub/utils/requests'

const BRANCHES_QUERY_KEY = 'branches-query-key'

export function useBranches(textFilter?: string): Branches {
  const { projectId } = useParams()

  const { data } = useQuery<BranchesDto, Error, Branches>({
    queryKey: [BRANCHES_QUERY_KEY, projectId, textFilter],
    queryFn: () => getBranches(projectId!, textFilter),
    enabled: !!projectId,
    select: toBranches,
  })

  return data ?? []
}

export function useInvalidateBranches(): InvalidateQuery<void> {
  const client = useQueryClient()
  return () => {
    client.invalidateQueries([BRANCHES_QUERY_KEY]).then()
  }
}

export function useIsBranchExists(branchName: string = ''): boolean {
  const branches = useBranches(branchName)
  return useMemo(
    () => !!branches.find(({ name }) => name === branchName),
    [branchName, branches],
  )
}

async function getBranches(
  projectKey: Key,
  textFilter?: string,
): Promise<BranchesDto> {
  const projectId = encodeURIComponent(projectKey)

  const searchParams = optionalSearchParams({
    filter: { value: textFilter },
  })
  return await editorRequestJson<BranchesDto>(`/projects/${projectId}/branches?${searchParams}`, {
    method: 'GET',
  })
}

function toBranches({ branches }: BranchesDto): Branches {
  return branches.map((branch) => ({ key: `${branch.name}-${branch.version}`, ...branch }))
}
