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
import { useBranchSearchParam } from '../../../../../useBranchSearchParam'
import { getFileHistory } from '../../../useProjectFileContent'
import type { ProjectFileHistory, ProjectFileHistoryDto } from '@apihub/entities/project-file-history'
import type { InvalidateQuery, IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { toUser } from '@netcracker/qubership-apihub-ui-shared/types/user'

const FILE_HISTORY_QUERY_KEY = 'file-history-query-key'

export function useFileHistory(fileId: Key, enabled = true): [ProjectFileHistory, IsLoading] {
  const { projectId } = useParams()
  const [selectedBranch] = useBranchSearchParam()

  const { data, isLoading } = useQuery<ProjectFileHistoryDto, Error, ProjectFileHistory>({
    queryKey: [FILE_HISTORY_QUERY_KEY, projectId, selectedBranch, fileId],
    queryFn: () => getFileHistory(projectId!, selectedBranch!, fileId),
    enabled: enabled && !!projectId && !!selectedBranch && fileId !== '',
    select: toProjectFileHistory,
  })

  return [data ?? [], isLoading]
}

export function useInvalidateFileHistory(): InvalidateQuery<void> {
  const client = useQueryClient()
  return () => {
    client.invalidateQueries([FILE_HISTORY_QUERY_KEY]).then()
  }
}

function toProjectFileHistory(
  value: ProjectFileHistoryDto,
): ProjectFileHistory {
  return value.changes.map(change => ({
    ...change,
    key: change.commitId,
    modifiedBy: toUser(change.modifiedBy),
  }))
}
