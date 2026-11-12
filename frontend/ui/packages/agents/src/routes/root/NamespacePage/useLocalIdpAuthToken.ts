import type { Dispatch, SetStateAction } from 'react'
import { useLocalStorage } from 'react-use'

export function useLocalIdpAuthToken(): [string | undefined, SetIdpAuthToken] {
  const [idpAuthToken, setIdpAuthToken] = useLocalStorage<string>('idp-auth-token')

  return [
    idpAuthToken,
    setIdpAuthToken,
  ]
}

export type SetIdpAuthToken = Dispatch<SetStateAction<string | undefined>>
