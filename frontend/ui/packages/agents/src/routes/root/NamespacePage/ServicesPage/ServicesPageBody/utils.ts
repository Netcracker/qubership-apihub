import type { Service } from '@agents/entities/services'
import type { FilterFn } from '@tanstack/react-table'

type TableData = Partial<{
  service: Service
  children: TableData[]
}>

export const serviceFilter: FilterFn<TableData> = (row, columnId, value) => {
  const { service } = row.original
  if (!service) {
    // keeps the subrows
    return true
  }
  const { key, baseline, labels } = service
  if (value.filter && !value.filter(service)) {
    return false
  }
  const lowerCaseValue = value.searchValue.toLowerCase()
  return key.includes(lowerCaseValue) ||
    baseline?.name.toLowerCase().includes(lowerCaseValue) ||
    baseline?.packageKey.toLowerCase().includes(lowerCaseValue) ||
    Object.entries(labels ?? {}).some(([key, value]) => key.toLowerCase().includes(lowerCaseValue) || value.toLowerCase().includes(lowerCaseValue))
}
