import {
  ApiDocument,
  SERIALIZE_SYMBOL_STRING_MAPPING,
} from '../../src/processor'
import { normalizeGraphQL, parseGraphQLSource } from '../../src/utils'
import { deserialize } from '@netcracker/qubership-apihub-api-unifier'
import { GraphApiSchema } from '@netcracker/qubership-apihub-graphapi'

const invertMap = <K, V>(map: Map<K, V>): Map<V, K> => {
  return new Map(
    [...map].map(([key, value]: [K, V]) => [value, key]),
  )
}

const DESERIALIZE_SYMBOL_STRING_MAPPING = invertMap(SERIALIZE_SYMBOL_STRING_MAPPING)

export function deserializeDocument(serializedDocument: string): ApiDocument {
  return deserialize(serializedDocument, DESERIALIZE_SYMBOL_STRING_MAPPING) as ApiDocument
}

export const cloneDocument = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

// Helper function to load YAML test files

export function parseAndNormalizeGraphQLSchema(sdl: string): { source: GraphApiSchema; normalized: GraphApiSchema } {
  const source = parseGraphQLSource(sdl)
  const normalized = normalizeGraphQL(source)
  return { source, normalized }
}
