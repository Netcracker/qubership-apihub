import { IServer as _IServer } from '@stoplight/types'

export type IServer = Omit<_IServer, 'id'> & {
  custom?: boolean
  shouldUseProxyEndpoint?: boolean
}
