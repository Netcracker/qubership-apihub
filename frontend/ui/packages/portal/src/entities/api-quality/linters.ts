import type { LinterApiType } from './linter-api-types'

export type LinterDto = Readonly<{
  linter: string
  apiTypes: LinterApiType[]
  displayName: string
  enabled: boolean
}>

export type LintersDto = readonly LinterDto[]

export type Linter = LinterDto

export type Linters = LintersDto
