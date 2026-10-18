import { runRefObjectDescriptionTests } from './templates/reference-object-31.template'

const SUITE_ID = 'request-body'
const REQUEST_BODY_PATH = ['paths', '/path1', 'post', 'requestBody']
const COMPONENTS_REQUEST_BODY_PATH = ['components', 'requestBodies', 'rb1']

describe('Reference object. Request body. Description fields in ref object', () => {
  runRefObjectDescriptionTests(SUITE_ID, REQUEST_BODY_PATH, COMPONENTS_REQUEST_BODY_PATH)
})
