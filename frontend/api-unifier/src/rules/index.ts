import {
  SPEC_TYPE_ASYNCAPI_3,
  SPEC_TYPE_DDL_API_1,
  SPEC_TYPE_GRAPH_API,
  SPEC_TYPE_JSON_SCHEMA_04,
  SPEC_TYPE_JSON_SCHEMA_06,
  SPEC_TYPE_JSON_SCHEMA_07,
  SPEC_TYPE_OPEN_API_30,
  SPEC_TYPE_OPEN_API_31,
  SpecType,
} from '../spec-type'
import { NormalizationRules } from '../types'
import { jsonSchemaRules } from './jsonschema'
import { openApiRules } from './openapi'
import { graphApiRules } from './graphapi'
import { asyncApiRules } from './asyncapi'
import { ddlApiRules } from './ddlapi'
import { DIALECT_POSTGRES } from './ddlapi.postgres'

export const RULES: Record<SpecType, NormalizationRules> = {
  [SPEC_TYPE_JSON_SCHEMA_04]: jsonSchemaRules(SPEC_TYPE_JSON_SCHEMA_04),
  [SPEC_TYPE_JSON_SCHEMA_06]: jsonSchemaRules(SPEC_TYPE_JSON_SCHEMA_06),
  [SPEC_TYPE_JSON_SCHEMA_07]: jsonSchemaRules(SPEC_TYPE_JSON_SCHEMA_07),
  [SPEC_TYPE_OPEN_API_30]: openApiRules(SPEC_TYPE_OPEN_API_30),
  [SPEC_TYPE_OPEN_API_31]: openApiRules(SPEC_TYPE_OPEN_API_31),
  [SPEC_TYPE_GRAPH_API]: graphApiRules(),
  [SPEC_TYPE_ASYNCAPI_3]: asyncApiRules(),
  [SPEC_TYPE_DDL_API_1]: ddlApiRules(SPEC_TYPE_DDL_API_1, DIALECT_POSTGRES),
}
