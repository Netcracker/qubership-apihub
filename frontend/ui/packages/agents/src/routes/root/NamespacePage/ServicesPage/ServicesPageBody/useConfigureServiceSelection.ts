/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { RowModel, RowSelectionState } from '@tanstack/react-table'
import type { Updater } from '@tanstack/table-core'
import type { Service } from '@apihub/entities/services'
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
