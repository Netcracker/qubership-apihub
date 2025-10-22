import { Diff, DiffAction } from "@netcracker/qubership-apihub-api-diff"
import { GraphApiDirective, isGraphApiDirective, isGraphApiEnumDefinition } from "@netcracker/qubership-apihub-graphapi"
import { JsonPath, syncCrawl } from '@netcracker/qubership-apihub-json-crawl'
import { isDiff, isObject, setValueByPath, wasGraphApiEnumDefinition } from "../utils"
import { IModelTreeNode } from "../abstract"
import { graphApiNodeKind } from "./constants"

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

export function isGraphApiOperationNode(node: IModelTreeNode<unknown, string, unknown> | undefined): boolean {
  if (!node) {
    return false
  }
  return [
    graphApiNodeKind.query,
    graphApiNodeKind.mutation,
    graphApiNodeKind.subscription
  ].some(kind => node.kind === kind)
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

/**
 * Create filter function to remove all children except the one with the given operation name.
 *
 * If operation name is not provided, we take first operation by default.
 * If operation name is provided, but there's no operation with such name, we take the first operation by default.
 *
 * @param operationName - operation name to leave only this operation in the tree
 * @returns filter function to remove all children except the one with the given operation name
 */
export function createLeaveOnlyOneOperationFilter(operationName?: string) {
  return !operationName
    ? createLeaveOnlyFirstOperationFilter()
    : createLeaveOperationByNameOrFirstOperationFilter(operationName);
}

function createLeaveOnlyFirstOperationFilter() {
  let operationSearchExecuted: boolean = false;

  let firstOperationIndex: number = -1

  return (
    node: IModelTreeNode<unknown, string, unknown>,
    index: number,
    array: IModelTreeNode<unknown, string, unknown>[]
  ) => {
    if (!isGraphApiOperationNode(node)) {
      return true;
    }


    if (!operationSearchExecuted) {
      operationSearchExecuted = true;
      for (let i = 0; i < array.length; i++) {
        const currentNode = array[i];
        if (!isGraphApiOperationNode(currentNode)) {
          continue;
        }
        firstOperationIndex = i;
        break;
      }
    }

    return index === firstOperationIndex;
  };
}

function createLeaveOperationByNameOrFirstOperationFilter(operationName: string) {
  let operationSearchExecuted: boolean = false;

  let firstOperationIndex: number = -1;
  let requiredOperationIndex: number = -1;

  return (
    node: IModelTreeNode<unknown, string, unknown>,
    index: number,
    array: IModelTreeNode<unknown, string, unknown>[]
  ) => {
    if (!isGraphApiOperationNode(node)) {
      return true;
    }

    if (!operationSearchExecuted) {
      operationSearchExecuted = true;
      for (let i = 0; i < array.length; i++) {
        const currentNode = array[i];
        if (!isGraphApiOperationNode(currentNode)) {
          continue;
        }
        if (firstOperationIndex === -1) {
          firstOperationIndex = i;
        }
        if (currentNode.key === operationName) {
          requiredOperationIndex = i;
          break;
        }
      }
    }

    return requiredOperationIndex === -1
      ? index === firstOperationIndex
      : index === requiredOperationIndex;
  };
}
