// Private module — the single source of truth for which libpg-query top-level
// statement types ddlapi supports.
//
// Both buildFromDdl (its dispatch) and the table-DDL extractor (its eligibility
// filter) consume this list, so the extractor's selectable set cannot drift from
// what buildFromDdl actually handles. buildFromDdl's dispatch switch is made
// exhaustive over SupportedStmtType (assertNever), so adding a name here fails to
// compile until a handler case exists.

import { PgNode } from './pgAst'

/** libpg-query top-level statement type-name keys that ddlapi supports. */
export const SUPPORTED_STMT_TYPES = [
  PgNode.CreateStmt,        // CREATE TABLE
  PgNode.IndexStmt,         // CREATE [UNIQUE] INDEX
  PgNode.CommentStmt,       // COMMENT ON ...
  PgNode.CreateDomainStmt,  // CREATE DOMAIN
  PgNode.CreateEnumStmt,    // CREATE TYPE ... AS ENUM
  PgNode.CompositeTypeStmt, // CREATE TYPE ... AS (...)
  PgNode.CreateRangeStmt,   // CREATE TYPE ... AS RANGE
  PgNode.CreateTrigStmt,    // CREATE TRIGGER
] as const

export type SupportedStmtType = typeof SUPPORTED_STMT_TYPES[number]

export const SUPPORTED_STMT_TYPE_SET: ReadonlySet<string> = new Set(SUPPORTED_STMT_TYPES)
