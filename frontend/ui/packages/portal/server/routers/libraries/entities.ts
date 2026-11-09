export type LibraryMember = {
  user: { userId: string; name: string }
  roles: {
    roleId: string
    role: string
    inheritedFrom?: { packageId: string; kind: string; name: string }
  }[]
}

export type LibraryMemberUpdate = { roleIds: string[] }

export type LibraryApiKeyCreate = {
  name: string
  roles?: string[]
  createdFor: string
}

export type LibraryApiKey = {
  id: string
  libraryId: string
  name: string
  createdAt: string
  createdBy: { id: string; name: string }
  createdFor: { id: string; name: string }
  roles: string[]
}

export type LibraryVersionPublish = {
  version: string
  previousVersion?: string
  status?: 'draft' | 'release'
  labels?: string[]
}

export type LibraryVersion = LibraryVersionPublish & {
  libraryId: string
  status: 'draft' | 'release'
  labels: string[]
  createdAt: string
  createdBy: string
  metadata?: {
    javaApi?: { classes: number; interfaces: number; enums: number }
    activities?: { id: string; action: string; createdAt: string; createdBy: string }[]
  }
}

export type LibraryClass = {
  classId: string
  qualifiedName: string
  packageName: string
  kind: 'class' | 'interface' | 'enum' | 'annotation' | 'record'
  methods: { methodId: string; signature: string }[]
}

export type LibraryChange = {
  changeId: string
  classId: string
  methodId?: string
  changeType: 'removed' | 'changed' | 'added' | 'deprecated'
  severity: 'breaking' | 'non-breaking' | 'annotation'
  description: string
  details: { qualifiedName: string; oldSignature?: string; newSignature?: string }
}

export type LibraryComparison = {
  comparisonId: string
  libraryId: string
  version: string
  previousLibraryId: string
  previousVersion: string
  changeCounts: Record<string, Record<string, number>>
  openCount: number
  noContent: boolean
  builderVersion: string
  lastActive: string
}
