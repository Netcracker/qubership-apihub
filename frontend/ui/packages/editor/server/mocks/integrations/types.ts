import type { Key, Url } from '../../types'

export type IntegrationDto = Partial<Readonly<{
  type: 'gitlab'
  repositoryId: Key
  repositoryName: string
  repositoryUrl: Url
  defaultBranch: string
  defaultFolder: string
}>>

export type IntegrationBranchDto = Readonly<{
  name: string
}>

export type IntegrationBranchesDto = Readonly<{
  branches: ReadonlyArray<IntegrationBranchDto>
}>

export type IntegrationRepositoryDto = Readonly<{
  repositoryId: Key
  name: string
  defaultBranch: string
}>

export type IntegrationRepositoriesDto = Readonly<{
  repositories: ReadonlyArray<IntegrationRepositoryDto>
}>
