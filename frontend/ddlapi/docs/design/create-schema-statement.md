# ddlapi: CREATE SCHEMA publishes with errors

Nov 12, 2026 · Sergei Komarov

## Summary

`CREATE SCHEMA` is a statement ddlapi skips, and api-processor reports every skipped statement as an `Error`
notification. A DDL document that creates its schemas, as every `pg_dump` output does, therefore publishes with one
error per `CREATE SCHEMA`, although the model ddlapi builds loses nothing for a schema that holds objects.

**Decision requested:** handle `CREATE SCHEMA` in ddlapi (option 1 below), or stop api-processor from reporting it
(option 2). Until then, the QA test plans leave the statement out of their DDL packages.

## Background

- ddlapi lists `CREATE SCHEMA` among the out-of-scope statements on purpose: a schema is inferred from the qualified
  names of the objects in it ([build-from-ddl-plan.md](../archive/build-from-ddl-plan.md)). `buildFromDdl` reports
  the statement as an `out-of-scope-statement` issue (`Statement type 'CreateSchemaStmt' is not supported`) and goes
  on.
- api-processor turns every non-fatal ddlapi issue into a notification of severity `Error`
  (`frontend/api-processor/src/apitypes/ddl/ddl.validation.ts`): an out-of-scope statement may leave the contract
  incomplete, and a release must not ship an incomplete DDL contract. The publication is not aborted.

The two rules were made separately; together they treat a statement that changes nothing as an incomplete contract.

## What it costs

| Input | Model ddlapi builds | Issues, published as `Error` |
| --- | --- | --- |
| `CREATE SCHEMA sales;` and `CREATE TABLE sales.orders (…)` | Schema `sales` with `orders`: complete | `out-of-scope-statement` |
| The same with `COMMENT ON SCHEMA sales IS '…'` | Complete, with the comment | `out-of-scope-statement` |
| `CREATE SCHEMA audit;` and `COMMENT ON SCHEMA audit IS '…'`, no objects | No schema `audit` | `out-of-scope-statement`, and `unresolved-reference` (`COMMENT ON SCHEMA: unknown schema 'audit'`) |

- Real documents: `pg_dump` writes `CREATE SCHEMA` for every schema but `public`, so a dump of a database with its own
  schemas cannot be published as a release without errors.
- Fixtures: 590 of the 697 DDL fixtures of api-doc-viewer (`packages/samples/ddlapi*`) start with
  `CREATE SCHEMA IF NOT EXISTS public;` or create a custom schema, and `CreateSchemaStmt` is the only issue ddlapi
  reports for any of them. For all 590, the model is the same with the statement removed.
- An empty schema is absent from the model, and a comment on it fails to resolve: only an empty schema actually
  loses content.

## Options

1. **ddlapi handles `CREATE SCHEMA`.** Add `CreateSchemaStmt` to the supported statements: register the schema (empty
   until objects arrive) and report nothing. An empty schema and its comment then appear in the model. The change is
   in the parser and its tests, and supersedes the out-of-scope entry of the build-from-ddl plan. Whether the
   consumers (api-doc-viewer, api-diff, api-processor) handle a schema without objects is not checked yet.
2. **api-processor does not report it.** ddlapi keeps skipping the statement; `validateDdlDocument` drops an
   `out-of-scope-statement` issue whose `statementType` is `CreateSchemaStmt`, or lowers it to `Information`.
   Smaller, but an empty schema and its comment stay lost, and the comment still publishes as an `Error`.
3. **Remove the statement from the documents.** Possible for fixtures, not for the documents users publish.

Option 1 fixes the cause and the empty-schema case; option 2 is enough when empty schemas do not matter.

## Workaround in place

The `api-doc-viewer-feature-test-plan` skill leaves `CREATE SCHEMA` out of the DDL packages it builds for QA
(`scripts/packing/builders/regression.mjs`, `prefixDdlSchemas`), and its check fails on any ddlapi issue in a packed
document (`scripts/packing/formats/ddl.mjs`). The fixtures keep the statement.
