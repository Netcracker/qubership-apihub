import { allUnclassified } from '../core'
import type { CompareRules } from '../types'

/**
 * Bindings rules (protocol-specific: server, channel, operation, message).
 * All binding types use the same structure; protocol-specific content is unclassified.
 */
export const bindingsRules: CompareRules = {
  $: allUnclassified,
  '/**': { $: allUnclassified },
}
