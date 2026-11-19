import { Toggler } from '@netcracker/qubership-apihub-ui-shared/components/Toggler'
import type { OperationViewMode } from '@netcracker/qubership-apihub-ui-shared/entities/operation-view-mode'
import type { FC } from 'react'
import { memo, useCallback } from 'react'
import { useOperationViewMode } from './useOperationViewMode'

type OperationViewModeSelectorProps = {
  modes: ReadonlyArray<OperationViewMode>
  defaultValue?: OperationViewMode
}

export const OperationViewModeSelector: FC<OperationViewModeSelectorProps> = memo<OperationViewModeSelectorProps>(props => {
  const { modes, defaultValue } = props
  const { mode, setMode } = useOperationViewMode(defaultValue)
  const handleMode = useCallback((mode: OperationViewMode) => setMode(mode), [setMode])

  return <Toggler<OperationViewMode> mode={mode} modes={modes} onChange={handleMode} />
})
