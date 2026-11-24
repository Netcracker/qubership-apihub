import type { FC, PropsWithChildren } from 'react'
import { createContext, memo, useContext, useState } from 'react'
import { createEventBus, slot } from 'ts-event-bus'
import { useEvent } from 'react-use'
import { generatePath, useNavigate } from 'react-router-dom'
import type { Path } from '@remix-run/router'
import { AGENT_PAGE_PATH_PATTERN, NAMESPACE_PAGE_PATH_PATTERN } from './routes'
import type { SearchParam, WORKSPACE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'

export const NAVIGATE_TO_AGENT = 'navigate-to-agent'
export const NAVIGATE_TO_NAMESPACE = 'navigate-to-namespace'

export type AgentDetail = {
  agentId: string
  search: {
    [WORKSPACE_SEARCH_PARAM]?: SearchParam
  }
}

export type NamespaceDetail = {
  agentId: string
  namespaceKey: string
  mode: string
  search: {
    [WORKSPACE_SEARCH_PARAM]?: SearchParam
  }
}

type NavigationEventBus = {
  navigateToAgent: (detail?: AgentDetail) => void
  navigateToNamespace: (detail?: NamespaceDetail) => void
}

function navigationProvider(): NavigationEventBus {
  const eventBus = createEventBus({
    events: {
      navigateToAgent: slot<AgentDetail>(),
      navigateToNamespace: slot<NamespaceDetail>(),
    },
  })

  eventBus.navigateToAgent.on((detail: AgentDetail) => {
    dispatchEvent(new CustomEvent(NAVIGATE_TO_AGENT, { detail }))
  })
  eventBus.navigateToNamespace.on((detail: NamespaceDetail) => {
    dispatchEvent(new CustomEvent(NAVIGATE_TO_NAMESPACE, { detail }))
  })

  return eventBus as unknown as NavigationEventBus
}

const EventBusContext = createContext<NavigationEventBus>()

export function useNavigation(): NavigationEventBus {
  return useContext(EventBusContext)
}

export const NavigationProvider: FC<PropsWithChildren> = memo<PropsWithChildren>(({ children }) => {
  const [navigationEventBus] = useState(navigationProvider)
  const navigate = useNavigate()

  useEvent(NAVIGATE_TO_AGENT, ({ detail }: CustomEvent<AgentDetail>) => {
    navigate(getAgentPath(detail))
  })

  useEvent(NAVIGATE_TO_NAMESPACE, ({ detail }: CustomEvent<NamespaceDetail>) => {
    navigate(getNamespacePath(detail))
  })

  return (
    <EventBusContext.Provider value={navigationEventBus}>
      {children}
    </EventBusContext.Provider>
  )
})

export function getAgentPath({
  agentId,
  search,
}: AgentDetail): Partial<Path> {
  return {
    pathname: generatePath(AGENT_PAGE_PATH_PATTERN, { agentId }),
    search: search ? `${optionalSearchParams(search)}` : undefined,
  }
}

export function getNamespacePath({
  agentId,
  namespaceKey,
  mode,
  search,
}: NamespaceDetail): Partial<Path> {
  const namespaceId = encodeURIComponent(namespaceKey)
  return {
    pathname: `${generatePath(NAMESPACE_PAGE_PATH_PATTERN, { agentId, namespaceId })}/${mode}`,
    search: search ? `${optionalSearchParams(search)}` : undefined,
  }
}
