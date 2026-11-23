export type LibraryCreate = {
  alias: string
  name: string
  language: 'java'
  repository: string
  coordinates: {
    groupId: string
    artifactId: string
    classifier?: string
  }
  parentPackageId?: string
  description?: string
  defaultRole?: string
}

export type Library = LibraryCreate & {
  libraryId: string
  coordinatesKey: string
  isFavorite: boolean
  permissions: string[]
  defaultRole: string
  createdAt: string
  createdBy: string
}

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
    buildId?: string
    buildStatus?: 'none' | 'complete' | 'error'
    buildError?: string
    activities?: { id: string; action: string; createdAt: string; createdBy: string }[]
  }
}
