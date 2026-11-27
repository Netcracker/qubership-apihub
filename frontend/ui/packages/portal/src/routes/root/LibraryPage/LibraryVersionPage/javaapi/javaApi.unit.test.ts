import type { JavaApiClassListItem } from '@netcracker/qubership-apihub-api-doc-viewer'

import {
  filterJavaClasses,
  formatMemberCounts,
  getJavaReferenceLink,
  isJavaReferenceTargetHidden,
  toLibraryClassKinds,
} from './javaApi'

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

describe('toLibraryClassKinds', () => {
  it.each(
    [
      ['CLASS', ['class', 'record']],
      ['INTERFACE', ['interface']],
      ['ENUM', ['enum']],
      ['ANNOTATION', ['annotation']],
      [undefined, undefined],
    ] as const,
  )('maps the Java type filter %s to service kinds', (javaType, expected) => {
    expect(toLibraryClassKinds(javaType)).toEqual(expected)
  })
})

describe('filterJavaClasses', () => {
  it.each(['Outer$In', 'Outer.In'])('finds an inner class with search %s', search => {
    const innerClass: JavaApiClassListItem = { ...CLASSES[0], className: 'org.example.Outer$Inner' }
    expect(filterJavaClasses([innerClass], search, undefined)).toEqual([innerClass])
  })
})

describe('Java Reference selection', () => {
  it.each(
    [
      ['CLASS', undefined],
      ['', 'CLASS'],
      ['CLASS', 'CLASS'],
    ] as const,
  )('reveals a linked type hidden by search %s and kind %s', (search, javaType) => {
    expect(isJavaReferenceTargetHidden(CLASSES[1], search, javaType)).toBe(true)
  })

  it.each([CLASSES[1], undefined])(
    'preserves filters when the target %j is visible or unavailable',
    target => {
      expect(isJavaReferenceTargetHidden(target, 'interface', 'INTERFACE')).toBe(false)
    },
  )

  it.each([
    ['INTERFACE', '?javaClass=a.B%24C&javaType=INTERFACE'],
    [undefined, '?javaClass=a.B%24C'],
  ] as const)('links a type with the type filter %s', (javaType, search) => {
    expect(getJavaReferenceLink('w.LIB', '1.0', 'a.B$C', javaType).search).toBe(search)
  })
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
