import { runAddRemoveDefaultValuesSchemaTests, runCommonSchemaTests } from './templates/schema'
import { runCommonSchema31Tests } from './templates/schema31'

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

  runAddRemoveDefaultValuesSchemaTests(SUITE_ID)
})

describe('Openapi31 Parameters Schema', () => {
  runCommonSchema31Tests(SUITE_ID, PARAMETERS_SCHEMA_PATH)
})
