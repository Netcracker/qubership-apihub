import { runCommonSchemaTests } from './templates/schema'

const SUITE_ID = 'parameters-schema'

const PARAMETERS_SCHEMA_PATH = [
  'paths',
  '/path1',
  'post',
  'parameters',
  0,
  'schema',
]

describe('Openapi3 Parameters Schema', () => {
  runCommonSchemaTests(SUITE_ID, PARAMETERS_SCHEMA_PATH)
})
