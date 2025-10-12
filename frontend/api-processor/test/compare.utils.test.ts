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

import { removeRedundantPartialPairs } from '../src/components/compare/compare.utils'

describe('removeRedundantPartialPairs', () => {
  test('should return empty array when input is empty', () => {
    const result = removeRedundantPartialPairs([])
    expect(result).toEqual([])
  })

  test('should keep all complete pairs when no partial pairs exist', () => {
    const objA = { id: 'A' }
    const objB = { id: 'B' }
    const objC = { id: 'C' }
    const objD = { id: 'D' }

    const input: [object, object][] = [
      [objA, objB],
      [objC, objD],
    ]

    const result = removeRedundantPartialPairs(input)
    expect(result).toEqual(input)
  })

  test('should keep all partial pairs when no complete pairs exist', () => {
    const objA = { id: 'A' }
    const objB = { id: 'B' }
    const objC = { id: 'C' }

    const input: [object | undefined, object | undefined][] = [
      [objA, undefined],
      [undefined, objB],
      [objC, undefined],
    ]

    const result = removeRedundantPartialPairs(input)
    expect(result).toEqual(input)
  })

  test('should remove partial pair when complete pair exists with same value at position 1 (right)', () => {
    const objA = { id: 'A' }
    const objB = { id: 'B' }

    const input: [object | undefined, object | undefined][] = [
      [objA, objB],          // Complete pair
      [undefined, objB],     // Partial pair - should be removed (objB exists in complete pair)
    ]

    const result = removeRedundantPartialPairs(input)
    expect(result).toEqual([[objA, objB]])
    expect(result).toHaveLength(1)
  })

  test('should remove partial pair when complete pair exists with same value at position 0 (left)', () => {
    const objA = { id: 'A' }
    const objB = { id: 'B' }

    const input: [object | undefined, object | undefined][] = [
      [objA, objB],          // Complete pair
      [objA, undefined],     // Partial pair - should be removed (objA exists in complete pair)
    ]

    const result = removeRedundantPartialPairs(input)
    expect(result).toEqual([[objA, objB]])
    expect(result).toHaveLength(1)
  })

  test('should keep partial pair when complete pair exists but with different values', () => {
    const objA = { id: 'A' }
    const objB = { id: 'B' }
    const objC = { id: 'C' }

    const input: [object | undefined, object | undefined][] = [
      [objA, objB],          // Complete pair
      [undefined, objC],     // Partial pair - should be kept (objC not in any complete pair at position 1)
    ]

    const result = removeRedundantPartialPairs(input)
    expect(result).toEqual(input)
    expect(result).toHaveLength(2)
  })

  test('should handle multiple complete pairs with overlapping values', () => {
    const objA = { id: 'A' }
    const objB = { id: 'B' }
    const objC = { id: 'C' }
    const objD = { id: 'D' }

    const input: [object | undefined, object | undefined][] = [
      [objA, objB],          // Complete pair 1
      [objC, objD],          // Complete pair 2
      [objA, undefined],     // Partial - should be removed (objA at position 0 in complete pair 1)
      [undefined, objD],     // Partial - should be removed (objD at position 1 in complete pair 2)
    ]

    const result = removeRedundantPartialPairs(input)
    expect(result).toEqual([
      [objA, objB],
      [objC, objD],
    ])
    expect(result).toHaveLength(2)
  })

  test('should handle complex scenario with mixed complete and partial pairs', () => {
    const objA = { id: 'A' }
    const objB = { id: 'B' }
    const objC = { id: 'C' }
    const objD = { id: 'D' }
    const objE = { id: 'E' }
    const objF = { id: 'F' }

    const input: [object | undefined, object | undefined][] = [
      [objA, objB],          // Complete pair 1
      [objC, objD],          // Complete pair 2
      [objA, undefined],     // Partial - should be removed (objA in complete pair 1)
      [undefined, objB],     // Partial - should be removed (objB in complete pair 1)
      [undefined, objE],     // Partial - should be kept (objE not in any complete pair)
      [objF, undefined],     // Partial - should be kept (objF not in any complete pair)
      [objC, undefined],     // Partial - should be removed (objC in complete pair 2)
    ]

    const result = removeRedundantPartialPairs(input)
    expect(result).toEqual([
      [objA, objB],
      [objC, objD],
      [undefined, objE],
      [objF, undefined],
    ])
    expect(result).toHaveLength(4)
  })

  test('should handle single complete pair with multiple redundant partial pairs', () => {
    const objA = { id: 'A' }
    const objB = { id: 'B' }

    const input: [object | undefined, object | undefined][] = [
      [objA, objB],          // Complete pair
      [objA, undefined],     // Redundant partial
      [undefined, objB],     // Redundant partial
      [objA, undefined],     // Another redundant partial (duplicate)
    ]

    const result = removeRedundantPartialPairs(input)
    expect(result).toEqual([[objA, objB]])
    expect(result).toHaveLength(1)
  })

  test('should handle pairs where same object appears at different positions in different pairs', () => {
    const objA = { id: 'A' }
    const objB = { id: 'B' }

    const input: [object | undefined, object | undefined][] = [
      [objA, objB],          // Complete pair: objA at position 0, objB at position 1
      [objB, objA],          // Complete pair: objB at position 0, objA at position 1
      [objA, undefined],     // Partial - should be removed (objA at position 0 in first complete pair)
      [undefined, objA],     // Partial - should be removed (objA at position 1 in second complete pair)
      [objB, undefined],     // Partial - should be removed (objB at position 0 in second complete pair)
      [undefined, objB],     // Partial - should be removed (objB at position 1 in first complete pair)
    ]

    const result = removeRedundantPartialPairs(input)
    expect(result).toEqual([
      [objA, objB],
      [objB, objA],
    ])
    expect(result).toHaveLength(2)
  })
})

