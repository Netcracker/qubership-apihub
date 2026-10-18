// Public API — the ddlapi data model and vocabulary (parser-free, no WASM).
//
// The SQL parser (`buildFromDdl`, `prepareDdlExtractor`) lives in the separate
// './parser' subpath entry. Importing the parser is what pulls in libpg-query and its
// ~1.1 MB WASM, so this entry is deliberately kept parser-free:
// model-only consumers can import the vocabulary
// here without dragging the WASM into their bundles.
//
// Consumers must import from this module, or from
// '@netcracker/qubership-apihub-ddlapi/parser'; internal module paths are unstable.

export * from './constants'
export * from './postgres.constants'
export * from './attrs'
export * from './exprs'
export * from './types'
export * from './schema'
export * from './factories'
export * from './utils'
