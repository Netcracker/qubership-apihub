/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
