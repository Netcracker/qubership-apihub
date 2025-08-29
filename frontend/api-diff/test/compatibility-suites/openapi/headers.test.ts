import { runRefObjectDescriptionTests } from './templates/reference-object-31.template'

const SUITE_ID = 'headers'
const HEADER_PATH = ['paths', '/path1', 'get', 'responses', '200', 'headers', 'X-Rate-Limit']
const COMPONENTS_HEADER_PATH = ['components', 'headers', 'X-Rate-Limit']

describe('Reference object. Headers. Description fields in ref object', () => {
  runRefObjectDescriptionTests(SUITE_ID, HEADER_PATH, COMPONENTS_HEADER_PATH)
})
