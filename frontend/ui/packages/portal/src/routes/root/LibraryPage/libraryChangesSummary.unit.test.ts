import { toChangesSummary } from './LibraryVersionPage/javaapi/javaApi'

describe('toChangesSummary', () => {
  it('defaults missing Java severities to zero and excludes other wire keys', () => {
    const summary = toChangesSummary({
      'non-breaking': 4,
      added: 2,
      changed: 3,
      deprecated: 1,
    })

    expect(summary).toEqual({
      breaking: 0,
      'non-breaking': 4,
      annotation: 0,
    })
  })

  it('returns zero counts for a comparison without changes, which has no changeCounts', () => {
    expect(toChangesSummary(undefined)).toEqual({ breaking: 0, 'non-breaking': 0, annotation: 0 })
  })
})
