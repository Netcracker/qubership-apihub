import { Realm } from '@netcracker/qubership-apihub-ddlapi'
import { buildFromDdl, DdlNonFatalError } from '@netcracker/qubership-apihub-ddlapi/parser'
import 'jest-extended'

/**
 * Builds a Realm from DDL with the ddlapi parser, asserts there were no non-fatal
 * issues (the realm is complete), and returns it. Use in tests to guarantee fixtures
 * are *real*, valid ddlapi documents — the ddlapi analogue of parseAsyncApiAndAssertValid.
 *
 * For tests that intentionally exercise partial/invalid realms, build directly with
 * buildFromDdl (and say so with a comment) instead of using this helper.
 */
export async function buildRealmAndAssertValid(ddl: string): Promise<Realm> {
  const issues: DdlNonFatalError[] = []
  const realm = await buildFromDdl(ddl, { onError: (e) => issues.push(e) })
  expect(issues).toBeEmpty()
  return realm
}
