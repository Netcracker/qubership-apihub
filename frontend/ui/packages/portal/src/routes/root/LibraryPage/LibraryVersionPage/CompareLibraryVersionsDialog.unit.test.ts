import type { LibraryVersion } from '@portal/entities/libraries'

import { getPreviousLibraryVersion } from './javaapi/java-api'
import { getLibraryComparisonDefaultVersion } from './libraryVersionOptions'

const VERSION: LibraryVersion = {
  libraryId: 'current-library',
  version: '2.0',
  previousVersion: '1.0',
  status: 'release',
  labels: [],
}

const VERSIONS = ['2.0', '1.5', '1.0'].map(version => ({ ...VERSION, version }))

describe('library comparison defaults', () => {
  it.each([
    ['previousLibraryId=other-library&previousVersion=1.5', '1.5'],
    ['', '1.0'],
    ['previousLibraryId=other-library&previousVersion=2.0', '2.0'],
    ['previousVersion=missing', '1.5'],
    ['previousVersion=2.0', '1.5'],
  ])('selects a valid previous version for %s', (search, expected) => {
    expect(
      getLibraryComparisonDefaultVersion(VERSION, VERSIONS, getPreviousLibraryVersion(new URLSearchParams(search)))
        ?.version,
    ).toBe(expected)
  })

  it('leaves the previous version empty if only the current version is published', () => {
    expect(getLibraryComparisonDefaultVersion(VERSION, [VERSION], {})).toBeUndefined()
  })
})
