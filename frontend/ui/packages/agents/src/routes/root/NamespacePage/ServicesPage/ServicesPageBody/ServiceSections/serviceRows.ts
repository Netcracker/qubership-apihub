import type { PackageKey, ServiceKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { isEmpty, isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'

import { getFormattedLabel, type ServiceLabels } from '@agents/entities/services'

type SearchableService = Readonly<{
  key: ServiceKey
  baseline?: Readonly<{ name: string; packageKey: PackageKey }>
  labels?: ServiceLabels
}>

type SearchableServiceRow = Partial<
  Readonly<{
    service: SearchableService
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
 * Returns the rows that match the search value in any letter case. A row matches when the value is part of its service
 * name, the name or the id of its baseline package, or one of its labels as `key: value`. An empty search returns
 * `rows` itself.
 */
export function filterRowsBySearch<TRow extends SearchableServiceRow>(rows: TRow[], searchValue: string): TRow[] {
  if (!searchValue) {
    return rows
  }
  const query = searchValue.toLowerCase()
  return rows.filter(({ service }) =>
    !!service && searchableTextsOf(service).some(text => text.toLowerCase().includes(query)),
  )
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

function searchableTextsOf({ key, baseline, labels }: SearchableService): string[] {
  return [
    key,
    ...(baseline ? [baseline.name, baseline.packageKey] : []),
    ...Object.entries(labels ?? {}).map(([labelKey, value]) => getFormattedLabel(labelKey, value)),
  ]
}
