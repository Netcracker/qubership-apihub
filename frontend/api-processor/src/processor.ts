// Heavy entry: the spec-processing engine. This is a superset of the light root
// plus PackageVersionBuilder, the build strategy, the compare/build engine and the
// DDL builder. It transitively imports the ddlapi parser (pgsql-parser / libpg-query
// WASM), so import it only where actual processing happens (publish/changelog/export
// workers, build-task-consumer) — never on the UI main thread.

export * from './index'
export * from './builder'
export * from './builder-strategy'
export * from './components'
export * from './apitypes/ddl/ddl.builder'
