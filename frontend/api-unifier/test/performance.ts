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
const results: number[][] = []
SPECS.forEach(() => results.push([]))
for (let j = 0; j < 2; j++) {
  SPECS.forEach((s, i) => {
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
    console.log(j, i, to)
    results[i].push(to)
  })
}

results.forEach((numbers) => {
  console.log(`${numbers.reduce((a, b) => a + b, 0) / numbers.length}: ${numbers.join(',')}`)
})
