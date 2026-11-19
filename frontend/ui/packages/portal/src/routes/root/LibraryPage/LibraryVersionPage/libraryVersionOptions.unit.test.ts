import {
  DRAFT_VERSION_STATUS,
  RELEASE_VERSION_STATUS,
} from '@netcracker/qubership-apihub-ui-shared/entities/version-status'

import type { LibraryVersion } from '@portal/entities/libraries'

import { selectLibraryVersions } from './libraryVersionOptions'

const versions: LibraryVersion[] = [
  {
    libraryId: 'lib',
    version: '1.2',
    status: RELEASE_VERSION_STATUS,
    labels: ['Stable'],
    createdBy: 'Alice',
    createdAt: '2026-10-02T00:00:00Z',
  },
  { libraryId: 'lib', version: '1.10', status: RELEASE_VERSION_STATUS, labels: [] },
  { libraryId: 'lib', version: '3', status: DRAFT_VERSION_STATUS, labels: [], createdAt: '2026-10-01T00:00:00Z' },
  { libraryId: 'lib', version: '2', status: DRAFT_VERSION_STATUS, labels: [], createdAt: '2026-10-02T00:00:00Z' },
  { libraryId: 'lib', version: '4', status: DRAFT_VERSION_STATUS, labels: [] },
]

describe('library version options', () => {
  it('filters by status and searches versions and labels without case sensitivity', () => {
    expect(selectLibraryVersions(versions, RELEASE_VERSION_STATUS, 'sTaBlE')).toEqual([versions[0]])
    expect(selectLibraryVersions(versions, RELEASE_VERSION_STATUS, '1.10')).toEqual([versions[1]])
    expect(selectLibraryVersions(versions, DRAFT_VERSION_STATUS, 'Stable')).toEqual([])
  })

  it('sorts releases by descending version and drafts by newest publication with undated drafts last', () => {
    expect(selectLibraryVersions(versions, RELEASE_VERSION_STATUS, '').map(item => item.version)).toEqual([
      '1.10',
      '1.2',
    ])
    expect(selectLibraryVersions(versions, DRAFT_VERSION_STATUS, '').map(item => item.version)).toEqual(['2', '3', '4'])
    expect(versions.map(item => item.version)).toEqual(['1.2', '1.10', '3', '2', '4'])
  })
})
