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

/**
 * Returns the rows whose service name contains the search value, in any letter case. An empty search returns
 * `rows` itself.
 */
export function filterRowsByServiceName<TRow extends NamedServiceRow>(rows: TRow[], searchValue: string): TRow[] {
  if (!searchValue) {
    return rows
  }
  const query = searchValue.toLowerCase()
  return rows.filter(({ service }) => !!service?.key.toLowerCase().includes(query))
}

/**
 * Returns the state of the header checkbox from the rows that can be selected. While none can, as during a
 * publication, the checkbox is disabled and shows whether all or some of the rows are selected.
 */
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
