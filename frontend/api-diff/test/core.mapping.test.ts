import { createPropertyMappingResolver } from '../src/core'

// Direct unit tests for the property-keyed array mapping resolver after its
// move from src/asyncapi/asyncapi3.mapping.ts into src/core/mapping.ts (T0.1).
describe('createPropertyMappingResolver', () => {
  const SYM = Symbol('key')
  const resolver = createPropertyMappingResolver(SYM)
  const mockCtx = {} as any

  const item = (key: string) => ({ [SYM]: key })

  it('maps elements in identical order', () => {
    const before = [item('A'), item('B')]
    const after = [item('A'), item('B')]
    expect(resolver(before, after, mockCtx)).toEqual({
      added: [],
      removed: [],
      mapped: { 0: 0, 1: 1 },
    })
  })

  it('maps elements in reversed order', () => {
    const before = [item('A'), item('B')]
    const after = [item('B'), item('A')]
    expect(resolver(before, after, mockCtx)).toEqual({
      added: [],
      removed: [],
      mapped: { 0: 1, 1: 0 },
    })
  })

  it('marks new element as added', () => {
    const before = [item('A')]
    const after = [item('A'), item('B')]
    expect(resolver(before, after, mockCtx)).toEqual({
      added: [1],
      removed: [],
      mapped: { 0: 0 },
    })
  })

  it('marks missing element as removed', () => {
    const before = [item('A'), item('B')]
    const after = [item('A')]
    expect(resolver(before, after, mockCtx)).toEqual({
      added: [],
      removed: [1],
      mapped: { 0: 0 },
    })
  })

  it('treats replaced key (A→B) as removed+added, not mapped', () => {
    const before = [item('A')]
    const after = [item('B')]
    expect(resolver(before, after, mockCtx)).toEqual({
      added: [0],
      removed: [0],
      mapped: {},
    })
  })

  it('treats elements without the symbol as unmatched (removed+added)', () => {
    const before = [{}]
    const after = [{}]
    expect(resolver(before, after, mockCtx)).toEqual({
      added: [0],
      removed: [0],
      mapped: {},
    })
  })

  it('maps only elements that share the symbol; unmatched go to added/removed', () => {
    const before = [item('A'), item('B')]
    const after = [item('A'), item('C')]
    expect(resolver(before, after, mockCtx)).toEqual({
      added: [1],
      removed: [1],
      mapped: { 0: 0 },
    })
  })
})
