import { parse } from 'libpg-query'

/**
 * Asserts that the given SQL string is valid PostgreSQL syntax.
 * Throws a descriptive error if parsing fails.
 * Using libpg-query (libpg_query WASM) as the authoritative syntax certificate.
 */
export async function assertValidSql(sql: string, label?: string): Promise<void> {
  try {
    await parse(sql)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(`${label ? `[${label}] ` : ''}SQL syntax error: ${msg}\n\nSQL:\n${sql}`)
  }
}
