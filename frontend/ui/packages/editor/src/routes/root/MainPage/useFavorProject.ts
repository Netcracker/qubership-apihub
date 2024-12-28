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

import { useMutation } from '@tanstack/react-query'
import { useInvalidateProjects } from '../useProjects'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { editorRequestVoid } from '@apihub/utils/requests'

export function useFavorProject(): FavorProject {
  const invalidateProjects = useInvalidateProjects()

  const { mutate } = useMutation<void, Error, Key>({
    mutationFn: key => favorProject(key),
    onSuccess: invalidateProjects,
  })

  return mutate
}

async function favorProject(
  projectKey: Key,
): Promise<void> {
  const projectId = encodeURIComponent(projectKey)

  await editorRequestVoid(`/projects/${projectId}/favor`, {
    method: 'POST',
  })
}

type FavorProject = (key: Key) => void
