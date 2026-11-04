import { Diff, DiffAction, DiffType, isDiffAdd, isDiffRemove, isDiffRename, isDiffReplace } from "@netcracker/qubership-apihub-api-diff"
import { JsonPath } from "@netcracker/qubership-apihub-json-crawl"
import { DiffsRecord, isArray, isObjective, takeIfDiffsRecord } from "../../utilities"
import { DiffTypeOrder } from "../../model/abstract/tree-with-diffs/diff-type-order"

/** Whether the current object exists on each side of a merged document. */
export type SideContext = {
  readonly before: boolean
  readonly after: boolean
}

/** Operations on `SideContext` values: where something exists in a merged document. */
export class SideContexts {
  /** Exists on no side: the start of an accumulation. */
  public static readonly NONE: SideContext = { before: false, after: false }
  /** Exists on both sides: the document root. */
  public static readonly BOTH: SideContext = { before: true, after: true }

  /** Exists on a side only where both `a` and `b` do. */
  public static intersect(a: SideContext, b: SideContext): SideContext {
    return { before: a.before && b.before, after: a.after && b.after }
  }

  /** Exists on a side where any of `contexts` does (`NONE` for none). */
  public static union(...contexts: readonly SideContext[]): SideContext {
    return {
      before: contexts.some(context => context.before),
      after: contexts.some(context => context.after),
    }
  }
}

/** One field of a merged object, reconstructed per side. */
export type FieldSides = {
  readonly beforePresent: boolean
  readonly afterPresent: boolean
  readonly before: unknown
  readonly after: unknown
  /** The field's own diff in its parent's record, if any. */
  readonly diff: Diff | undefined
}

const SYNTHETIC_DIFF_SCOPE = 'openapi-operation-viewer'

/**
 * Reads a merged `apiDiff` document per side and builds synthetic diffs from per-side values.
 * `apiDiff` keeps removed keys / array items in the merged object with their BEFORE value (E18),
 * so a field is absent on a side when it or an ancestor carries an add (before) / remove (after).
 * Design: docs/design/openapi/entities/parameters.md -> "Step 1".
 */
export class SideReader {
  constructor(public readonly diffsMetaKey: symbol) { }

  public record(value: unknown): DiffsRecord | undefined {
    return isObjective(value) ? takeIfDiffsRecord(value[this.diffsMetaKey]) : undefined
  }

  /** `diffKey`: the diffs-record key when `apiDiff` records the diff under another spelling of `key`. */
  public readField(owner: unknown, key: PropertyKey, context: SideContext, diffKey: PropertyKey = key): FieldSides {
    const merged = isObjective(owner) ? owner[key] : undefined
    const diff = typeof diffKey === 'symbol' ? undefined : this.record(owner)?.[String(diffKey)]
    let beforePresent = context.before && merged !== undefined
    let afterPresent = context.after && merged !== undefined
    let before = merged
    if (diff && isDiffAdd(diff)) {
      beforePresent = false
    }
    if (diff && isDiffRemove(diff)) {
      afterPresent = false
    }
    if (diff && isDiffReplace(diff)) {
      before = diff.beforeValue
      beforePresent = context.before && before !== undefined
    }
    return {
      beforePresent,
      afterPresent,
      before: beforePresent ? before : undefined,
      after: afterPresent ? merged : undefined,
      diff,
    }
  }

  public childContext(field: FieldSides): SideContext {
    return { before: field.beforePresent, after: field.afterPresent }
  }

  /** Diff between two shown values: none when equal, else add / remove / replace. */
  public diffShownValues(
    before: unknown,
    after: unknown,
    causes: readonly (Diff | undefined)[],
  ): Diff | undefined {
    const beforeShown = before !== undefined
    const afterShown = after !== undefined
    if (!beforeShown && !afterShown) {
      return undefined
    }
    if (beforeShown && afterShown && SideReader.deepEqual(before, after)) {
      return undefined
    }
    if (!beforeShown) {
      return this.createDiff(DiffAction.add, { afterValue: after }, causes)
    }
    if (!afterShown) {
      return this.createDiff(DiffAction.remove, { beforeValue: before }, causes)
    }
    return this.createDiff(DiffAction.replace, { beforeValue: before, afterValue: after }, causes)
  }

  /** Synthetic whole add / remove when presence flips; `undefined` otherwise. */
  public diffPresence(
    presence: SideContext,
    value: unknown,
    causes: readonly (Diff | undefined)[],
  ): Diff | undefined {
    if (presence.before === presence.after) {
      return undefined
    }
    return presence.after
      ? this.createDiff(DiffAction.add, { afterValue: value }, causes)
      : this.createDiff(DiffAction.remove, { beforeValue: value }, causes)
  }

  public createDiff(
    action: typeof DiffAction.add | typeof DiffAction.remove | typeof DiffAction.replace,
    values: { beforeValue?: unknown, afterValue?: unknown },
    causes: readonly (Diff | undefined)[],
  ): Diff {
    const contributing = causes.filter((cause): cause is Diff => cause !== undefined)
    const type: DiffType = DiffTypeOrder.strongestDiff(...contributing)?.type ?? 'annotation'
    const beforeDeclarationPaths: JsonPath[] = contributing.flatMap(cause => 'beforeDeclarationPaths' in cause ? cause.beforeDeclarationPaths : [])
    const afterDeclarationPaths: JsonPath[] = contributing.flatMap(cause => 'afterDeclarationPaths' in cause ? cause.afterDeclarationPaths : [])
    switch (action) {
      case DiffAction.add:
        return { type, scope: SYNTHETIC_DIFF_SCOPE, action, afterValue: values.afterValue, afterDeclarationPaths }
      case DiffAction.remove:
        return { type, scope: SYNTHETIC_DIFF_SCOPE, action, beforeValue: values.beforeValue, beforeDeclarationPaths }
      case DiffAction.replace:
        return {
          type,
          scope: SYNTHETIC_DIFF_SCOPE,
          action,
          beforeValue: values.beforeValue,
          afterValue: values.afterValue,
          beforeDeclarationPaths,
          afterDeclarationPaths,
        }
    }
  }

  /** Every diff below `value` (own records included); cycle-safe. */
  public collectDiffs(value: unknown, result: Diff[] = [], visited: Set<object> = new Set()): Diff[] {
    if (!isObjective(value) || visited.has(value)) {
      return result
    }
    visited.add(value)
    for (const diff of Object.values(this.record(value) ?? {})) {
      if (diff) {
        result.push(diff)
      }
    }
    for (const nested of Object.values(value)) {
      this.collectDiffs(nested, result, visited)
    }
    return result
  }

  /** Writes a diff into `owner`'s own record (a fresh record object - raw records are never mutated). */
  public writeDiff(owner: object, key: string, diff: Diff | undefined): void {
    if (!diff) {
      return
    }
    Reflect.set(owner, this.diffsMetaKey, { ...(this.record(owner) ?? {}), [key]: diff })
  }

  public writeRecord(owner: object, record: DiffsRecord | undefined): void {
    if (!record || Object.keys(record).length === 0) {
      return
    }
    Reflect.set(owner, this.diffsMetaKey, { ...(this.record(owner) ?? {}), ...record })
  }

  /** Replaces `key` of `owner`'s record with `diff`, or drops it when `diff` is absent (a fresh record object). */
  public replaceRecordEntry(owner: object, key: string, diff: Diff | undefined): void {
    const record: DiffsRecord = { ...(this.record(owner) ?? {}) }
    delete record[key]
    if (diff) {
      record[key] = diff
    }
    Reflect.set(owner, this.diffsMetaKey, record)
  }

  /**
   * Row of a selector: one synthetic `replace` under `key` of `target` when any option diff of
   * `options` is an option change (`isOptionChange`), typed by the strongest of them.
   */
  public writeOptionsDiff(target: DiffsRecord, key: string, options: DiffsRecord, isOptionChange: (diff: Diff | undefined) => boolean): void {
    const optionDiffs = Object.values(options).filter(isOptionChange)
    if (optionDiffs.length > 0) {
      target[key] = this.createDiff(DiffAction.replace, {}, optionDiffs)
    }
  }

  public static isWholeChange(diff: Diff | undefined): boolean {
    return diff !== undefined && (isDiffAdd(diff) || isDiffRemove(diff))
  }

  public static isRename(diff: Diff | undefined): boolean {
    return diff !== undefined && isDiffRename(diff)
  }

  /** A keyed entry wholly added / removed or renamed (a selector option change). */
  public static isWholeChangeOrRename(diff: Diff | undefined): diff is Diff {
    return SideReader.isWholeChange(diff) || SideReader.isRename(diff)
  }

  /**
   * Boolean flags that default to `false` (OpenAPI `deprecated`, `required` after api-unifier): a diff
   * may report `false -> true` although one document omits the key (E5). Normalized to add (became
   * true) / remove (became false); no diff when the effective value is unchanged.
   */
  public normalizeFlagDiff(field: FieldSides): Diff | undefined {
    const { diff } = field
    if (!diff || !(isDiffAdd(diff) || isDiffRemove(diff) || isDiffReplace(diff))) {
      return undefined
    }
    const before = field.before === true
    const after = field.after === true
    if (before === after) {
      return undefined
    }
    return after
      ? this.createDiff(DiffAction.add, { afterValue: true }, [diff])
      : this.createDiff(DiffAction.remove, { beforeValue: true }, [diff])
  }

  public static deepEqual(a: unknown, b: unknown, visited: WeakMap<object, object> = new WeakMap()): boolean {
    if (Object.is(a, b)) {
      return true
    }
    if (!isObjective(a) || !isObjective(b) || isArray(a) !== isArray(b)) {
      return false
    }
    if (visited.get(a) === b) {
      return true
    }
    visited.set(a, b)
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)
    if (keysA.length !== keysB.length) {
      return false
    }
    return keysA.every(key => Object.prototype.hasOwnProperty.call(b, key) && SideReader.deepEqual(a[key], b[key], visited))
  }
}
