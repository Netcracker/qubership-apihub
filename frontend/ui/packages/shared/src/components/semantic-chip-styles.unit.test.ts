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

import type { SemanticChipColor } from './semantic-chip-styles'
import { semanticChipSx } from './semantic-chip-styles'

const COLOR: SemanticChipColor = { main: '#D0FAD4', contrastText: '#026104' }

describe('semanticChipSx', () => {
  it('paints a filled chip with the background and contrast text', () => {
    expect(semanticChipSx(COLOR)).toEqual({
      backgroundColor: '#D0FAD4',
      color: '#026104',
    })
  })

  it('paints an outlined chip with a coloured border', () => {
    expect(semanticChipSx(COLOR, 'outlined')).toEqual({
      color: '#D0FAD4',
      border: expect.stringContaining('1px solid'),
    })
  })

  // Regression: colour tables are Record<DomainUnion, SemanticChipColor>, but the key comes
  // from the API as a plain string. A value outside the union (e.g. the linter returning
  // 'Active' where the union says 'active') makes the lookup undefined. This used to throw
  // "Cannot destructure property 'main' of 'undefined'", and since chips render deep inside
  // pages the error boundary replaced the entire screen.
  it('falls back to default styling instead of throwing when the colour is missing', () => {
    const missing = ({ inactive: COLOR } as Record<string, SemanticChipColor>)['Active']

    expect(() => semanticChipSx(missing)).not.toThrow()
    expect(semanticChipSx(missing)).toEqual({})
    expect(semanticChipSx(missing, 'outlined')).toEqual({})
  })

  // The operation chips build `{ main: color, contrastText: color }` from a map lookup, so
  // an unknown method/type yields a defined object with an undefined `main`.
  it('falls back to default styling when the colour object has no main', () => {
    const undefinedColor = undefined as unknown as string

    expect(semanticChipSx({ main: undefinedColor, contrastText: undefinedColor })).toEqual({})
  })
})
