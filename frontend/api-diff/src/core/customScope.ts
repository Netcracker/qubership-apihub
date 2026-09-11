import { EvaluationCacheService } from '@netcracker/qubership-apihub-api-unifier'
import {
  CustomScope,
  CustomScopeElementContext,
  CustomScopeElementProvider,
  InternalCompareOptions,
} from '../types'

/**
 * The scope every comparison starts from. A single frozen instance on purpose: `createDiff` decides whether
 * a difference carries a custom scope by comparing against this identity, so a second empty record would
 * put an empty one on every difference.
 */
export const EMPTY_CUSTOM_SCOPE: CustomScope = Object.freeze(Object.create(null) as Record<string, string>)

// Serialized rather than joined, because a separator would collide `{a: 'b|c'}` with `{'a|b': 'c'}`, and
// sorted because two routes can state the same elements in either order
const contentIdentity = (customScope: CustomScope): string =>
  JSON.stringify(customScope, Object.keys(customScope).sort())

/** Interns the custom scopes of one comparison, so the reuse caches can use a record's identity as a footprint. */
export interface CustomScopeInterner {
  /** Applies a patch, ignoring `undefined` values, and hands the parent itself back when nothing changes. */
  mergeOrReuse(parent: CustomScope, patch: CustomScope | undefined): CustomScope
}

export const createCustomScopeInterner = (): CustomScopeInterner => {
  const recordsByContent = new Map<string, CustomScope>()

  return {
    mergeOrReuse: (parent, patch) => {
      if (!patch) {
        return parent
      }
      // Copied only once something changes, so a subtree-constant answer costs no record per node
      let merged: Record<string, string> | undefined = undefined
      for (const name of Object.keys(patch)) {
        const value = patch[name]
        if (value === undefined || value === parent[name]) {
          continue
        }
        if (!merged) {
          merged = Object.assign(Object.create(null), parent) as Record<string, string>
        }
        merged[name] = value
      }
      if (!merged) {
        return parent
      }
      const identity = contentIdentity(merged)
      const known = recordsByContent.get(identity)
      if (known) {
        return known
      }
      const frozen = Object.freeze(merged)
      recordsByContent.set(identity, frozen)
      return frozen
    },
  }
}

/** The declared providers of one comparison, in the shape the traversal uses them. */
interface ResolvedCustomScopeProviders {
  interner: CustomScopeInterner
  patchAt: ((context: CustomScopeElementContext) => CustomScope | undefined) | undefined
}

/**
 * Two providers under one name would silently overwrite each other, so this runs at `apiDiff` entry,
 * before the cost of normalizing either document is paid.
 */
export const assertDistinctCustomScopeElementNames = (providers: readonly CustomScopeElementProvider[]): void => {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const { name } of providers) {
    if (seen.has(name)) {
      duplicates.add(name)
    }
    seen.add(name)
  }
  if (duplicates.size) {
    throw new Error(`Custom scope element declared more than once: ${[...duplicates].join(', ')}`)
  }
}

const buildPatchFunction = (providers: readonly CustomScopeElementProvider[]): ResolvedCustomScopeProviders['patchAt'] => {
  if (!providers.length) {
    return undefined
  }
  assertDistinctCustomScopeElementNames(providers)
  // One context object per node, shared by every provider, and built only where a provider exists: the
  // callers reach this through an optional call, which does not evaluate its argument otherwise
  return (context) => {
    let patch: Record<string, string> | undefined = undefined
    for (const { name, valueAt } of providers) {
      const value = valueAt(context)
      // `undefined` inherits, so it must not land in the patch
      if (value !== undefined) {
        patch = patch ?? Object.create(null) as Record<string, string>
        patch[name] = value
      }
    }
    return patch
  }
}

// The reuse cache is the identity of one comparison: every traversal of it, nested ones included, is handed
// that same instance, and one interner per comparison is what gives equal records one object. Weak on
// purpose, so the entry goes with the comparison; a strong map here pins every document ever compared.
const providersByComparison = new WeakMap<EvaluationCacheService, ResolvedCustomScopeProviders>()

/** The custom scope providers of the comparison this options object belongs to, resolved once. */
export const resolveCustomScopeProviders = (options: InternalCompareOptions): ResolvedCustomScopeProviders => {
  const known = providersByComparison.get(options.mergedJsoCache)
  if (known) {
    return known
  }
  const resolved: ResolvedCustomScopeProviders = {
    interner: createCustomScopeInterner(),
    patchAt: buildPatchFunction(options.customScopeElementProviders ?? []),
  }
  providersByComparison.set(options.mergedJsoCache, resolved)
  return resolved
}
