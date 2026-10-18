import { buildFromDdl } from '@netcracker/qubership-apihub-ddlapi/parser'
import {
  DDL_API_NORMALIZE_OPTIONS,
  resolveSpec,
  SPEC_TYPE_DDL_API_1,
} from '@netcracker/qubership-apihub-api-unifier'

// Smoke test: proves the ddlapi dependency and the ddlapi-enabled api-unifier build
// are wired up and that a Realm parsed from raw DDL is routed to the ddlapi spec type
// by resolveSpec.
describe('ddlapi dependency wiring', () => {
  it('exposes the ddlapi exports from api-unifier', () => {
    expect(SPEC_TYPE_DDL_API_1).toBe('ddlapi-1.0')
    expect(DDL_API_NORMALIZE_OPTIONS).toBeDefined()
  })

  it('builds a Realm from DDL and resolveSpec routes it to ddlapi', async () => {
    const realm = await buildFromDdl('create table t(id int);')
    expect(resolveSpec(realm).type).toBe(SPEC_TYPE_DDL_API_1)
  })
})
