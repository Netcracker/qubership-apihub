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

import type { RefObject } from 'react'
import { useCallback, useEffect } from 'react'
import { debounce } from '@mui/material'

const WAITING_DEBOUNCE = 50

export function useResizeObserver(
  ref: RefObject<HTMLDivElement>,
  resizeContainerWidth: (width: number) => void,
): void {
  const onResize = useCallback((entries: ResizeObserverEntry[]) => {
    const [firstEntry] = entries
    const width = firstEntry.target.clientWidth
    width && resizeContainerWidth(width)
  }, [resizeContainerWidth])

  useEffect(() => {
    const observer = new ResizeObserver(debounce(onResize, WAITING_DEBOUNCE))
    if (observer && ref.current) {
      observer.observe(ref.current)
    }
    return () => {
      if (observer) {
        observer.disconnect()
      }
    }
  }, [onResize, ref])
}
