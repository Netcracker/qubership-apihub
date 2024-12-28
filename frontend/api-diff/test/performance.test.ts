import { oas30, qgl } from './performance.base'

describe('Real Data', () => {

  it('Graph QL', () => {
    expect(qgl()).toEqual(511)
  })

  it('OAS 3.0', () => {
    expect(oas30()).toEqual(4842)
  })
})
