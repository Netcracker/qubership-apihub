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

import { DiffAction, DiffAdd, DiffRemove, DiffReplace, DiffType } from '@netcracker/qubership-apihub-api-diff'
import {
  useValueRangeValidation,
  ValueRangeDiffData,
  ValueRangeInitialData,
} from '../src/components/JsonSchemaViewer/internal/validations/useValueRangeValidation'

const CHANGES_KEYS = ['lower', 'upper']
const BREAKING: DiffType = 'breaking'
const NON_BREAKING: DiffType = 'non-breaking'
const SCOPE = ''

function add(afterValue: unknown, type: DiffType = BREAKING): DiffAdd {
  return { action: DiffAction.add, type, afterValue, afterDeclarationPaths: [], scope: SCOPE }
}

function remove(beforeValue: unknown, type: DiffType = NON_BREAKING): DiffRemove {
  return { action: DiffAction.remove, type, beforeValue, beforeDeclarationPaths: [], scope: SCOPE }
}

function replace(beforeValue: unknown, afterValue: unknown, type: DiffType = BREAKING): DiffReplace {
  return { action: DiffAction.replace, type, beforeValue, afterValue, beforeDeclarationPaths: [], afterDeclarationPaths: [], scope: SCOPE }
}

function run(data: ValueRangeInitialData, changes: ValueRangeDiffData = {}) {
  // This is for testing purposes only, so we can disable the rule
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useValueRangeValidation(data, changes, CHANGES_KEYS)
}

describe('static display (no diffs)', () => {
  describe('JSON Schema Draft 07 and above numeric value bounds', () => {
    test('exclusiveMinimum only → > {value}', () => {
      const { data } = run({ exclusiveMinimum: 5 })
      expect(data.lower).toBe('> 5')
      expect(data.upper).toBeUndefined()
    })

    test('exclusiveMaximum only → < {value}', () => {
      const { data } = run({ exclusiveMaximum: 10 })
      expect(data.lower).toBeUndefined()
      expect(data.upper).toBe('< 10')
    })

    test('both numeric exclusive bounds → > {lo} and < {hi}', () => {
      const { data } = run({ exclusiveMinimum: 1, exclusiveMaximum: 9 })
      expect(data.lower).toBe('> 1')
      expect(data.upper).toBe('< 9')
    })

    test('both inclusive bounds (minimum and maximum only) → >= {lo} and <= {hi}', () => {
      const { data } = run({ minimum: 1, maximum: 100 })
      expect(data.lower).toBe('>= 1')
      expect(data.upper).toBe('<= 100')
    })

    test('minimum with exclusiveMaximum → >= {lo} and < {hi}', () => {
      const { data } = run({ minimum: 0, exclusiveMaximum: 10 })
      expect(data.lower).toBe('>= 0')
      expect(data.upper).toBe('< 10')
    })

    test('exclusiveMinimum with maximum → > {lo} and <= {hi}', () => {
      const { data } = run({ exclusiveMinimum: 3, maximum: 100 })
      expect(data.lower).toBe('> 3')
      expect(data.upper).toBe('<= 100')
    })

    test('exclusiveMinimum: 0 (zero is a valid constraint) → > 0', () => {
      const { data, visible } = run({ exclusiveMinimum: 0 })
      expect(visible).toBe(true)
      expect(data.lower).toBe('> 0')
    })

    test('exclusiveMaximum: 0 (zero is a valid constraint) → < 0', () => {
      const { data, visible } = run({ exclusiveMaximum: 0 })
      expect(visible).toBe(true)
      expect(data.upper).toBe('< 0')
    })
  })

  describe('JSON Schema Draft 04 boolean exclusive bounds', () => {
    test('exclusiveMinimum: true with minimum → > {minimum}', () => {
      const { data } = run({ exclusiveMinimum: true, minimum: 5 })
      expect(data.lower).toBe('> 5')
    })

    test('exclusiveMaximum: true with maximum → < {maximum}', () => {
      const { data } = run({ exclusiveMaximum: true, maximum: 10 })
      expect(data.upper).toBe('< 10')
    })

    test('both boolean exclusive flags with minimum 0 and maximum → > 0 and < {hi}', () => {
      const { data, visible } = run({
        exclusiveMinimum: true,
        minimum: 0,
        exclusiveMaximum: true,
        maximum: 10,
      })
      expect(visible).toBe(true)
      expect(data.lower).toBe('> 0')
      expect(data.upper).toBe('< 10')
    })

    test('exclusiveMinimum: true without minimum → not visible (flag alone has no value)', () => {
      const { visible } = run({ exclusiveMinimum: true })
      expect(visible).toBe(false)
    })

    test('exclusiveMaximum: true without maximum → not visible (flag alone has no value)', () => {
      const { visible } = run({ exclusiveMaximum: true })
      expect(visible).toBe(false)
    })

    test('both boolean exclusive flags without regular bounds → not visible', () => {
      // Regression: type: string → type: number with exclusiveMinimum/Maximum: true (no minimum/maximum)
      const { visible } = run({ exclusiveMinimum: true, exclusiveMaximum: true })
      expect(visible).toBe(false)
    })

    test('exclusiveMinimum: false (flag off) → >= {minimum}', () => {
      const { data } = run({ exclusiveMinimum: false, minimum: 5 })
      expect(data.lower).toBe('>= 5')
    })

    test('minimum only (no exclusive flag) → >= {minimum}', () => {
      const { data } = run({ minimum: 5 })
      expect(data.lower).toBe('>= 5')
    })

    test('maximum only (no exclusive flag) → <= {maximum}', () => {
      const { data } = run({ maximum: 10 })
      expect(data.upper).toBe('<= 10')
    })

    test('both regular bounds → >= {lo} and <= {hi}', () => {
      const { data } = run({ minimum: 1, maximum: 100 })
      expect(data.lower).toBe('>= 1')
      expect(data.upper).toBe('<= 100')
    })
  })

  test('no bounds → not visible', () => {
    const { visible } = run({})
    expect(visible).toBe(false)
  })

  describe('JSON Schema Draft 07 and above numeric value both minimum and exclusiveMinimum present — effective bound wins', () => {
    test('exclusiveMinimum stricter than minimum → > exclusiveMinimum', () => {
      const { data } = run({ minimum: 0, exclusiveMinimum: 5 })
      expect(data.lower).toBe('> 5')
    })

    test('minimum stricter than exclusiveMinimum → >= minimum', () => {
      const { data } = run({ minimum: 5, exclusiveMinimum: 0 })
      expect(data.lower).toBe('>= 5')
    })

    test('equal values: exclusive wins → > value', () => {
      const { data } = run({ minimum: 5, exclusiveMinimum: 5 })
      expect(data.lower).toBe('> 5')
    })

    test('exclusiveMaximum stricter than maximum → < exclusiveMaximum', () => {
      const { data } = run({ maximum: 10, exclusiveMaximum: 8 })
      expect(data.upper).toBe('< 8')
    })

    test('maximum stricter than exclusiveMaximum → <= maximum', () => {
      const { data } = run({ maximum: 8, exclusiveMaximum: 10 })
      expect(data.upper).toBe('<= 8')
    })

    test('equal upper values: exclusive wins → < value', () => {
      const { data } = run({ maximum: 10, exclusiveMaximum: 10 })
      expect(data.upper).toBe('< 10')
    })
  })
})

describe('JSON Schema Draft 07 and above numeric value diffs', () => {
  test('exclusiveMinimum value replaced → lower changes from > before to > after', () => {
    const { data, changes } = run(
      { exclusiveMinimum: 7 },
      { exclusiveMinimum: replace(5, 7) },
    )
    expect(data.lower).toBe('> 7')
    expect(changes.lower).toMatchObject({ action: DiffAction.replace, beforeValue: '> 5', afterValue: '> 7' })
  })

  test('exclusiveMaximum value replaced → upper changes from < before to < after', () => {
    const { data, changes } = run(
      { exclusiveMaximum: 8 },
      { exclusiveMaximum: replace(10, 8) },
    )
    expect(data.upper).toBe('< 8')
    expect(changes.upper).toMatchObject({ action: DiffAction.replace, beforeValue: '< 10', afterValue: '< 8' })
  })

  test('exclusiveMinimum replaced with 0 (falsy edge case) → lower changes correctly', () => {
    const { data, changes } = run(
      { exclusiveMinimum: 0 },
      { exclusiveMinimum: replace(3, 0) },
    )
    expect(data.lower).toBe('> 0')
    expect(changes.lower).toMatchObject({ action: DiffAction.replace, beforeValue: '> 3', afterValue: '> 0' })
  })

  test('exclusiveMinimum added (effective bound switches from minimum to exclusiveMinimum)', () => {
    // nodeValue after: { minimum: 1, exclusiveMinimum: 2 } — exclusiveMinimum becomes effective
    // api-diff: minimum → remove, exclusiveMinimum → add
    const { data, changes } = run(
      { minimum: 1, exclusiveMinimum: 2 },
      { minimum: remove(1), exclusiveMinimum: add(2) },
    )
    expect(data.lower).toBe('> 2')
    expect(changes.lower).toMatchObject({ action: DiffAction.replace, beforeValue: '>= 1', afterValue: '> 2' })
  })

  test('exclusiveMinimum removed (effective bound switches from exclusiveMinimum back to minimum)', () => {
    // nodeValue after: { minimum: 1, exclusiveMinimum: 0 } — minimum becomes effective again
    // api-diff: exclusiveMinimum → remove, minimum → add
    const { data, changes } = run(
      { minimum: 1, exclusiveMinimum: 0 },
      { minimum: add(1), exclusiveMinimum: replace(2, 0) },
    )
    expect(data.lower).toBe('>= 1')
    expect(changes.lower).toMatchObject({ action: DiffAction.replace, beforeValue: '> 2', afterValue: '>= 1' })
  })

  test('exclusiveMinimum added from scratch (schema gains exclusive lower bound)', () => {
    const { data, changes } = run(
      { exclusiveMinimum: 5 },
      { exclusiveMinimum: add(5) },
    )
    expect(data.lower).toBe('> 5')
    expect(changes.lower).toMatchObject({ action: DiffAction.add, afterValue: '> 5' })
  })

  test('exclusiveMinimum removed entirely (schema loses exclusive lower bound)', () => {
    // After removal the lower bound is no longer defined, but we retain the before value
    // so the UI can render it with a strikethrough — data.lower holds what was removed.
    const { data, changes } = run(
      {},
      { exclusiveMinimum: remove(5) },
    )
    expect(data.lower).toBe('> 5')
    expect(changes.lower).toMatchObject({ action: DiffAction.remove, beforeValue: '> 5' })
  })

  test('exclusiveMinimum changed, minimum stays — effective bound remains exclusive throughout', () => {
    // before: { minimum: 0, exclusiveMinimum: 5 }, after: { minimum: 0, exclusiveMinimum: 7 }
    const { data, changes } = run(
      { minimum: 0, exclusiveMinimum: 7 },
      { exclusiveMinimum: replace(5, 7) },
    )
    expect(data.lower).toBe('> 7')
    expect(changes.lower).toMatchObject({ action: DiffAction.replace, beforeValue: '> 5', afterValue: '> 7' })
  })

  test('exclusiveMinimum changed so minimum becomes effective — lower switches from > to >=', () => {
    // before: { minimum: 0, exclusiveMinimum: 5 }, after: { minimum: 0, exclusiveMinimum: -1 }
    // exclusive is now looser → minimum becomes effective
    const { data, changes } = run(
      { minimum: 0, exclusiveMinimum: -1 },
      { exclusiveMinimum: replace(5, -1) },
    )
    expect(data.lower).toBe('>= 0')
    expect(changes.lower).toMatchObject({ action: DiffAction.replace, beforeValue: '> 5', afterValue: '>= 0' })
  })

  test('both exclusive bounds change simultaneously', () => {
    const { data, changes } = run(
      { exclusiveMinimum: 2, exclusiveMaximum: 8 },
      { exclusiveMinimum: replace(1, 2), exclusiveMaximum: replace(10, 8) },
    )
    expect(data.lower).toBe('> 2')
    expect(data.upper).toBe('< 8')
    expect(changes.lower).toMatchObject({ beforeValue: '> 1', afterValue: '> 2' })
    expect(changes.upper).toMatchObject({ beforeValue: '< 10', afterValue: '< 8' })
  })
})


describe('JSON Schema Draft 04 → JSON Schema Draft 07 and above numeric value diffs (adapter converts boolean exclusive to numeric before)', () => {
  test('JSON Schema Draft 04 non-exclusive minimum → JSON Schema Draft 07 and above numeric value exclusiveMinimum (bound tightened)', () => {
    // Before JSON Schema Draft 04 (adapted): { minimum: 5 }
    // After JSON Schema Draft 07 and above numeric value: { exclusiveMinimum: 7 }
    // api-diff: minimum → remove (beforeValue: 5), exclusiveMinimum → add (afterValue: 7)
    const { data, changes } = run(
      { exclusiveMinimum: 7 },
      { minimum: remove(5), exclusiveMinimum: add(7) },
    )
    expect(data.lower).toBe('> 7')
    expect(changes.lower).toMatchObject({ action: DiffAction.replace, beforeValue: '>= 5', afterValue: '> 7' })
  })

  test('JSON Schema Draft 04 exclusive minimum → JSON Schema Draft 07 and above numeric value exclusiveMinimum with different value', () => {
    // Before JSON Schema Draft 04 (adapted): { exclusiveMinimum: 5 } (from exclusiveMinimum:true, minimum:5)
    // After JSON Schema Draft 07 and above numeric value: { exclusiveMinimum: 7 }
    // api-diff: exclusiveMinimum → replace (beforeValue: 5, afterValue: 7)
    const { data, changes } = run(
      { exclusiveMinimum: 7 },
      { exclusiveMinimum: replace(5, 7) },
    )
    expect(data.lower).toBe('> 7')
    expect(changes.lower).toMatchObject({ action: DiffAction.replace, beforeValue: '> 5', afterValue: '> 7' })
  })

  test('JSON Schema Draft 04 exclusive minimum → JSON Schema Draft 07 and above numeric value non-exclusive minimum (bound loosened)', () => {
    // Before JSON Schema Draft 04 (adapted): { exclusiveMinimum: 5 }
    // After JSON Schema Draft 07 and above numeric value: { minimum: 3 }
    // api-diff: exclusiveMinimum → remove (beforeValue: 5), minimum → add (afterValue: 3)
    const { data, changes } = run(
      { minimum: 3 },
      { exclusiveMinimum: remove(5), minimum: add(3) },
    )
    expect(data.lower).toBe('>= 3')
    expect(changes.lower).toMatchObject({ action: DiffAction.replace, beforeValue: '> 5', afterValue: '>= 3' })
  })

  test('JSON Schema Draft 04 exclusive maximum → JSON Schema Draft 07 and above numeric value exclusiveMaximum with different value', () => {
    // Before JSON Schema Draft 04 (adapted): { exclusiveMaximum: 10 }
    // After JSON Schema Draft 07 and above numeric value: { exclusiveMaximum: 8 }
    const { data, changes } = run(
      { exclusiveMaximum: 8 },
      { exclusiveMaximum: replace(10, 8) },
    )
    expect(data.upper).toBe('< 8')
    expect(changes.upper).toMatchObject({ action: DiffAction.replace, beforeValue: '< 10', afterValue: '< 8' })
  })
})

describe('JSON Schema Draft 04 diffs (boolean exclusive flag changes)', () => {
  test('exclusiveMinimum: true flag removed (minimum stays) → lower changes from > 5 to >= 5', () => {
    // nodeValue after: { minimum: 5 } — exclusiveMinimum: true was removed
    const { data, changes } = run(
      { minimum: 5 },
      { exclusiveMinimum: remove(true) },
    )
    expect(data.lower).toBe('>= 5')
    expect(changes.lower).toMatchObject({ action: DiffAction.replace, beforeValue: '> 5', afterValue: '>= 5' })
  })

  test('exclusiveMinimum: true flag added (minimum stays) → lower changes from >= 5 to > 5', () => {
    // nodeValue after: { minimum: 5, exclusiveMinimum: true }
    const { data, changes } = run(
      { minimum: 5, exclusiveMinimum: true },
      { exclusiveMinimum: add(true) },
    )
    expect(data.lower).toBe('> 5')
    expect(changes.lower).toMatchObject({ action: DiffAction.replace, beforeValue: '>= 5', afterValue: '> 5' })
  })

  test('minimum value changed with exclusiveMinimum: true → lower changes', () => {
    const { data, changes } = run(
      { minimum: 7, exclusiveMinimum: true },
      { minimum: replace(5, 7) },
    )
    expect(data.lower).toBe('> 7')
    expect(changes.lower).toMatchObject({ action: DiffAction.replace, beforeValue: '> 5', afterValue: '> 7' })
  })

  test('boolean exclusive flags added without regular bounds → no lower/upper diff', () => {
    const { visible, data, changes } = run(
      { exclusiveMinimum: true, exclusiveMaximum: true },
      { exclusiveMinimum: add(true), exclusiveMaximum: add(true) },
    )
    expect(visible).toBe(false)
    expect(data.lower).toBeUndefined()
    expect(data.upper).toBeUndefined()
    expect(changes.lower).toBeUndefined()
    expect(changes.upper).toBeUndefined()
  })

  test('minimum added alongside pre-existing boolean exclusiveMinimum: true → lower added as > {minimum}', () => {
    // Before: { exclusiveMinimum: true } — flag alone, meaningless (before-state suppressed)
    // After:  { exclusiveMinimum: true, minimum: 5 } — flag + bound, renders > 5
    const { data, changes } = run(
      { minimum: 5, exclusiveMinimum: true },
      { minimum: add(5, BREAKING) },
    )
    expect(data.lower).toBe('> 5')
    expect(changes.lower).toMatchObject({ action: DiffAction.add, afterValue: '> 5' })
  })
})

// ────────────────────────────────────────────────────────────────────────────
// changesKeys output
// ────────────────────────────────────────────────────────────────────────────

describe('changesKeys', () => {
  test('no changes → empty changesKeys', () => {
    const { changesKeys } = run({ exclusiveMinimum: 5 })
    expect(changesKeys).toEqual([])
  })

  test('lower changes → changesKeys includes "lower"', () => {
    const { changesKeys } = run(
      { exclusiveMinimum: 7 },
      { exclusiveMinimum: replace(5, 7) },
    )
    expect(changesKeys).toContain('lower')
  })

  test('upper changes → changesKeys includes "upper"', () => {
    const { changesKeys } = run(
      { exclusiveMaximum: 8 },
      { exclusiveMaximum: replace(10, 8) },
    )
    expect(changesKeys).toContain('upper')
  })
})
