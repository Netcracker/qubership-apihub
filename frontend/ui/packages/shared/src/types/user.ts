import type { Url } from './url'
import type { Key } from '../entities/keys'

export type Users = Readonly<{
  users: User[]
}>

export type UsersDto = Readonly<{
  users: UserDto[]
}>

export type User = Omit<UserDto, 'id' | 'gitIntegrationStatus'> & {
  key: Key
  name: string
  gitlabIntegration: boolean
}

export type UserDto = Readonly<{
  id: Key
  name?: string
  email?: string
  avatarUrl?: Url
  gitIntegrationStatus: boolean
  systemRole: string
  accessTokenTTLSeconds: number | null
}>

// TODO: Think about new place for this converter
export function toUser(value: UserDto): User {
  return {
    key: value.id,
    name: value?.name ?? DEFAULT_USER_NAME,
    email: value?.email,
    avatarUrl: value?.avatarUrl,
    gitlabIntegration: value?.gitIntegrationStatus,
    systemRole: value?.systemRole,
    accessTokenTTLSeconds: value?.accessTokenTTLSeconds,
  }
}

export function toUsers(value: UsersDto): Users {
  return { users: value?.users.map(user => toUser(user)) }
}

export const EMPTY_USER: User = {
  key: '',
  name: '',
  avatarUrl: '',
  gitlabIntegration: false,
  systemRole: '',
  accessTokenTTLSeconds: 60,
}

export const DEFAULT_USER_NAME = 'Unnamed User'
