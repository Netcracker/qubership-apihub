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

import type { FC } from 'react'
import { memo, useCallback } from 'react'
import { useOperationViewMode } from './useOperationViewMode'
import type { OperationViewMode } from '@netcracker/qubership-apihub-ui-shared/entities/operation-view-mode'
import type { TogglerProps } from '@netcracker/qubership-apihub-ui-shared/components/Toggler'
import { Toggler } from '@netcracker/qubership-apihub-ui-shared/components/Toggler'

type OperationViewModeSelectorProps = {
  modes: ReadonlyArray<OperationViewMode>
}

export const OperationViewModeSelector: FC<OperationViewModeSelectorProps> = memo<OperationViewModeSelectorProps>(({ modes }) => {
  const { mode, setMode } = useOperationViewMode()
  const handleMode = useCallback((mode: OperationViewMode) => setMode(mode), [setMode])

  return <ViewModeSegmentedSelector mode={mode} modes={modes} onChange={handleMode}/>
})

type ViewModeSegmentedSelectorProps = TogglerProps<OperationViewMode>
const ViewModeSegmentedSelector = Toggler as FC<ViewModeSegmentedSelectorProps>
