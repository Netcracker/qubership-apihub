import type { DebugRouter } from './router'

export function storeLogs(router: DebugRouter): void {
  router.post('/logs/', (req, res) => {
    res.status(200).json()
  })
}
