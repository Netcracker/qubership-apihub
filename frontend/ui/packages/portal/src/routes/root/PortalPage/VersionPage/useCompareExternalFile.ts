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
