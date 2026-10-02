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

  it('keeps the names of the dangling FK target, with no unify error', async () => {
    // ddlapi alone reports the unresolved reference; normalization does not repeat it.
    const realm = await buildFromDdl(danglingFkDdl, { onError: () => {} })
    const unifyErrors: string[] = []

    const result = normalize(realm, { ...baseOptions, onUnifyError: (m) => unifyErrors.push(m) }) as Realm

    expect(unifyErrors).toBeEmpty()
    const fk = result.schemas[0].tables!.find((t) => t.name === 'orders')!.foreignKeys![0]
    // the normalized nodes carry an origins record under a symbol key
    expect(Array.from(fk.columns!)).toEqual(['user_id'])
    expect(fk.refTable).toMatchObject({ schema: 'public', name: 'users' })
    expect(Array.from(fk.refColumns!)).toEqual(['id'])
  })
})
