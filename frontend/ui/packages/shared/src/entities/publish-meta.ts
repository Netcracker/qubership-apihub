import type { Key } from './keys'

export type PublishMetaDto = Partial<{
  commitId: Key
  branchName: string
  repositoryUrl: string
  cloudName: string
  versionLabels: string[]
  cloudUrl: string
  namespace: string
}>

export type PublishMeta = Partial<{
  commitKey: Key
  branchName: string
  repositoryUrl: string
  versionLabels: string[]
  cloudName: string
  cloudUrl: string
  namespace: string
}>
