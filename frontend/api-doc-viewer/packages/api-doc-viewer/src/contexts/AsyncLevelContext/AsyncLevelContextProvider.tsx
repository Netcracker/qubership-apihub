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
