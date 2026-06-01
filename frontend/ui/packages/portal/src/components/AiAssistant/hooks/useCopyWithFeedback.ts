import { useCallback, useEffect, useRef, useState } from 'react'

const DEFAULT_FEEDBACK_MS = 1500

export type UseCopyWithFeedbackOptions = {
  feedbackMs?: number
  onError?: (error: unknown) => void
}

export function useCopyWithFeedback(options: UseCopyWithFeedbackOptions = {}): {
  createCopyHandler: (text: string) => () => void
  copied: boolean
} {
  const { feedbackMs = DEFAULT_FEEDBACK_MS, onError } = options
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const copy = useCallback((text: string) => {
    void (async () => {
      try {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        if (timerRef.current !== null) {
          clearTimeout(timerRef.current)
        }
        timerRef.current = setTimeout(() => {
          setCopied(false)
          timerRef.current = null
        }, feedbackMs)
      } catch (error) {
        onError?.(error)
      }
    })()
  }, [feedbackMs, onError])

  const createCopyHandler = useCallback((text: string) => {
    return () => copy(text)
  }, [copy])

  return { createCopyHandler, copied }
}
