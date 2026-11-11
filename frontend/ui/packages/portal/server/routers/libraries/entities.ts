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
    activities?: { id: string; action: string; createdAt: string; createdBy: string }[]
  }
}
