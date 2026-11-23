import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { createMockLibraryContent } from './mock-content'
import type { Library, LibraryApiKey, LibraryMember, LibraryVersion } from './types'

export const PUBLIC_LIBRARY_ROLE = 'viewer'

// The mock's Node configuration cannot resolve UI entity aliases, so these mirror PackagePermission.
export const LIBRARY_PERMISSIONS = [
  'read',
  'create_and_update_package',
  'delete_package',
  'manage_draft_version',
  'manage_release_version',
  'manage_deprecated_version',
  'user_access_management',
  'access_token_management',
  'document_shareability_management',
]

// The jdiff samples of api-doc-viewer; its stories and tests read the same files
const JAVA_API_SAMPLES_DIR = join(__dirname, '../../../../../../api-doc-viewer/packages/samples/javaapi')
export const JAVA_API_REPORT_PATH = join(JAVA_API_SAMPLES_DIR, 'api-report.json')
export const JAVA_API_DIFF_PATH = join(JAVA_API_SAMPLES_DIR, 'api-diff.json')

export type LibraryStore = {
  libraries: Library[]
  libraryVersions: LibraryVersion[]
  libraryMembers: Map<string, LibraryMember[]>
  libraryApiKeys: Map<string, LibraryApiKey[]>
  registryVersions: Record<string, string[]>
  seedVersions: LibraryVersion[]
  sampleChanges: LibraryChange[]
  sampleBreakingChangesCount: number
  comparison: {
    comparisonId: string
    libraryId: string
    version: string
    previousLibraryId: string
    previousVersion: string
    changeCounts: Record<LibraryChange['severity'] | LibraryChange['changeType'], number>
    openCount: number
    noContent: boolean
  }
}

type JdiffRow = {
  className: string
  elementType: string
  member?: string
  status: string
  breaking: boolean
  changeTypes?: string[]
  semver: string
  details?: string
  binaryCompatible?: boolean
  sourceCompatible?: boolean
}
type JdiffDocument = { artifacts: { changes: JdiffRow[] }[] }

type LibraryChange = {
  changeId: string
  classId: string
  methodId?: string
  changeType: 'added' | 'removed' | 'changed' | 'deprecated'
  severity: 'breaking' | 'non-breaking' | 'annotation'
  description: string
  details: Omit<JdiffRow, 'className' | 'breaking'>
}

export function createLibraryStore(): LibraryStore {
  const mock = createMockLibraryContent()
  const sampleChanges = createChanges(JAVA_API_DIFF_PATH)
  const sampleBreakingChangesCount =
    sampleChanges.filter(change => change.details.member && change.severity === 'breaking').length
  const changeCounts = {
    breaking: 0,
    'non-breaking': 0,
    annotation: 0,
    added: 0,
    removed: 0,
    changed: 0,
    deprecated: 0,
  }
  sampleChanges.forEach(change => {
    changeCounts[change.severity]++
    changeCounts[change.changeType]++
  })
  const comparison = {
    comparisonId: 'local-library-comparison',
    libraryId: mock.versions[0].libraryId,
    version: mock.versions[0].version,
    previousLibraryId: mock.versions[1].libraryId,
    previousVersion: mock.versions[1].version,
    changeCounts: changeCounts,
    openCount: sampleChanges.length,
    noContent: sampleChanges.length === 0,
  }
  const libraryMembers = new Map(Object.entries(mock.members))
  const libraryApiKeys = new Map<string, LibraryApiKey[]>()
  const libraryVersions: LibraryVersion[] = [...mock.versions]
  const libraries: Library[] = [{
    libraryId: 'local-library-test',
    alias: 'test',
    name: 'Library (JavaAPI) test',
    language: 'java',
    repository: 'maven-local',
    coordinates: { groupId: 'com.example', artifactId: 'test' },
    coordinatesKey: 'com.example:test',
    permissions: [...LIBRARY_PERMISSIONS],
    parentPackageId: 'DEMO',
    isFavorite: false,
    defaultRole: PUBLIC_LIBRARY_ROLE,
    createdAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'local-dev',
  }, {
    libraryId: 'local-library-demo',
    alias: 'catalog',
    name: 'Library (JavaAPI) Catalog library',
    language: 'java',
    repository: 'maven-local',
    coordinates: { groupId: 'com.example', artifactId: 'example-catalog-library' },
    coordinatesKey: 'com.example:example-catalog-library',
    permissions: [...LIBRARY_PERMISSIONS],
    parentPackageId: 'DEMO',
    isFavorite: false,
    defaultRole: PUBLIC_LIBRARY_ROLE,
    description: 'Mock Java API library for local UI development',
    createdAt: '2022-03-01T10:00:00.000Z',
    createdBy: 'Name Surname',
  }]

  return {
    libraries: libraries,
    libraryVersions: libraryVersions,
    libraryMembers: libraryMembers,
    libraryApiKeys: libraryApiKeys,
    registryVersions: mock.registryVersions,
    seedVersions: mock.versions,
    sampleChanges: sampleChanges,
    sampleBreakingChangesCount: sampleBreakingChangesCount,
    comparison: comparison,
  }
}

function createChanges(path: string): LibraryChange[] {
  const document = JSON.parse(readFileSync(path, 'utf8')) as JdiffDocument
  return document.artifacts
    .flatMap(artifact => artifact.changes)
    .filter(row => row.status !== 'UNCHANGED' || !!row.changeTypes?.length)
    .map(({ className, breaking, ...details }, index): LibraryChange => {
      const { status, member, elementType, changeTypes = [] } = details
      const changeType = status === 'NEW' ? 'added' : status === 'REMOVED'
        ? 'removed'
        : changeTypes.includes('ANNOTATION_DEPRECATED_ADDED')
        ? 'deprecated'
        : 'changed'
      const severity = breaking
        ? 'breaking'
        : changeTypes.length && changeTypes.every(code => code.startsWith('ANNOTATION_'))
        ? 'annotation'
        : 'non-breaking'
      const signature = member?.slice(0, member.indexOf('(')).trim().split(' ').pop()
      const methodId = member && (elementType === 'METHOD' || elementType === 'CONSTRUCTOR')
        ? `${signature}${member.slice(member.indexOf('('))}`
        : undefined
      return {
        changeId: `sample-change-${index}`,
        classId: className,
        methodId: methodId,
        changeType: changeType,
        severity: severity,
        description: `${className}${member ? `#${member}` : ''} ${status.toLowerCase()}`,
        details: details,
      }
    })
}
