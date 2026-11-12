import { isDiff } from "@netcracker/qubership-apihub-api-data-model";
import { Diff, DiffMetaRecord } from "@netcracker/qubership-apihub-api-diff";
import { diffReplace } from "../../utils/common/changes";
import { safePropertyIn } from "../../utils/common/objects";

type DeprecatedWithReason = {
  reason: string
}

export function hasDeprecationReason(
  deprecated?: boolean | Record<string, string> | DeprecatedWithReason,
  deprecatedChanges?: Diff | DiffMetaRecord,
): deprecated is DeprecatedWithReason {
  if (!deprecatedChanges || !isDiff(deprecatedChanges)) {
    return typeof deprecated !== 'boolean' && !!deprecated?.reason
  }

  return (
    typeof deprecated !== 'boolean' && !!deprecated?.reason || (
      diffReplace(deprecatedChanges) &&
      safePropertyIn(deprecatedChanges.beforeValue, 'reason', 'hasDeprecationReason') &&
      !!(deprecatedChanges.beforeValue as { reason?: string }).reason
    )
  )
}