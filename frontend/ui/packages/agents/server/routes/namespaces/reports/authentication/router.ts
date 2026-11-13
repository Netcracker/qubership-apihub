import { Router } from 'express'
import { AUTHENTICATION_CHECK_REPORT_DTO } from './data'

type AuthenticationCheckReportRouter = Router

export function AuthenticationCheckReportRouter(): AuthenticationCheckReportRouter {
  const router: AuthenticationCheckReportRouter = Router()

  getAuthenticationCheckReport(router)

  return router
}

function getAuthenticationCheckReport(router: AuthenticationCheckReportRouter): void {
  router.get('/', (req, res) => {
    res.status(200).json(AUTHENTICATION_CHECK_REPORT_DTO)
  })
}

