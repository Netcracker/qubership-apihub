import { Diff, DiffAction } from "@netcracker/qubership-apihub-api-diff"
import { GraphApiDirective, isGraphApiDirective, isGraphApiEnumDefinition } from "@netcracker/qubership-apihub-graphapi"
import { CrawlHookResponse, JsonPath, syncCrawl } from '@netcracker/qubership-apihub-json-crawl'
import { isDiff, isObject, setValueByPath, wasGraphApiEnumDefinition } from "../utils"

type GraphApiFragmentWithDirectives = {
  directives?: Record<string, GraphApiDirective>
}

function hasGraphApiDirectives(value: unknown): value is GraphApiFragmentWithDirectives {
  return (
    isObject(value) &&
    'directives' in value &&
    Object.values(value.directives ?? {})
      .filter(Boolean)
      .every(isGraphApiDirective)
  )
}

export function resolveEnumValues(value: unknown, valueDiffs?: unknown) {
  const newEnumValues: Record<PropertyKey, unknown> = {}
  if (wasGraphApiEnumDefinition(valueDiffs)) {
    Object.entries(valueDiffs.type.beforeValue.values ?? {}).forEach(([enumKey, enumValue]) => {
      newEnumValues[enumKey] = { ...enumValue, ...resolveDirectiveDeprecated(enumValue) }
    })
    return { values: newEnumValues }
  }
  if (isGraphApiEnumDefinition(value)) {
    Object.entries(value.type.values ?? {}).forEach(([enumKey, enumValue]) => {
      newEnumValues[enumKey] = { ...enumValue, ...resolveDirectiveDeprecated(enumValue) }
    })
    return { values: newEnumValues }
  }
  return {}
}

export function resolveDirectiveDeprecated(value: unknown) {
  if (!hasGraphApiDirectives(value)) { return {} }
  const directives = value.directives
  const { deprecated, ...otherDirectives } = directives ?? {}
  const deprecationReason: string | undefined = deprecated?.meta?.reason
  if (!deprecationReason) { return {} }
  return {
    directives: otherDirectives,
    deprecationReason: deprecationReason
  }
}

const rulesForDirectiveDeprecatedChange = () => ({
  '/directives': {
    '/deprecated': {
      '/meta': {
        '/reason': { copyDiff: true }
      },
      copyDiff: true,
    }
  },
  '/values': {
    '/*': () => rulesForDirectiveDeprecatedChange()
  },
  pasteDiff: true,
})

export function transformChangesForDirectiveDeprecated(source: unknown) {
  let copiedChange: Diff | undefined
  syncCrawl<any, any>(source, ({ key, value, path, rules }) => {
    if (typeof key === 'symbol') {
      return { done: true }
    }
    if (rules?.copyDiff) {
      copiedChange = isDiff(value) ? value : undefined
      if (copiedChange && key === 'deprecated') {
        const rearrangedChange = { ...copiedChange } as Diff
        if (rearrangedChange.action === DiffAction.add) {
          const after = rearrangedChange.afterValue
          const isDirectiveAfter = isGraphApiDirective(after)
          rearrangedChange.afterValue = isDirectiveAfter ? after.meta?.reason : after
          rearrangedChange.afterNormalizedValue = rearrangedChange.afterValue
        }
        if (rearrangedChange.action === DiffAction.remove) {
          const before = rearrangedChange.beforeValue
          const isDirectiveBefore = isGraphApiDirective(before)
          rearrangedChange.beforeValue = isDirectiveBefore ? before.meta?.reason : before
          rearrangedChange.beforeNormalizedValue = rearrangedChange.beforeValue
        }
        copiedChange = rearrangedChange
      }
      return { value, done: !!copiedChange }
    }
    if (rules?.pasteDiff) {
      return {
        value,
        exitHook: () => {
          if (copiedChange) {
            setValueByPath(source, copiedChange, ...[...path, 'deprecationReason'])
          }
        }
      }
    }
    return { value }
  }, { rules: rulesForDirectiveDeprecatedChange() })
}

export function areExcludedComponents(path: JsonPath) {
  const excluded: PropertyKey[] = ['objects', 'inputObjects', 'interfaces', 'unions', 'enums']
  return path.length > 0 && path[0] === 'components' && excluded.includes(path[1])
}
