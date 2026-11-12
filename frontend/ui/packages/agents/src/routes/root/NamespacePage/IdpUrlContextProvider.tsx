import {
  createContext,
  type Dispatch,
  type FC,
  type PropsWithChildren,
  type SetStateAction,
  useContext,
  useEffect,
  useState,
} from 'react'
import { useParams } from 'react-router-dom'
import { useNamespaceIdentityProviderUrl } from './useIdentityProviderUrl'

const IdpUrlContext = createContext<string | undefined>()
const SetIdpUrlContext = createContext<Dispatch<SetStateAction<string | undefined>>>()

export function useIdentityProviderUrl(): string | undefined {
  return useContext(IdpUrlContext)
}

export function useSetIdentityProviderUrl(): Dispatch<SetStateAction<string | undefined>> {
  return useContext(SetIdpUrlContext)
}

export const IdpUrlContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const { agentId = '', namespaceKey = '' } = useParams()
  const [idpUrl, isLoading] = useNamespaceIdentityProviderUrl({ agentKey: agentId, namespaceKey: namespaceKey })

  const [currentIdpUrl, setCurrentIdpUrl] = useState<string | undefined>()

  useEffect(() => {
    if (isLoading) {
      setCurrentIdpUrl(undefined)
    } else {
      setCurrentIdpUrl(idpUrl ?? DEFAULT_IDP_URL)
    }
  }, [idpUrl, isLoading])

  return <IdpUrlContext.Provider value={currentIdpUrl}>
    <SetIdpUrlContext.Provider value={setCurrentIdpUrl}>
      {children}
    </SetIdpUrlContext.Provider>
  </IdpUrlContext.Provider>
}

const DEFAULT_IDP_URL = ''
