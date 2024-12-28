import type { StrictCompareOptions } from '../types'
import { CompareMode } from '../types'

export type AsyncApiRulesOptions = {
  mode?: CompareMode
}

export type AsyncApiSchemaRulesOptions = AsyncApiRulesOptions & {
  response?: boolean
}

export type AsyncApiCompareOptions = StrictCompareOptions & AsyncApiRulesOptions
