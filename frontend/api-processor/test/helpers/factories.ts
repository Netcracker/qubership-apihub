import type { CustomScopeElementContext } from '@netcracker/qubership-apihub-api-diff'
import type { JsonPath } from '@netcracker/qubership-apihub-json-crawl'

/**
 * Builds what api-diff hands a custom scope element provider when it asks about one node. The single
 * place tests construct it, so a property added to the context later is a change here rather than at
 * every call site.
 */
export const customScopeElementContext = (
  path: JsonPath,
  beforeJso?: unknown,
  afterJso?: unknown,
): CustomScopeElementContext => ({ path, beforeJso, afterJso })
