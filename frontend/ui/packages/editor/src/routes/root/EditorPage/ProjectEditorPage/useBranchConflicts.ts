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
import { useParams } from 'react-router-dom'
import { useBranchSearchParam } from '../../useBranchSearchParam'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { editorRequestJson } from '@apihub/utils/requests'
import type { BranchConflictsDto } from '@apihub/entities/branches'
import type { IsFetching, RefetchQuery } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'

const BRANCH_CONFLICTS_QUERY_KEY = 'branch-conflicts-query-key'

export function useBranchConflicts(): [Key[], IsFetching, RefetchQuery<Key[], Error>] {
  const { projectId } = useParams()
  const [selectedBranch] = useBranchSearchParam()

  const { data = [], isFetching, refetch } = useQuery<Key[], Error, Key[]>({
    queryKey: [BRANCH_CONFLICTS_QUERY_KEY, projectId, selectedBranch],
    queryFn: () => getBranchConflicts(projectId!, selectedBranch!),
    enabled: false,
  })

  return [data, isFetching, refetch]
}

async function getBranchConflicts(
  projectKey: Key,
  branchName: string,
): Promise<Key[]> {
  const projectId = encodeURIComponent(projectKey)
  const branch = encodeURIComponent(branchName)

  const data = await editorRequestJson<BranchConflictsDto>(`/projects/${projectId}/branches/${branch}/conflicts`, {
    method: 'GET',
  })
  return data.files
}

