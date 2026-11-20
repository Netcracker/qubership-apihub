import { FC, memo, PropsWithChildren, useEffect, useMemo, useState } from 'react'
import { AsyncLevelContext, AsyncLevelContextValue } from './AsyncLevelContext'

type ProviderProps = PropsWithChildren & AsyncLevelContextValue

export const AsyncLevelContextProvider: FC<ProviderProps> = memo<ProviderProps>((props) => {
  const { beforeLevel, afterLevel, children } = props
  const [beforeLevelState, setBeforeLevelState] = useState(0)
  const [afterLevelState, setAfterLevelState] = useState(0)
  useEffect(() => {
    setBeforeLevelState(beforeLevel)
    setAfterLevelState(afterLevel)
  }, [beforeLevel, afterLevel])
  const asyncLevelContextValue = useMemo(() => ({
    beforeLevel: beforeLevelState,
    afterLevel: afterLevelState
  }), [beforeLevelState, afterLevelState])
  return (
    <AsyncLevelContext.Provider value={asyncLevelContextValue}>
      {children}
    </AsyncLevelContext.Provider>
  )
})
