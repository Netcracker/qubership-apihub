import type { ArgTypes } from "@storybook/react-vite";
import type { DebugTableKeyControls } from "./resolve-debug-table-key";

export const DEBUG_TABLE_KEY_ARG_TYPES = {
  useCustomTableKey: {
    control: "boolean",
    description: "When enabled, use tableSchemaName and tableName instead of the first table in parsed DDL.",
  },
  tableSchemaName: {
    control: "text",
    if: { arg: "useCustomTableKey" },
    description: "Schema name for tableKey (e.g. public).",
  },
  tableName: {
    control: "text",
    if: { arg: "useCustomTableKey" },
    description: "Table name for tableKey (e.g. users).",
  },
} satisfies ArgTypes<Required<DebugTableKeyControls>>;

export const DEBUG_TABLE_KEY_DEFAULT_ARGS: Required<DebugTableKeyControls> = {
  useCustomTableKey: false,
  tableSchemaName: "public",
  tableName: "t",
};
