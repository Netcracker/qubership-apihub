import { type RefObject, useCallback, useEffect, useLayoutEffect, useState } from 'react'

import { isComposerMultilineLayout, readComposerActionReservePx } from './composerMultilineLayout'

export function useComposerMultilineLayout(
  shellRef: RefObject<HTMLDivElement | null>,
  inputRef: RefObject<HTMLTextAreaElement | null>,
  draft: string,
  resetKey: string,
): boolean {
  const [multilineLayout, setMultilineLayout] = useState(false)

  useEffect(() => {
    setMultilineLayout(false)
  }, [resetKey])

  const syncMultilineLayout = useCallback((): void => {
    const textarea = inputRef.current
    const shell = shellRef.current
    if (!textarea || !shell) {
      return
    }
    const actionReservePx = readComposerActionReservePx(shell)
    const next = isComposerMultilineLayout(textarea, draft, actionReservePx)
    setMultilineLayout((prev) => (prev === next ? prev : next))
  }, [draft, inputRef, shellRef])

  useLayoutEffect(() => {
    syncMultilineLayout()
  }, [syncMultilineLayout])

  useEffect(() => {
    const shell = shellRef.current
    if (!shell) {
      return
    }
    const observer = new ResizeObserver(syncMultilineLayout)
    observer.observe(shell)
    return () => {
      observer.disconnect()
    }
  }, [shellRef, syncMultilineLayout])

  return multilineLayout
}
