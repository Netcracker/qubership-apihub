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

import type { FC } from 'react'
import { memo, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { EventBusProvider } from './EventBusProvider'
import { NavigationProvider } from './NavigationProvider'
import { isTokenExpired } from '@netcracker/qubership-apihub-ui-shared/entities/token-payload'
import { getToken } from '@netcracker/qubership-apihub-ui-shared/utils/storages'
import { useAuthorization } from '@netcracker/qubership-apihub-ui-shared/hooks/authorization'
import { LoginPage } from '@netcracker/qubership-apihub-ui-shared/pages/login'
import { BasePage } from './root/BasePage/BasePage'
import { AuthPage } from '@netcracker/qubership-apihub-ui-shared/pages/AuthPage'
import { MainPage } from './root/MainPage/MainPage'
import { ProjectEditorPage } from './root/EditorPage/ProjectEditorPage/ProjectEditorPage'
import { ErrorPage, NOT_FOUND_TITLE } from '@netcracker/qubership-apihub-ui-shared/components/ErrorPage'

export const Router: FC = memo(() => {
  const [auth, setAuth] = useState<boolean>(!isTokenExpired(getToken()))
  useAuthorization({ setLogin: setAuth })

  return (
    <EventBusProvider>
      <BrowserRouter>
        <NavigationProvider>
          <Routes>
            <Route path="/login" element={<LoginPage applicationName={'APIHUB Editor'}/>}/>
            <Route path="/" element={auth ? <BasePage/> : <AuthPage/>}>
              <Route index element={<Navigate to="editor" replace/>}/>
              <Route path="editor">
                <Route index element={<MainPage/>}/>
                <Route path="projects/:projectId" element={<ProjectEditorPage/>}/>
              </Route>
              <Route path="*" element={<ErrorPage title={NOT_FOUND_TITLE} homePath="/editor"/>}/>
            </Route>
          </Routes>
        </NavigationProvider>
      </BrowserRouter>
    </EventBusProvider>
  )
})
