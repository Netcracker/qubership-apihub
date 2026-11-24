import type { SystemRouter } from './router'

export function getInfo(router: SystemRouter): void {
  router.get('/info/', (req, res) => {
    res.status(200).json({
      backendVersion: '0.0.0',
      frontendVersion: '0.0.0',
      productionMode: false,
      aiChatEnabled: true,
    })
  })
}
