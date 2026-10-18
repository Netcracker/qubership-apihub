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

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const COMPARE_EXTERNAL_FILE_QUERY_KEY = 'compare-external-file-query-key'

export function useCompareExternalFile(): CompareExternalFile | null {
  const { data } = useQuery<void, Error, CompareExternalFile>({
    queryKey: [COMPARE_EXTERNAL_FILE_QUERY_KEY],
    enabled: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
  })

  return data ?? null
}

export function useSetCompareExternalFile(): SetCompareExternalFile {
  const client = useQueryClient()

  const { mutate } = useMutation<void, Error, CompareExternalFile | null>({
    mutationFn: () => Promise.resolve(),
    onSuccess: (_, compareExternalFile) => {
      client.setQueryData<CompareExternalFile | null>([COMPARE_EXTERNAL_FILE_QUERY_KEY], compareExternalFile)
    },
  })

  return mutate
}

type SetCompareExternalFile = (value: CompareExternalFile | null) => void

export type CompareExternalFile = {
  name?: string
  url?: string
  content?: string
}
