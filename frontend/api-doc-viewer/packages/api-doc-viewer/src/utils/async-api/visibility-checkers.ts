import { isObject } from "@apihub/next-data-model/utilities"
import { isDiffAdd, isDiffRemove, isDiffRename, isDiffReplace } from "@netcracker/qubership-apihub-api-diff"
import { NodeDiffs } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { DisplayMode } from "@netcracker/qubership-apihub-next-data-model/model/abstract/display-mode"
import { AsyncApiNodeVisibility, AsyncApiTextRowVisibility } from "@netcracker/qubership-apihub-next-data-model/model/async-api/node-visibility"
import { AsyncApiTreeNodeValueBase } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/node-value"

export function shouldBeDisplayed<V extends object = object>(
  value: V | null,
  diffs: NodeDiffs<V> | undefined,
  key: keyof V
) {
  if (!isObject(value)) {
    return false
  }
  if (!diffs) {
    return value?.[key] !== undefined
  }
  const diff = diffs[key]?.data
  if (!diff) {
    return value?.[key] !== undefined
  }
  if (isDiffRemove(diff)) {
    return diff.beforeValue !== undefined
  }
  if (isDiffAdd(diff)) {
    return diff.afterValue !== undefined
  }
  if (isDiffReplace(diff)) {
    return diff.beforeValue !== undefined || diff.afterValue !== undefined
  }
  if (isDiffRename(diff)) {
    return diff.beforeKey !== undefined || diff.afterKey !== undefined
  }
  return false
}

/**
 * Summary and description rows of an operation / message / channel / server: present when
 * `shouldBeDisplayed` (either diff side counts), hidden in `simple` display mode (annotations).
 */
export function resolveAsyncApiTextRowVisibility<V extends AsyncApiTreeNodeValueBase>(
  value: V | null,
  diffs: NodeDiffs<V> | undefined,
  displayMode: DisplayMode,
): AsyncApiTextRowVisibility {
  return AsyncApiNodeVisibility.resolveTextRows({
    summary: shouldBeDisplayed<V>(value, diffs, 'summary'),
    description: shouldBeDisplayed<V>(value, diffs, 'description'),
  }, displayMode)
}
