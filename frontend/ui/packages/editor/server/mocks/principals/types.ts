import type { Key, Url } from '../../types'

export const USER = 'user'
export const API_KEY = 'apiKey'

type Token = Readonly<{
  type: typeof API_KEY
  id: Key
  name: string
}>

type User = Readonly<{
  type: typeof USER
  id: Key
  name?: string
  email?: string
  avatarUrl?: Url
}>


export type Principal = User | Token
