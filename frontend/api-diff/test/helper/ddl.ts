import { buildFromDdl } from '@netcracker/qubership-apihub-ddlapi/parser'
import { apiDiff } from '../../src'
import { CompareOptions, CompareResult } from '../../src/types'

/**
 * Build a ddlapi `Realm` from a full `CREATE*` / `COMMENT ON` DDL snapshot.
 * `buildFromDdl` is async (first call initialises the parser WASM); the built Realm
 * carries the `ddlapi` version stamp so `resolveSpec` routes it to `ddlapi-1.0`.
 */
export const buildRealm = (ddl: string): Promise<unknown> => buildFromDdl(ddl)

/**
 * Diff two DDL snapshots end-to-end: parse each through `buildFromDdl`, then `apiDiff`
 * (which normalizes internally). Fixtures are authored as raw SQL — the real
 * parser→model→diff path — rather than hand-built Realm graphs.
 */
export const diffSql = async (
  beforeSql: string,
  afterSql: string,
  options?: CompareOptions,
): Promise<CompareResult> => {
  const [before, after] = await Promise.all([buildFromDdl(beforeSql), buildFromDdl(afterSql)])
  return apiDiff(before, after, options)
}
