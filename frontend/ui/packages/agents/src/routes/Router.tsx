import { ErrorPage, NOT_FOUND_TITLE } from '@netcracker/qubership-apihub-ui-shared/components/ErrorPage'
import { LoginPage } from '@netcracker/qubership-apihub-ui-shared/pages/login'
import type { FC } from 'react'
import { memo } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { EventBusProvider } from './EventBusProvider'
import { NavigationProvider } from './NavigationProvider'
import { BasePage } from './root/BasePage/BasePage'
import { NamespacePage } from './root/NamespacePage/NamespacePage'
import { SystemConfigurationProvider } from './root/NamespacePage/SystemConfigurationProvider'
import { WelcomePage } from './root/WelcomePage'
import { AUTHENTICATION_REPORTS_PAGE, SECURITY_REPORTS_PAGE, SERVICES_PAGE } from './routes'

// Opts in to two behaviors of React Router 7: navigation updates run in `startTransition`, and a relative path inside a
// splat route resolves from the whole matched path. React Router names the flags in snake case.
// TODO: remove the flags with the move to React Router 7, where this behavior is the default and the flags are gone.
// eslint-disable-next-line camelcase
const ROUTER_FUTURE_FLAGS = { v7_startTransition: true, v7_relativeSplatPath: true }

const SecurityReportsRedirect: FC = memo(() => {
  const location = useLocation()
  return <Navigate to={{ pathname: AUTHENTICATION_REPORTS_PAGE, search: location.search }} replace />
})

export const Router: FC = memo(() => {
  return (
    <SystemConfigurationProvider>
      <EventBusProvider>
        <BrowserRouter future={ROUTER_FUTURE_FLAGS}>
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
                        element={<SecurityReportsRedirect />}
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
