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
