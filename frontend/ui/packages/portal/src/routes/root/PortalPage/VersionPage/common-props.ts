import type { ChangesTooltipCategory } from '@netcracker/qubership-apihub-ui-shared/components/ChangesTooltip'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import type { ContractType } from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'

export type ComparisonChangeSeverityFiltersProps = {
  category?: ChangesTooltipCategory
  apiType: ApiType | ContractType | undefined
}
