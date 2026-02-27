import { CompareMode, type StrictCompareOptions } from '../types'
import { SPEC_TYPE_ASYNCAPI_3 } from '@netcracker/qubership-apihub-api-unifier'

export type AsyncApi3RulesOptions = {
  version: typeof SPEC_TYPE_ASYNCAPI_3
  mode: CompareMode
}


export type AsyncApiCompareOptions = StrictCompareOptions & Omit<AsyncApi3RulesOptions, 'version'>

