import { buildFromDdl, prepareDdlExtractor, type DdlNonFatalError } from '@netcracker/qubership-apihub-ddlapi/parser'
import { FILE_KIND, TextFile } from '../../types'
import { getFileExtension } from '../../utils'
import { DDL_DOCUMENT_TYPE, isDdlFileExtension } from './ddl.consts'
import { ParsedDdlData } from './ddl.types'

/**
 * Parses a single `.sql`/`.ddl` file into its own self-sufficient Realm (D6).
 *
 * - A non-`.sql`/`.ddl` file returns `undefined` so the next builder in the chain can claim it.
 * - Valid SQL yields `{ realm, originalSql }`; `source` keeps the original bytes verbatim.
 * - Non-fatal `buildFromDdl` issues (out-of-scope statement, unresolved reference, duplicate, …) are
 *   collected onto `TextFile.errors`; severity mapping happens later (Task 12).
 * - A hard `DdlParseError` (invalid SQL) is NOT swallowed — it propagates and breaks the publish.
 */
export const parseDdlFile = async (
  fileId: string,
  source: Blob,
): Promise<TextFile<ParsedDdlData, DdlNonFatalError> | undefined> => {
  const extension = getFileExtension(fileId)
  if (!isDdlFileExtension(extension)) {
    return undefined
  }

  const originalSql = await source.text()

  const issues: DdlNonFatalError[] = []
  // DdlParseError (invalid SQL syntax) is intentionally left to propagate — do not catch it here.
  // Both calls parse the SQL (WASM); run them together. The extractor indexes `originalSql` once so
  // buildDdlEntities can slice per-table SQL synchronously.
  const [realm, extractor] = await Promise.all([
    buildFromDdl(originalSql, { onError: (issue) => issues.push(issue) }),
    prepareDdlExtractor(originalSql),
  ])

  return {
    fileId,
    type: DDL_DOCUMENT_TYPE.DDL,
    format: extension,
    // issues ride on ParsedDdlData (not TextFile.errors) so the generic parse→Error path is bypassed;
    // severity is mapped per-kind during build validation (Task 12)
    data: { realm, originalSql, extractor, issues },
    source,
    kind: FILE_KIND.TEXT,
  }
}
