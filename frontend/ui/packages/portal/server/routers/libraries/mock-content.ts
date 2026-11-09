import type { LibraryChange, LibraryClass, LibraryMember, LibraryVersion } from './entities'

const LIBRARY_ID = 'local-library-demo'
const CURRENT_VERSION = 'feature-slsintel-20976-2026803.08456-build2'
const PREVIOUS_VERSION = 'master-20251002.125155-build144'

export function createMockLibraryContent(): {
  registryVersions: Record<string, string[]>
  members: Record<string, LibraryMember[]>
  versions: LibraryVersion[]
  classes: LibraryClass[]
  changes: LibraryChange[]
} {
  const classes = [
    ...createTypes('class', 115),
    ...createTypes('interface', 32),
    ...createTypes('enum', 17),
  ]
  const changes: LibraryChange[] = Array.from({ length: 48 }, (_, index) => {
    const item = classes[index < 45 ? index : 112 + index - 45]
    return {
      changeId: `mock-change-${index + 1}`,
      classId: item.classId,
      methodId: index < 45 ? item.methods[0]?.methodId : undefined,
      changeType: index < 30 ? 'removed' : index < 45 ? 'changed' : 'added',
      severity: index < 45 ? 'breaking' : 'non-breaking',
      description: index < 30
        ? 'Public method removed'
        : index < 45
        ? 'Public signature changed'
        : 'Public class added',
      details: {
        qualifiedName: item.qualifiedName,
        oldSignature: index < 45 ? `${item.qualifiedName}.find(java.lang.String)` : undefined,
        newSignature: index >= 30 && index < 45 ? `${item.qualifiedName}.find(java.lang.String, boolean)` : undefined,
      },
    }
  })
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
        javaApi: { classes: 115, interfaces: 32, enums: 17 },
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
        javaApi: { classes: 112, interfaces: 32, enums: 17 },
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
  return { registryVersions, members, versions, classes, changes }
}

function createTypes(kind: LibraryClass['kind'], count: number): LibraryClass[] {
  return Array.from({ length: count }, (_, index) => {
    const simpleName = kind === 'class' && index === 0
      ? 'CatalogService'
      : `Catalog${kind[0].toUpperCase()}${kind.slice(1)}${index + 1}`
    const classId = `${kind}-${index + 1}`
    const qualifiedName = `org.qubership.catalog.${simpleName}`
    return {
      classId: classId,
      qualifiedName: qualifiedName,
      packageName: 'org.qubership.catalog',
      kind: kind,
      methods: kind === 'enum'
        ? []
        : [{
          methodId: `${classId}-find`,
          signature: `${qualifiedName}.find(java.lang.String${
            kind === 'class' && index >= 30 && index < 45 ? ', boolean' : ''
          }): java.lang.String`,
        }],
    }
  })
}
