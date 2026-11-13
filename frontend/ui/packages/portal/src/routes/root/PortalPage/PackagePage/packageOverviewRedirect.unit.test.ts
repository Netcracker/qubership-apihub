import { getPackageOverviewRedirect } from './packageOverviewRedirect'

describe('getPackageOverviewRedirect', () => {
  it('leads to the default version without its revision', () => {
    expect(getPackageOverviewRedirect({ key: 'QSP1.PK11', defaultVersion: '2231.1@3' }))
      .toEqual({ packageKey: 'QSP1.PK11', versionKey: '2231.1' })
  })

  it('leads nowhere while the package is loading', () => {
    expect(getPackageOverviewRedirect(null)).toBeUndefined()
  })

  it('leads nowhere when the package has no default version', () => {
    expect(getPackageOverviewRedirect({ key: 'QSP1.PK11', defaultVersion: undefined })).toBeUndefined()
  })
})
