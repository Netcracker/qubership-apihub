// Light DDL surface: model-only (parser-free). The parser-bearing pieces
// (`parseDdlFile`, `ddlBuilder`) live in ./ddl.builder and are exposed only via
// the package's `/processor` entry, so importing the api-processor root never
// pulls the ddlapi parser / libpg-query WASM.

export * from './ddl.changes'
export * from './ddl.consts'
export * from './ddl.document'
export * from './ddl.entities'
export * from './ddl.types'
export * from './ddl.utils'
export * from './ddl.validation'
