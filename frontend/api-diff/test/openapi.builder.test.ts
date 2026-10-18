import { OpenapiBuilder } from './helper'

describe('Openapi3 builder tests', () => {
  let openapiBuilder: OpenapiBuilder

  beforeEach(() => {
    openapiBuilder = new OpenapiBuilder()
  })

  it('should build 2 default operations', () => {
    const before = openapiBuilder.getSpec()
    const after = openapiBuilder.getSpec()

    expect(before).toHaveProperty('openapi')
    expect(after).toHaveProperty('openapi')
  })
})
