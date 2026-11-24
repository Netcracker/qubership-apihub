import type { Key } from './keys'
import type { Url } from '../types/url'

export const USER = 'user'
export const API_KEY = 'apiKey'
export const JOB = 'job'
export type Principal = User | Token | Job

type Token = Readonly<{
  type: typeof API_KEY
  id: Key
  name: string
}>

type Job = Readonly<{
  type: typeof JOB
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
