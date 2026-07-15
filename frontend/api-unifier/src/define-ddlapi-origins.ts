import { anyArrayKeys, isArray, isObject, syncClone } from '@netcracker/qubership-apihub-json-crawl'
import { DdlapiProperties, ObjectKind } from '@netcracker/qubership-apihub-ddlapi'
import { ChainItem, OriginCache, OriginsMetaRecord, ResolveOptions } from './types'
import { createCycledJsoHandlerHook } from './cycle-jso'
import { setJsoProperty } from './utils'

/**
 * Model-aware, definition-first origins walk for ddlapi `Realm`s. It replaces the
 * JSON-Schema `defineOriginsAndResolveRef` (all of whose work — `$ref` inlining, synthetic
 * titles/allOf — is irrelevant to ddlapi) with a dedicated stage that does the only part
 * ddlapi needs: intern one `ChainItem` per instance at its *definition site* and decorate
 * every node with an `originsFlag` record, so cross-references (FK targets, shared columns,
 * dual-role enum types) carry their home origin rather than minting a duplicate.
 *
 * Output is an identity-preserving clone (the caller's Realm is never mutated): shared
 * instances stay `===`, cycles are preserved, via the shared `createCycledJsoHandlerHook`.
 *
 * Two passes are required because the Realm is a cyclic graph: pass A interns homes by
 * walking *containment only*, so a node's home is always its containment position even when
 * a forward/cyclic reference (e.g. `fk.refTable`) reaches it first; pass B then builds the
 * records, and every reference edge reuses the already-interned home `ChainItem`.
 */
export const defineDdlApiOrigins = (value: unknown, options?: ResolveOptions): unknown => {
  // Honour originsAlreadyDefined exactly like defineOriginsAndResolveRef.
  const originsFlag = options?.originsAlreadyDefined ? undefined : options?.originsFlag

  // Identity-preserving clone (shared refs + cycles), independent of origin assignment.
  const cycledJsoHandlerHook = createCycledJsoHandlerHook<{}, {}>()
  const clone = syncClone(value, [cycledJsoHandlerHook], { state: {} })

  if (!originsFlag || !isObject(clone)) {
    return clone
  }

  const cache: OriginCache = new Map()
  // Pass A — intern one ChainItem per instance at its containment home.
  internHomes(clone, undefined, cache)
  // Pass B — write each node's origins record, reusing home ChainItems for reference edges.
  buildRecords(clone, undefined, cache, new Set(), originsFlag)
  return clone
}

const getOrCreateOrigin = (cache: OriginCache, instance: unknown, make: () => ChainItem): ChainItem => {
  let chain = cache.get(instance)
  if (!chain) {
    chain = make()
    cache.set(instance, chain)
  }
  return chain
}

// Walk named-type homes (`objects`) before their referrers (`tables`/`schemas`). Correctness
// of dual-role named-type homing no longer depends on this ordering — `ColumnType.type` is an
// explicit reference edge (see isReferenceObjectChild), so named types are homed at
// schema.objects regardless of order — but visiting objects first keeps homes minted in a
// natural, stable order.
const orderedKeys = (node: object): PropertyKey[] => {
  const keys = (isArray(node) ? anyArrayKeys(node) : Reflect.ownKeys(node)).filter((k) => typeof k !== 'symbol')
  return keys.sort((a, b) => (a === DdlapiProperties.Objects ? 0 : 1) - (b === DdlapiProperties.Objects ? 0 : 1))
}

// Reference edges to a *single* instance whose home is elsewhere. Pass A must not
// follow these, or it would home the target at the referencing site.
const isReferenceObjectChild = (node: Record<PropertyKey, unknown>, key: PropertyKey, child: object): boolean => {
  // `ColumnType.type` is a SchemaType (carries a `kind`). For a *named* type (enum / Domain)
  // it is the same instance held in schema.objects — a reference whose home is there. Treating
  // it as a reference (rather than relying on objects-before-tables ordering) homes named types
  // at their definition site regardless of walk order, incl. cross-schema. Inline (unnamed)
  // types have no other home, so pass B homes them at this site (cache miss) — also correct.
  // (Column.type → ColumnType has no `kind`, so it stays containment.)
  if (key === DdlapiProperties.Type && DdlapiProperties.Kind in (child as Record<PropertyKey, unknown>)) { return true }
  const kind = node.kind
  if (kind === ObjectKind.ForeignKey) { return key === DdlapiProperties.RefTable }
  // IndexPart has no `kind`; identify it structurally by its required `seqNo`.
  if (kind === undefined && DdlapiProperties.SeqNo in node) { return key === DdlapiProperties.Column }
  return false
}

// Reference edges to an array of shared instances (FK column lists). The array itself is
// owned by the FK, but its elements are shared table columns homed under table.columns.
const isReferenceArrayChild = (node: Record<PropertyKey, unknown>, key: PropertyKey): boolean =>
  node.kind === ObjectKind.ForeignKey && (key === DdlapiProperties.Columns || key === DdlapiProperties.RefColumns)

const internHomes = (node: object, chain: ChainItem | undefined, cache: OriginCache): void => {
  const objectNode = !isArray(node) ? (node as Record<PropertyKey, unknown>) : undefined
  for (const key of orderedKeys(node)) {
    const child = (node as Record<PropertyKey, unknown>)[key]
    if (!isObject(child)) { continue }
    if (objectNode && (isReferenceObjectChild(objectNode, key, child) || isReferenceArrayChild(objectNode, key))) {
      continue // reference edge — homed via containment elsewhere
    }
    const had = cache.has(child)
    const childChain = getOrCreateOrigin(cache, child, () => ({ parent: chain, value: key }))
    if (!had) { internHomes(child, childChain, cache) }
  }
}

const buildRecords = (
  node: object,
  chain: ChainItem | undefined,
  cache: OriginCache,
  visited: Set<unknown>,
  originsFlag: symbol,
): void => {
  if (visited.has(node)) { return }
  visited.add(node)
  const record: OriginsMetaRecord = {}
  for (const key of orderedKeys(node)) {
    const child = (node as Record<PropertyKey, unknown>)[key]
    if (!isObject(child)) {
      record[key] = [{ parent: chain, value: key }]
      continue
    }
    // For reference edges the target is already homed (pass A) → getOrCreate returns the
    // home ChainItem and the visited-guard skips rebuilding its record. A dangling target
    // (partial realm) is a cache miss: it is homed here and its record built, never throwing.
    const childChain = getOrCreateOrigin(cache, child, () => ({ parent: chain, value: key }))
    record[key] = [childChain]
    buildRecords(child, childChain, cache, visited, originsFlag)
  }
  setJsoProperty(node as Record<PropertyKey, unknown>, originsFlag, record)
}
