import { buildFromDdl } from '@netcracker/qubership-apihub-ddlapi/parser'
import {
  normalize,
  resolveSpec,
  SPEC_TYPE_DDL_API_1,
  SPEC_TYPE_JSON_SCHEMA_07,
  DDL_API_NORMALIZE_OPTIONS,
} from '../../src'
import { TEST_ORIGINS_FLAG } from '../helpers'

// Spec detection. resolveSpec must recognise the `ddlapi` stamp,
// throw on an unsupported version, and NEVER let a Realm fall through to JSON Schema.
describe('ddlapi spec detection', () => {
  it('classifies the ddlapi 1.0.0 stamp as SPEC_TYPE_DDL_API_1', () => {
    expect(resolveSpec({ ddlapi: '1.0.0', schemas: [] })).toEqual({
      type: SPEC_TYPE_DDL_API_1,
      version: '1.0.0',
    })
  })

  it('detects on the stamp alone — an empty realm (schemas:[]) is ddlapi', () => {
    // schemas is not part of detection; absence is a validation concern, not detection.
    expect(resolveSpec({ ddlapi: '1.0.0', schemas: [] }).type).toBe(SPEC_TYPE_DDL_API_1)
  })

  it('matches any 1.0.x patch version', () => {
    expect(resolveSpec({ ddlapi: '1.0.5' }).type).toBe(SPEC_TYPE_DDL_API_1)
  })

  it('throws on an unsupported ddlapi version (mirrors OpenAPI/AsyncAPI)', () => {
    expect(() => resolveSpec({ ddlapi: '2.0.0', schemas: [] })).toThrow(/2\.0\.0 is not supported/)
  })

  it('never classifies a Realm-shaped object as JSON Schema', () => {
    const result = resolveSpec({ ddlapi: '1.0.0', schemas: [{ name: 'public', tables: [] }] })
    expect(result.type).not.toBe(SPEC_TYPE_JSON_SCHEMA_07)
    expect(result.type).toBe(SPEC_TYPE_DDL_API_1)
  })

  it('classifies a real buildFromDdl Realm as ddlapi', async () => {
    const realm = await buildFromDdl('CREATE TABLE t(id int)')
    expect(resolveSpec(realm).type).toBe(SPEC_TYPE_DDL_API_1)
  })

  it('falls through to JSON Schema for objects without the stamp', () => {
    expect(resolveSpec({ type: 'object' }).type).toBe(SPEC_TYPE_JSON_SCHEMA_07)
  })

  // The origins stage is dispatched on the `ddlapi` stamp, not a successful resolveSpec, so a
  // stamped-but-unsupported version still takes the ddlapi origins walk rather than the JSON
  // Schema path (which would throw on the unsupported version). Version rejection is deferred
  // to the version-keyed stages (validate/unify/hash).
  it('routes a stamped-but-unsupported version through the ddlapi origins stage (no throw)', () => {
    const realm = { ddlapi: '2.0.0', schemas: [{ name: 'public', tables: [] }] }
    const opts = {
      ...DDL_API_NORMALIZE_OPTIONS,
      validate: false,
      unify: false,
      originsFlag: TEST_ORIGINS_FLAG,
    }
    let result: unknown
    expect(() => { result = normalize(realm, opts) }).not.toThrow()
    expect(result).toHaveProperty([TEST_ORIGINS_FLAG])
  })

  it('still fails loud on the unsupported version once a version-keyed stage runs', () => {
    expect(() => normalize({ ddlapi: '2.0.0', schemas: [] }, { validate: true })).toThrow(/2\.0\.0 is not supported/)
  })
})
