import type { Realm } from "@netcracker/qubership-apihub-ddlapi";
import type { BuildFromDdlOptions } from "@netcracker/qubership-apihub-ddlapi/parser";

/**
 * Parses DDL in the browser using the real pgsql-parser / libpg-query stack.
 *
 * The parser lives in ddlapi's dedicated '/parser' entry, which is its own async
 * chunk: libpg-query stays out of the model bundle and does not initialise WASM
 * for unrelated Storybook stories (GraphQL, JSO, …).
 */
export async function buildFromDdlInBrowser(
  ddl: string,
  options?: BuildFromDdlOptions,
): Promise<Realm> {
  const { buildFromDdl } = await import("@netcracker/qubership-apihub-ddlapi/parser");
  return buildFromDdl(ddl, options);
}
