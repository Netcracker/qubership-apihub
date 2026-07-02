import { Realm } from '@netcracker/qubership-apihub-ddlapi'
import { buildFromDdl, DdlNonFatalError } from '@netcracker/qubership-apihub-ddlapi/parser'
import { normalize, DDL_API_NORMALIZE_OPTIONS } from '../../src'
import { commonOriginsCheck, TEST_ORIGINS_FLAG } from '../helpers'

// Partial realms. A dangling reference (FK to an undefined table) must not
// throw: the output stays partial and origins remain valid for the resolved parts.
describe('ddlapi partial realm', () => {
  const baseOptions = {
    ...DDL_API_NORMALIZE_OPTIONS,
    originsFlag: TEST_ORIGINS_FLAG,
  }

  const danglingFkDdl = 'CREATE TABLE orders (id bigint PRIMARY KEY, user_id bigint REFERENCES users (id));'

  it('normalizes a realm with a dangling FK target without throwing, origins valid', async () => {
    // intentionally partial: `users` is never defined, so the FK target is unresolved.
    const issues: DdlNonFatalError[] = []
    const realm = await buildFromDdl(danglingFkDdl, { onError: (e) => issues.push(e) })
    // sanity: ddlapi reported the dangling reference
    expect(issues).not.toBeEmpty()

    let result: Realm | undefined
    expect(() => { result = normalize(realm, baseOptions) as Realm }).not.toThrow()

    expect(result!.schemas[0].tables!.find((t) => t.name === 'orders')).toBeDefined()
    commonOriginsCheck(result, { originsFlag: TEST_ORIGINS_FLAG })
  })

  it('reports the dangling FK via onUnifyError, left partial, no throw', async () => {
    const realm = await buildFromDdl(danglingFkDdl)
    const unifyErrors: string[] = []

    const result = normalize(realm, { ...baseOptions, onUnifyError: (m) => unifyErrors.push(m) }) as Realm

    expect(unifyErrors.some((m) => m.startsWith('ddlapi: dangling foreign key'))).toBe(true)
    // left partial: the FK still has its source columns, refTable stays unresolved
    const fk = result.schemas[0].tables!.find((t) => t.name === 'orders')!.foreignKeys![0]
    expect(fk.columns).toBeArrayOfSize(1)
    expect(fk.refTable).toBeUndefined()
  })

  it('does not report a well-formed FK', async () => {
    const realm = await buildFromDdl(`
      CREATE TABLE users (id bigint PRIMARY KEY);
      CREATE TABLE orders (id bigint PRIMARY KEY, user_id bigint REFERENCES users (id));
    `)
    const unifyErrors: string[] = []
    normalize(realm, { ...baseOptions, onUnifyError: (m) => unifyErrors.push(m) })
    expect(unifyErrors).toBeEmpty()
  })
})
