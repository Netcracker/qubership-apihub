import { Realm } from '@netcracker/qubership-apihub-ddlapi'
import { DDL_API_NORMALIZE_OPTIONS, normalize } from '../../src'
import { buildRealmAndAssertValid } from '../helpers/ddlapi'

// DDL_API_NORMALIZE_OPTIONS contract. The canonical option bundle is the
// stable surface api-diff imports; pin its flags and prove spreading it normalizes.
describe('DDL_API_NORMALIZE_OPTIONS', () => {
  it('pins the canonical flags off-by-design for ddlapi', () => {
    expect(DDL_API_NORMALIZE_OPTIONS).toEqual({
      validate: true,
      unify: true,
      mergeAllOf: false,
      mergeTraits: false,
      liftCombiners: false,
      resolveRef: false,
    })
  })

  it('produces a unified document when spread (empties filled, validation on)', async () => {
    const realm = await buildRealmAndAssertValid('CREATE TABLE t(id int)')
    const result = normalize(realm, { ...DDL_API_NORMALIZE_OPTIONS }) as Realm

    // unify:true → empty collections materialized
    expect(result.schemas[0].tables![0].attrs).toEqual([])
  })
})
