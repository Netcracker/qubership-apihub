import {
  normalize,
} from '../src'
import { readFileSync } from 'fs'
import { load } from 'js-yaml'
import { buildGraphApi, TEST_HASH_FLAG, TEST_ORIGINS_FLAG, TEST_SYNTHETIC_TITLE_FLAG } from './helpers'

const SPECS = [
  load(readFileSync(`./test/resources/performance/openapi_large_x6.yaml`).toString()),
  buildGraphApi(readFileSync(`./test/resources/performance/qgl_large_x8.graphql`).toString()),
]

jest.setTimeout(600000)

describe('performance', () => {

  it('first', () => {
    SPECS.forEach((s) => {
      const from = performance.now()
      normalize(s, {
        validate: true,
        liftCombiners: true,
        unify: true,
        allowNotValidSyntheticChanges: true,
        syntheticTitleFlag: TEST_SYNTHETIC_TITLE_FLAG,
        originsFlag: TEST_ORIGINS_FLAG,
        hashFlag: TEST_HASH_FLAG,
      })
      const to = performance.now() - from
    })
  })
})
