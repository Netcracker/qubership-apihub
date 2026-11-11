import type { LibraryMember, LibraryVersion } from './entities'

const LIBRARY_ID = 'local-library-demo'
const CURRENT_VERSION = 'feature-slsintel-20976-2026803.08456-build2'
const PREVIOUS_VERSION = 'master-20251002.125155-build144'

export function createMockLibraryContent(): {
  registryVersions: Record<string, string[]>
  members: Record<string, LibraryMember[]>
  versions: LibraryVersion[]
} {
  const versions = [
    {
      libraryId: LIBRARY_ID,
      version: CURRENT_VERSION,
      previousVersion: PREVIOUS_VERSION,
      status: 'release' as const,
      labels: ['app.kubernetes.io/part-of: Access-Control', 'catalog', 'java-api', 'mock'],
      createdAt: '2022-03-15T10:00:00.000Z',
      createdBy: 'Name Surname',
      metadata: {
        activities: [{
          id: 'published-current',
          action: 'Published version',
          createdAt: '2022-03-15T10:00:00.000Z',
          createdBy: 'Name Surname',
        }],
      },
    },
    {
      libraryId: LIBRARY_ID,
      version: PREVIOUS_VERSION,
      status: 'release' as const,
      labels: ['catalog', 'mock'],
      createdAt: '2022-03-01T10:00:00.000Z',
      createdBy: 'Name Surname',
      metadata: {
        activities: [{
          id: 'published-previous',
          action: 'Published version',
          createdAt: '2022-03-01T10:00:00.000Z',
          createdBy: 'Name Surname',
        }],
      },
    },
  ]
  const registryVersions = {
    'org.qubership:qip-catalog-library': [
      CURRENT_VERSION,
      PREVIOUS_VERSION,
      'release-sfa-2.1.0-2020803.90000-build14',
      'release-sfa-2.2.0-2026216.12170-build4',
    ],
    'com.example:test': ['1.0.0', '1.1.0', '2.0.0-SNAPSHOT'],
  }
  const members: Record<string, LibraryMember[]> = {
    'local-library-test': [{
      user: { userId: 'local-dev', name: 'Local Developer' },
      roles: [{ roleId: 'owner', role: 'Owner' }],
    }],
    [LIBRARY_ID]: [{
      user: { userId: 'local-dev', name: 'Local Developer' },
      roles: [{ roleId: 'owner', role: 'Owner' }],
    }, {
      user: { userId: 'demo-viewer', name: 'demo-viewer' },
      roles: [{
        roleId: 'viewer',
        role: 'Viewer',
        inheritedFrom: { packageId: 'DEMO', kind: 'workspace', name: 'DEMO' },
      }],
    }],
  }
  return { registryVersions, members, versions }
}
