// Public API — the SQL parser surface (WASM-bearing).
//
// This entry is separate from the package root on purpose: it transitively pulls
// in libpg-query and its ~1.1 MB WASM. Only consumers that actually
// parse DDL (api-processor, the UI viewer) should import from here, ideally behind
// a dynamic `import()` so the WASM lands in its own lazily-loaded chunk. Model
// types such as `Realm` are re-exported by the package root, not here.

export { type SourceRange } from './parser/positions'
export {
  buildFromDdl,
  DdlParseError,
  DdlBuildError,
  type DdlNonFatalError,
  type BuildFromDdlOptions,
} from './parser/buildFromDdl'
export {
  prepareDdlExtractor,
  DdlExtractorWarningKind,
  type DdlExtractor,
  type TableRef,
  type TableDdlSlice,
  type DdlExtractorWarning,
} from './parser/extractTableDdl'
