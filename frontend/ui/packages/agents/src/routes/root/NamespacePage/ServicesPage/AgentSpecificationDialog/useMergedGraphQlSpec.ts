import { mergeTypeDefs } from '@graphql-tools/merge'
import { print } from 'graphql'
import type { SpecRaw } from '@netcracker/qubership-apihub-ui-shared/entities/specs'
import { useMemo } from 'react'

export function useMergedGraphQlSpec(options: {
  specsRaw: SpecRaw[]
  enabled: boolean
}): string | null {
  const { specsRaw, enabled } = options ?? {}

  return useMemo(
    () => {
      if (!enabled) {
        return null
      }

      try {
        const mergedTypeDefs = mergeTypeDefs(specsRaw)
        return print(mergedTypeDefs)
      } catch (e) {
        console.error(e)
        return null
      }
    },
    [enabled, specsRaw],
  )
}
