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

import { ErrorPage, NOT_FOUND_TITLE } from '@netcracker/qubership-apihub-ui-shared/components/ErrorPage'
import { LoginPage } from '@netcracker/qubership-apihub-ui-shared/pages/login'
import type { FC } from 'react'
import { memo } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { EventBusProvider } from './EventBusProvider'
import { NavigationProvider } from './NavigationProvider'
import { BasePage } from './root/BasePage/BasePage'
import { NamespacePage } from './root/NamespacePage/NamespacePage'
import { SystemConfigurationProvider } from './root/NamespacePage/SystemConfigurationProvider'
import { WelcomePage } from './root/WelcomePage'
import { AUTHENTICATION_REPORTS_PAGE, SECURITY_REPORTS_PAGE, SERVICES_PAGE } from './routes'
export const Router: FC = memo(() => {
  return (
    <SystemConfigurationProvider>
      <EventBusProvider>
        <BrowserRouter>
          <NavigationProvider>
            <Routes>
              <Route path="/login" element={<LoginPage applicationName={'APIHUB NC Custom Service'} />} />
              <Route path="/" element={<BasePage />}>
                <Route index element={<Navigate to="agents" replace />} />
                <Route path="agents">
                  <Route index element={<WelcomePage />} />
                  <Route path=":agentId">
                    <Route index element={<WelcomePage />} />
                    <Route path=":namespaceKey/*">
                      <Route element={<NamespacePage />} />
                      <Route index element={<Navigate to={SERVICES_PAGE} replace />} />
                      <Route path="*" element={<NamespacePage />} />
                      <Route
                        path={`${SECURITY_REPORTS_PAGE}`}
                        element={<Navigate to={AUTHENTICATION_REPORTS_PAGE} replace />}
                      />
                    </Route>
                  </Route>
                </Route>
                <Route path="*" element={<ErrorPage title={NOT_FOUND_TITLE} homePath="/agents" />} />
              </Route>
            </Routes>
          </NavigationProvider>
        </BrowserRouter>
      </EventBusProvider>
    </SystemConfigurationProvider>
  )
})
