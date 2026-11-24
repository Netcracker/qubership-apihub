import type { ReactNode } from 'react'
import type { RouteObject } from 'react-router'
import { LoginPage } from '../pages/login'

export type ApplicationRoutes = [RouteObject, ...RouteObject[]]

export function wrapByCommonRoute(basePage: ReactNode, childrenRoutes: ApplicationRoutes): ApplicationRoutes {
  return [
    {
      id: 'login',
      path: '/login',
      element: <LoginPage applicationName={'APIHUB NC Custom Service'}/>,
    },
    {
      id: 'root',
      path: '/',
      element: basePage,
      children: [
        ...childrenRoutes,
      ],
    },
  ]
}
