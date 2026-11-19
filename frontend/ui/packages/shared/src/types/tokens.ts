import type { User } from './user'
import type { Key } from '../entities/keys'

export type Tokens = SystemToken[]

export type SystemTokensDto = Readonly<{
  apiKeys: SystemTokenDto[]
}>

export type SystemToken = {
  apiKey?: Key
  key: Key
  packageKey: Key
  name: string
  createdAt: string
  createdBy: User
  createdFor: User
  roles: string[]
}

export type SystemTokenDto = Readonly<{
  apiKey?: Key
  id: Key
  packageId: Key
  name: string
  createdAt: string
  createdBy: User
  createdFor: User
  roles: string[]
}>

export type DeleteApiKeyData = {
  key: Key
  packageKey: Key
}

export type TokenDataForm = Readonly<{
  name: string
  roles?: string[]
  createdFor: User
}>

export type GenerateApiKeyValue = Readonly<{
  name: string
  roles?: string[]
  createdFor: string
}>

export type GenerateApiKeyData = {
  value: GenerateApiKeyValue
  packageKey?: Key
}

export type DeleteApiKey = (data: DeleteApiKeyData) => void

export type GenerateApiKey = (data: GenerateApiKeyData) => void

// Personal Access Tokens

export type GeneratePersonalAccessTokenData = Readonly<{
  name: string
  daysUntilExpiry: number
}>

export type GeneratePersonalAccessTokenCallback = (data: GeneratePersonalAccessTokenData) => void

export type DeletePersonalAccessTokenCallback = (id: Key) => void

export const PERSONAL_ACCESS_TOKEN_STATUS_ACTIVE = 'active'
export const PERSONAL_ACCESS_TOKEN_STATUS_EXPIRED = 'expired'
export type PersonalAccessTokenStatus =
  | typeof PERSONAL_ACCESS_TOKEN_STATUS_ACTIVE
  | typeof PERSONAL_ACCESS_TOKEN_STATUS_EXPIRED

export type PersonalAccessTokenDto = Readonly<{
  id: Key
  name: string
  expiresAt: string // date-time
  createdAt: string // date-time
  status: PersonalAccessTokenStatus
  token: string
}>

export type PersonalAccessTokensDto = PersonalAccessTokenDto[]

export type PersonalAccessToken = PersonalAccessTokenDto

export type PersonalAccessTokens = PersonalAccessToken[]
