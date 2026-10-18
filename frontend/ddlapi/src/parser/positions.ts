// Public exports re-exported from src/index.ts.

/**
 * A byte range in the DDL source string (same representation as libpg-query / libpg_query).
 *   location — zero-based start byte offset (UTF-8)
 *   len      — length in bytes
 */
export interface SourceRange {
  location: number
  len: number
}
