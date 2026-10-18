import { isDefined } from '@apihub/utils/common/checkers'
import { DdlApiColumnRowValue } from '@netcracker/qubership-apihub-next-data-model/model/ddlapi/tree/node-value'

export function hasDdlColumnAdditionalInfoRows(
  value: DdlApiColumnRowValue | null | undefined,
): boolean {
  if (!value) {
    return false
  }

  return !!(
    isDefined(value.defaultValue)
    || isDefined(value.generatedExpression)
    || (value.enumValues && value.enumValues.length > 0)
  )
}
