import { useRef } from 'react'
import type { OriginalDocumentFileFormat } from '../types'
import { transformRawDocumentByFormat } from './transformers'

const cache: Map<OriginalDocumentFileFormat, string> = new Map()

/**
 * Hook with custom memoization.
 *
 * Native memoization ignores huge values in dependencies array if they are primitive.
 * In our case, `value` is a raw specification which can contain THOUSANDS of tokens.
 *
 * So, custom solution is based on 2 points:
 * 1. Use `useRef` to store the raw specification value and compare it with the new value.
 * 2. Use `cache (Map)` to store the transformed value for each format.
 *
 * @param value - Raw specification in the original format
 * @param format - Necessary format of the specification
 * @returns Specification in the necessary format
 */
export function useTransformedRawDocumentByFormat(
  value: string,
  format: OriginalDocumentFileFormat,
): string {
  const valueRef = useRef<string | null>(value)
  if (valueRef.current !== value) {
    valueRef.current = value
    cache.clear()
  }
  if (!cache.has(format)) {
    cache.set(format, transformRawDocumentByFormat(valueRef.current, format))
  }
  return cache.get(format)!
}
