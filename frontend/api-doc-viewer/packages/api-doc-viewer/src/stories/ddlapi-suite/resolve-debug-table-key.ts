import type { Realm } from "@netcracker/qubership-apihub-ddlapi";
import type { TableKey } from "@netcracker/qubership-apihub-next-data-model/shared/ddlapi/types/table-key";

export type DebugTableKeyControls = {
  useCustomTableKey?: boolean;
  tableSchemaName?: string;
  tableName?: string;
};

export const resolveTableKeyFromRealm = (realm: Realm): TableKey | null => {
  for (const schema of realm.schemas ?? []) {
    const table = schema.tables?.[0];
    if (table) {
      return {
        schemaName: schema.name,
        name: table.name,
      };
    }
  }

  return null;
};

export const resolveDebugTableKey = (
  controls: DebugTableKeyControls,
  autoTableKey: TableKey | null,
): TableKey | null => {
  if (!controls.useCustomTableKey) {
    return autoTableKey;
  }

  const schemaName = controls.tableSchemaName?.trim() ?? "";
  const name = controls.tableName?.trim() ?? "";
  if (!schemaName || !name) {
    console.warn(
      "[DDL debug] useCustomTableKey is enabled but tableSchemaName and/or tableName is empty — falling back to auto-detected table key.",
    );
    return autoTableKey;
  }

  return { schemaName, name };
};
