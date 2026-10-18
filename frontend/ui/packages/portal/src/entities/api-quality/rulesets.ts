import type { Key } from '../keys'
import type { LinterApiType } from './linter-api-types'
import type { Linter } from './linters'

export const RulesetStatuses = {
  INACTIVE: 'inactive',
  ACTIVE: 'active',
} as const
export type RulesetStatus = (typeof RulesetStatuses)[keyof typeof RulesetStatuses]

export type RulesetActivation = {
  activeFrom: string // Format: date-time
  activeTo?: string // Format: date-time
}

export type RulesetActivationHistory = {
  rulesetId: Key
  activationHistory: RulesetActivation[]
}

// Full ruleset

export type RulesetDto = Readonly<{
  id: string
  name: string
  fileName: string
  status: RulesetStatus
  apiType: LinterApiType
  linter: Linter['linter']
  createdAt: string // Format: date-time
  canBeDeleted: boolean
}>

export type Ruleset = RulesetDto

// The only main data of ruleset

export type RulesetMetadataDto = Pick<RulesetDto, 'id' | 'name' | 'fileName' | 'status' | 'apiType' | 'linter'>
export type RulesetMetadata = RulesetMetadataDto
