import { runCommonSchemaTests } from './templates/schema'

const SUITE_ID = 'request-body-schema'

const REQUEST_SCHEMA_PATH = [
  'paths',
  '/path1',
  'post',
  'requestBody',
  'content',
  'application/json',
  'schema',
]

describe('Openapi3 Request Body Schema', () => {
  runCommonSchemaTests(SUITE_ID, REQUEST_SCHEMA_PATH)

})
