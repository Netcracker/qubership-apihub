import type { Url } from './url'
import type { Key } from '../entities/keys'

export type SystemAdminsDto = Readonly<{
  admins: SystemAdminDto[]
}>

export type SystemAdmins = SystemAdmin[]

export type SystemAdmin = Readonly<{
  key: Key
  name: string
  email?: string
  avatarUrl: Url
}>

export type SystemAdminDto = Readonly<{
  id: Key
  name: string
  email?: string
  avatarUrl: Url
}>

export type AddSystemAdmin = Readonly<{
  userId: Key
}>
