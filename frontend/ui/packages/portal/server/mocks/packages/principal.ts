export const USER = 'user'
export const API_KEY = 'apiKey'

type PrincipalType = typeof USER | typeof API_KEY

export type Principal = {
  type?: PrincipalType
  id: string
  name?: string
  email?: string
  avatarUrl?: string
}

export const TOKEN_SAMPLE: Principal = {
  type: API_KEY,
  id: 'token',
  name: 'Token name',
}

export const USER_SAMPLE: Principal = {
  type: USER,
  id: 'user',
  name: 'User name',
  avatarUrl: '?',
}

export const USER_SAMPLE_WITHOUT_ICON: Principal = {
  type: USER,
  id: 'user',
  name: 'User name',
}

export const USER_SAMPLE_WITHOUT_NAME: Principal = {
  type: USER,
  id: 'user',
  avatarUrl: '?',
}
