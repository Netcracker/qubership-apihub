import isPlainObject from 'lodash-es/isPlainObject'

import type { AiChatStreamEvent } from '../../types'
import type { SseFrame } from './sseFramer'

export function parseSseFrame(frame: SseFrame): AiChatStreamEvent | null {
  try {
    const parsed: unknown = JSON.parse(frame.data)
    if (!isJsonRecord(parsed)) {
      return null
    }
    const mergedType = String(parsed.type ?? frame.event)
    return { ...parsed, type: mergedType } as AiChatStreamEvent
  } catch {
    return null
  }
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return isPlainObject(value)
}
