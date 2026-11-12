// Heavy DDL surface: `parseDdlFile` (and thus `ddlBuilder`) statically import the
// ddlapi parser (pgsql-parser / libpg-query WASM). This module is intentionally
// kept out of the light package root (`index.ts`) and is only reachable via the
// `/processor` entry, so model-only consumers never pull the WASM. See index.ts.

import { ApiBuilder } from '../../types'
import { DDL_CONTRACT_TYPE } from '../../consts'
import { DDL_DOCUMENT_TYPE } from './ddl.consts'
import { parseDdlFile } from './ddl.parser'
import { buildDdlDocument, dumpDdlDocument } from './ddl.document'
import { buildDdlEntities } from './ddl.entities'
import { compareDdlDocuments } from './ddl.changes'
import { ParsedDdlData } from './ddl.types'

export * from './ddl.parser'

// Per D13 there is no `createExportDocument` (DDL export is out of scope for v1).
export const ddlBuilder: ApiBuilder<ParsedDdlData> = {
  apiType: DDL_CONTRACT_TYPE,
  types: Object.values(DDL_DOCUMENT_TYPE),
  parser: parseDdlFile,
  buildDocument: buildDdlDocument,
  dumpDocument: dumpDdlDocument,
  buildDdlEntities,
  compareDdlDocuments,
}
