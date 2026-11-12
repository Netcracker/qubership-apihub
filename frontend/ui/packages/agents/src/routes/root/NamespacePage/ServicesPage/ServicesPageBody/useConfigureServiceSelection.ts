import type { RowModel, RowSelectionState } from '@tanstack/react-table'
import type { Updater } from '@tanstack/table-core'
import type { Service } from '@agents/entities/services'
import { useEffectOnce } from 'react-use'
import { useEffect, useMemo } from 'react'
import type { ServiceKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'

type ServiceRowModel = RowModel<Partial<{
  service: Service
}>>

const TRUE_FUNCTION = (): boolean => true

export function useConfigureServiceSelection(
  rowSelection: RowSelectionState,
  setRowSelection: (updater: Updater<RowSelectionState>) => void,
  getSelectedRowModel: () => ServiceRowModel,
  getRowModel: () => ServiceRowModel,
  selected: ServiceKey[],
  onSelect: (value: ServiceKey[]) => void,
  filter: (service?: Service) => boolean = TRUE_FUNCTION,
): ServiceKey[] {
  useEffectOnce(() => {
    const rowSelect = Object.fromEntries(
      Object.entries(getRowModel().rowsById)
        .map(([id, { original }]) =>
          [id, !!selected?.includes(original.service?.key ?? '') && filter(original.service)],
        ),
    )

    setRowSelection(rowSelect)
  })

  const selectedServiceKeys = useMemo(
    () => getSelectedRowModel().flatRows.filter(({ original: { service } }) => !!service).map(({ original: { service } }) => service!.key),
    // Refactor it. Here we need to recalculate selected services when table selection changes.
    //  Seems there are another way to find out the table selection has changed. Find it!
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rowSelection],
  )
  useEffect(() => {onSelect(selectedServiceKeys)}, [onSelect, selectedServiceKeys])

  return selectedServiceKeys
}
