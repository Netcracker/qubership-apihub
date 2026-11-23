import { checkVersionRestrictedSymbols } from './validations'

const RESTRICTED_SYMBOLS_MESSAGE = 'Only \'A-Za-z0-9_.~-\' characters are allowed'

describe('checkVersionRestrictedSymbols', () => {
  it('accepts letters, digits, the four symbols of a version name, and the space', () => {
    expect(checkVersionRestrictedSymbols('')).toBe(true)
    expect(checkVersionRestrictedSymbols('2025.4_rc~1-2')).toBe(true)
    expect(checkVersionRestrictedSymbols('v 1.0')).toBe(true)
  })

  it.each(['#', ';', '{', '}', '[', ']', '`', '\'', '№', '/', '%', '@'])(
    'rejects a version with %p',
    symbol => {
      expect(checkVersionRestrictedSymbols(`2025${symbol}4`)).toBe(RESTRICTED_SYMBOLS_MESSAGE)
    },
  )
})
