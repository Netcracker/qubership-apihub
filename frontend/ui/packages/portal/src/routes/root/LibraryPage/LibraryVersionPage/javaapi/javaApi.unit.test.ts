import type { JavaApiClassListItem } from '@netcracker/qubership-apihub-api-doc-viewer'

import { formatMemberCounts, getJavaReferenceClasses } from './javaApi'

const CLASSES: JavaApiClassListItem[] = (['CLASS', 'INTERFACE'] as const).map(typeKind => ({
  className: `example.${typeKind}`,
  displayName: typeKind,
  packageName: 'example',
  typeKind: typeKind,
  memberCount: 0,
  memberKindCounts: { FIELD: 0, CONSTRUCTOR: 0, METHOD: 0 },
  changeCounts: { breaking: 0, 'non-breaking': 0, annotation: 0 },
  changes: [],
  elements: [],
}))

describe('Java Reference selection', () => {
  it.each(
    [
      ['CLASS', undefined],
      ['', 'CLASS'],
      ['CLASS', 'CLASS'],
    ] as const,
  )('reveals a linked type hidden by search %s and kind %s', (search, javaType) => {
    expect(getJavaReferenceClasses(CLASSES, search, javaType, 'example.INTERFACE')).toEqual({
      classes: CLASSES,
      resetFilters: true,
    })
  })

  it.each(['example.INTERFACE', 'example.Missing', null])(
    'preserves filters when selection %s is visible or absent from the report',
    selectedName => {
      expect(getJavaReferenceClasses(CLASSES, 'interface', 'INTERFACE', selectedName)).toEqual({
        classes: [CLASSES[1]],
        resetFilters: false,
      })
    },
  )
})

describe('formatMemberCounts', () => {
  it.each([
    [{ FIELD: 2, CONSTRUCTOR: 2, METHOD: 2 }, ', ', '2 fields, 2 constructors, 2 methods'],
    [{ FIELD: 1, CONSTRUCTOR: 1, METHOD: 1 }, ' · ', '1 field · 1 constructor · 1 method'],
    [{ FIELD: 0, CONSTRUCTOR: 0, METHOD: 2 }, ', ', '2 methods'],
    [{ FIELD: 0, CONSTRUCTOR: 0, METHOD: 0 }, ' · ', '—'],
  ])('formats %j with separator %s as %s', (counts, separator, expected) => {
    expect(formatMemberCounts(counts, separator)).toBe(expected)
  })
})
