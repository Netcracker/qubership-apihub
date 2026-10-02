import { DdlTableDiffsViewer } from "@apihub/components/DdlTableViewer/DdlTableDiffsViewer";
import { DisplayMode } from "@apihub/types/DisplayMode";
import { apiDiff } from "@netcracker/qubership-apihub-api-diff";
import type { Realm } from "@netcracker/qubership-apihub-ddlapi";
import { TableKey } from "@netcracker/qubership-apihub-next-data-model/shared/ddlapi/types/table-key";
import { FC, useEffect, useState } from "react";
import {
  buildFromDdlInBrowser,
  realmHasTables,
  resolveDdlDiffComparePair,
} from "../ddlapi-suite/build-from-ddl-browser";
import { TEST_DIFF_META_KEYS } from "./shared-test-data";

export const DEFAULT_BEFORE_DDL = `CREATE SCHEMA IF NOT EXISTS public;

CREATE TABLE public.t (
  id integer
);`;

export const DEFAULT_AFTER_DDL = `CREATE SCHEMA IF NOT EXISTS public;

CREATE TABLE public.t (
  id integer,
  shareability_status varchar DEFAULT 'unknown'::character varying NOT NULL
);`;

export type BuildFromDdlDiffsDebugProps = {
  beforeSql: string;
  afterSql: string;
  displayMode?: DisplayMode;
};

const navigationLinkBuilder = (schema: string, table: string, column: string) => {
  console.log(`Navigating to ${schema}.${table}.${column}`);
  return `#${schema}.${table}.${column}`;
};

type TablePresence = "both" | "before" | "after";

type TableOption = {
  id: string;
  tableKey: TableKey;
  presence: TablePresence;
};

type PreparedMergedSource = {
  mergedSource: Realm;
  tableOptions: TableOption[];
};

const PRESENCE_LABELS: Record<TablePresence, string> = {
  both: "",
  before: " (before only)",
  after: " (after only)",
};

const tableId = ({ schemaName, name }: TableKey): string => `${schemaName}.${name}`;

const tableIds = (realm: Realm): Set<string> =>
  new Set(
    (realm.schemas ?? []).flatMap((schema) =>
      (schema.tables ?? []).map((table) => tableId({ schemaName: schema.name, name: table.name })),
    ),
  );

// Every table of the merged realm, which holds the tables of both sides, marked with the side
// it comes from.
const resolveTableOptions = (merged: Realm, before: Realm, after: Realm): TableOption[] => {
  const beforeIds = tableIds(before);
  const afterIds = tableIds(after);
  return (merged.schemas ?? []).flatMap((schema) =>
    (schema.tables ?? []).map((table) => {
      const tableKey = { schemaName: schema.name, name: table.name };
      const id = tableId(tableKey);
      const presence: TablePresence = !afterIds.has(id) ? "before" : !beforeIds.has(id) ? "after" : "both";
      return { id, tableKey, presence };
    }),
  );
};

const prepareMergedSource = async (
  beforeSql: string,
  afterSql: string,
): Promise<PreparedMergedSource> => {
  const [beforeRealm, afterRealm] = await Promise.all([
    buildFromDdlInBrowser(beforeSql),
    buildFromDdlInBrowser(afterSql),
  ]);
  const { before, after } = resolveDdlDiffComparePair(beforeRealm, afterRealm);

  console.debug("Parsed before realm:", before);
  console.debug("Parsed after realm:", after);

  const { merged } = apiDiff(before, after, {
    unify: true,
    validate: true,
    metaKey: TEST_DIFF_META_KEYS.diffsMetaKey,
    normalizedResult: false,
  }) as { merged: Realm };

  console.debug("Merged diffs realm:", merged);
  console.log("TEST_DIFF_META_KEYS", TEST_DIFF_META_KEYS);

  const tableOptions = resolveTableOptions(merged, before, after);
  if (tableOptions.length === 0) {
    throw new Error("Merged DDL contains no tables — add a CREATE TABLE to before and/or after SQL.");
  }

  return { mergedSource: merged, tableOptions };
};

export const BuildFromDdlDiffsDebug: FC<BuildFromDdlDiffsDebugProps> = ({
  beforeSql,
  afterSql,
  displayMode,
}) => {
  const [mergedSource, setMergedSource] = useState<Realm | null>(null);
  const [tableOptions, setTableOptions] = useState<TableOption[]>([]);
  // Kept across SQL edits, so the viewer stays on the chosen table while it still exists.
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);
    setMergedSource(null);
    setTableOptions([]);

    prepareMergedSource(beforeSql, afterSql)
      .then((result) => {
        if (!cancelled) {
          setMergedSource(result.mergedSource);
          setTableOptions(result.tableOptions);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [beforeSql, afterSql]);

  if (loading) {
    return <p>Parsing before/after DDL and building merged diffs…</p>;
  }

  if (error) {
    return (
      <pre
        style={{
          color: "#cf222e",
          padding: 12,
          background: "#fff5f5",
          border: "1px solid #ffccc7",
          borderRadius: 4,
        }}
      >
        {error}
      </pre>
    );
  }

  const selectedTable =
    tableOptions.find((option) => option.id === selectedTableId) ?? tableOptions[0];

  if (!mergedSource || !selectedTable) {
    return null;
  }

  if (!realmHasTables(mergedSource)) {
    return (
      <p>
        Merged DDL contains no tables. Add a <code>CREATE TABLE</code> to before and/or after SQL
        (schema-only statements are normalised via empty realm shells when the other side has tables).
      </p>
    );
  }

  return (
    <>
      <label style={{ display: "inline-flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        Table
        <select
          value={selectedTable.id}
          onChange={(event) => setSelectedTableId(event.target.value)}
        >
          {tableOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.id}
              {PRESENCE_LABELS[option.presence]}
            </option>
          ))}
        </select>
      </label>
      <DdlTableDiffsViewer
        key={`${btoa(beforeSql)}-${btoa(afterSql)}-${selectedTable.id}`}
        mergedSource={mergedSource}
        tableKey={selectedTable.tableKey}
        navigationLinkBuilder={navigationLinkBuilder}
        diffMetaKeys={TEST_DIFF_META_KEYS}
        displayMode={displayMode}
        devMode={true}
      />
    </>
  );
};
