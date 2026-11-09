import type { ServiceKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { isEmpty, isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'

type NamedServiceRow = Partial<
  Readonly<{
    service: Readonly<{ key: ServiceKey }>
  }>
>

type SelectableRowState = Readonly<{
  canSelect: boolean
  isSelected: boolean
}>

type SelectAllState = Readonly<{
  checked: boolean
  indeterminate: boolean
  disabled: boolean
}>

// The search matches the name of a service only, in any letter case. Without a search the rows come back as they
// are, so the table keeps its data.
export function filterRowsByServiceName<TRow extends NamedServiceRow>(rows: TRow[], searchValue: string): TRow[] {
  if (!searchValue) {
    return rows
  }
  const query = searchValue.toLowerCase()
  return rows.filter(({ service }) => !!service?.key.toLowerCase().includes(query))
}

// The header checkbox counts the rows that can be selected. While none can, as during a publication, it is disabled
// and shows how many of the rows are selected.
export function selectAllStateOf(rows: ReadonlyArray<SelectableRowState>): SelectAllState {
  const selectableRows = rows.filter(({ canSelect }) => canSelect)
  const countedRows = isNotEmpty(selectableRows) ? selectableRows : rows
  const selectedCount = countedRows.filter(({ isSelected }) => isSelected).length
  const checked = selectedCount > 0 && selectedCount === countedRows.length
  return {
    checked: checked,
    indeterminate: selectedCount > 0 && !checked,
    disabled: isEmpty(selectableRows),
  }
}
