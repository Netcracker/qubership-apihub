import { Router } from 'express'
import { GATEWAY_ROUTING_REPORT_DTO } from './data'

type GatewayRoutingReportRouter = Router

export function GatewayRoutingReportRouter(): GatewayRoutingReportRouter {
  const router: GatewayRoutingReportRouter = Router()

  getGatewayRoutingReport(router)

  return router
}

function getGatewayRoutingReport(router: GatewayRoutingReportRouter): void {
  router.get('/', (req, res) => {
    res.status(200).json(GATEWAY_ROUTING_REPORT_DTO)
  })
}

