import {
  discoveredServiceGroupOf,
  WITH_BASELINE_PACKAGE_GROUP,
  WITHOUT_API_DOCUMENTS_GROUP,
  WITHOUT_BASELINE_PACKAGE_GROUP,
} from './discoveredServiceGroups'

const DOCUMENT = { name: 'Linter Service API' }
const BASELINE_PACKAGE = { packageKey: 'NCPROD.NC.CP.AH.APILS', name: 'API Linter Service' }

describe('discoveredServiceGroups', () => {
  it('puts a service with API documents and a baseline package into the group with a baseline package', () => {
    expect(discoveredServiceGroupOf({ specs: [DOCUMENT], baseline: BASELINE_PACKAGE }))
      .toBe(WITH_BASELINE_PACKAGE_GROUP)
  })

  it('puts a service with API documents and no baseline package into the group without one', () => {
    expect(discoveredServiceGroupOf({ specs: [DOCUMENT] })).toBe(WITHOUT_BASELINE_PACKAGE_GROUP)
  })

  it('puts a service without API documents into its own group, whatever its baseline package', () => {
    expect(discoveredServiceGroupOf({ specs: [], baseline: BASELINE_PACKAGE })).toBe(WITHOUT_API_DOCUMENTS_GROUP)
    // A response without a list of documents leaves `specs` undefined
    expect(discoveredServiceGroupOf({ baseline: BASELINE_PACKAGE })).toBe(WITHOUT_API_DOCUMENTS_GROUP)
  })
})
