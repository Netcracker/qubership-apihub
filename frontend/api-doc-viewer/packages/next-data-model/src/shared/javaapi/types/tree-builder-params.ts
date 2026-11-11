import { BuildingServiceLogger } from '../../../loggers'
import { ClassKey } from './class-key'

export type JavaApiTreeBuilderParams = {
  // jdiff document (`api-report` or `api-diff` mode)
  source: unknown
  classKey: ClassKey
  logger?: BuildingServiceLogger
}

export type JavaApiClassListBuilderParams = {
  // jdiff document (`api-report` or `api-diff` mode)
  source: unknown
  logger?: BuildingServiceLogger
}
