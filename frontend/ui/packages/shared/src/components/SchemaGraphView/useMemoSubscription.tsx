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

import { useCallback, useEffect, useRef } from 'react'
import type { ClassViewComponent, RichHTMLElementEventMap } from '@netcracker/qubership-apihub-class-view'
import type { SchemaGraphMeta } from './schema-graph-content'

type EventTypeMap = RichHTMLElementEventMap<SchemaGraphMeta>

export function useMemoSubscription<R, E extends keyof EventTypeMap>(
  view: ClassViewComponent<SchemaGraphMeta>,
  eventType: E,
  handler: (value: R) => void,
  transformer: (event: EventTypeMap[E]) => R,
  blocker?: (event: EventTypeMap[E]) => boolean,
): void {
  const selectionHandler = useCallback(
    (event: EventTypeMap[E]): void => {
      if (blocker?.(event)) {
        event.preventDefault()
        return
      }

      const value = transformer(event)
      handler(value)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handler],
  )

  const listenerRef = useRef<(event: EventTypeMap[E]) => void>(selectionHandler)

  useEffect(() => {
    const newListener = selectionHandler
    view.removeEventListener(eventType, listenerRef.current)
    listenerRef.current = newListener
    view.addEventListener(eventType, newListener)

    return () => view.removeEventListener(eventType, listenerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, selectionHandler])
}
