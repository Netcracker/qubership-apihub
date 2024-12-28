import type { MappingResolver } from '../types'
import { objectMappingResolver } from '../core'

export const jsonSchemaMappingResolver: MappingResolver<string> = (before, after, ctx) => {
  const { added, removed, mapped } = objectMappingResolver(before, after, ctx)
  //special MappingResolver for future discriminator case
  return { added, removed, mapped }
}
