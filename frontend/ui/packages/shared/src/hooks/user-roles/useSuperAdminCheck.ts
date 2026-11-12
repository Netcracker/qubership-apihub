import { useUser } from '../authorization'

type IsAdmin = boolean

export function useSuperAdminCheck(): IsAdmin {
  const [user] = useUser()
  return user?.systemRole === 'System administrator'
}
