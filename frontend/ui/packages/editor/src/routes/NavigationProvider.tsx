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

import type { FC, PropsWithChildren } from 'react'
import { createContext, memo, useContext, useState } from 'react'
import { createEventBus, slot } from 'ts-event-bus'
import { useEvent } from 'react-use'
import { useNavigate } from 'react-router-dom'
import type { Path } from '@remix-run/router'
import type {
  BRANCH_SEARCH_PARAM,
  MODE_SEARCH_PARAM,
  SearchParam,
  VERSION_SEARCH_PARAM,
  VIEW_SEARCH_PARAM,
} from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'

export const NAVIGATE_TO_EDITOR = 'navigate-to-editor'
export const NAVIGATE_TO_PROJECT = 'navigate-to-project'

export type EditorDetail = {
  search?: {
    [VIEW_SEARCH_PARAM]: SearchParam
  }
}

export type ProjectDetail = {
  projectKey?: Key
  search: {
    [VERSION_SEARCH_PARAM]?: SearchParam
    [BRANCH_SEARCH_PARAM]?: SearchParam
    [MODE_SEARCH_PARAM]: SearchParam
  }
  replace?: boolean
}

type NavigationEventBus = {
  navigateToEditor: (detail?: EditorDetail) => void
  navigateToProject: (detail: ProjectDetail) => void
}

function navigationProvider(): NavigationEventBus {
  const eventBus = createEventBus({
    events: {
      navigateToEditor: slot<EditorDetail>(),
      navigateToProject: slot<ProjectDetail>(),
    },
  })

  eventBus.navigateToEditor.on((detail: EditorDetail) => {
    dispatchEvent(new CustomEvent(NAVIGATE_TO_EDITOR, { detail }))
  })
  eventBus.navigateToProject.on((detail: ProjectDetail) => {
    dispatchEvent(new CustomEvent(NAVIGATE_TO_PROJECT, { detail }))
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

  useEvent(NAVIGATE_TO_EDITOR, () => {
    navigate(getEditorPath())
  })

  useEvent(NAVIGATE_TO_PROJECT, ({ detail: { replace = false, ...rest } }: CustomEvent<ProjectDetail>) => {
    navigate(getProjectPath(rest), { replace: replace })
  })

  return (
    <EventBusContext.Provider value={navigationEventBus}>
      {children}
    </EventBusContext.Provider>
  )
})

export function getEditorPath({
  search,
}: EditorDetail = {}): Partial<Path> {
  return {
    pathname: '/editor',
    ...(search ? { search: `${optionalSearchParams(search)}` } : {}),
  }
}

export function getProjectPath({
  projectKey,
  search,
}: ProjectDetail): Partial<Path> {
  return {
    ...(projectKey ? { pathname: `/editor/projects/${encodeURIComponent(projectKey)}` } : {}),
    search: `${optionalSearchParams(search)}`,
  }
}
