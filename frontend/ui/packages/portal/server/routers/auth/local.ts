import { SUPERUSER } from '../../mocks/auth/users'
import type { AuthRouter } from './router'

export function performAuth(router: AuthRouter): void {
  router.post('/local/', (req, res) => {
    res.status(200).json({
      token: 'token',
      user: SUPERUSER,
    })
  })
}
