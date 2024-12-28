import { CompareMode, type StrictCompareOptions } from '../types'
import type { OpenApiSpecVersion } from '@netcracker/qubership-apihub-api-unifier'

export type OpenApi3RulesOptions = {
  version: OpenApiSpecVersion
  mode: CompareMode
}

export type OpenApi3SchemaRulesOptions = OpenApi3RulesOptions & {
  response?: boolean
}

export type OpenApiCompareOptions = StrictCompareOptions & Omit<OpenApi3RulesOptions, 'version'>
