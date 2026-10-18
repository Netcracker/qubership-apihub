import { convertOriginToHumanReadable, normalize, NormalizeOptions } from '../../src'
import 'jest-extended'
import { commonOriginsCheck, createOas, TEST_ORIGINS_FLAG } from '../helpers'

describe('validate origins', function () {
  const OPTIONS: NormalizeOptions = {
    originsFlag: TEST_ORIGINS_FLAG,
    validate: true,
  }

  it('unknown property', () => {
    const source = createOas({
      unknown: true,
      properties: [],
      type: 'no-existed',
    })
    const result = normalize(source, OPTIONS)
    commonOriginsCheck(result, { source })
    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', TEST_ORIGINS_FLAG, 'Single'], ['components/schemas/Single'])
    expect(resultWithHmr).not.toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'unknown'])
    expect(resultWithHmr).not.toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'properties'])
    expect(resultWithHmr).not.toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'type'])
  })

})
