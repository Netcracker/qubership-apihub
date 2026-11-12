import { MessageSeverity, NotificationMessage } from '../package/notifications'
import { BuildConfig } from '../external/config'
import { _VersionResolver, ApiBuilder } from './apiBuilder'
import { VersionOperationsResolver } from '../external'
import { ObjPath } from '../../utils'

export interface ValidationMessage {
  operationId?: string
  operationHash?: string
  previousOperationId?: string
  previousOperationHash?: string
  jsonPath?: ObjPath // full path
  message: string
  severity: MessageSeverity
}

export type BwcCheckContext = {
  versionOperationsResolver: VersionOperationsResolver
  versionResolver: _VersionResolver
  apiBuilders: ApiBuilder[]
  notifications: NotificationMessage[]
  config: BuildConfig
  operationSize?: number
}
