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

const resolveTableKeyFromRealm = (realm: Realm): TableKey | null => {
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

const prepareMergedSource = async (
  beforeSql: string,
  afterSql: string,
): Promise<{ mergedSource: Realm; tableKey: TableKey }> => {
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

  const tableKey = resolveTableKeyFromRealm(merged);
  if (!tableKey) {
    throw new Error("Merged DDL contains no tables — add a CREATE TABLE to before and/or after SQL.");
  }

  return { mergedSource: merged, tableKey };
};

export const BuildFromDdlDiffsDebug: FC<BuildFromDdlDiffsDebugProps> = ({
  beforeSql,
  afterSql,
  displayMode,
}) => {
  const [mergedSource, setMergedSource] = useState<Realm | null>(null);
  const [tableKey, setTableKey] = useState<TableKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);
    setMergedSource(null);
    setTableKey(null);

    prepareMergedSource(beforeSql, afterSql)
      .then((result) => {
        if (!cancelled) {
          setMergedSource(result.mergedSource);
          setTableKey(result.tableKey);
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

  if (!mergedSource || !tableKey) {
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
    <DdlTableDiffsViewer
      key={`${btoa(beforeSql)}-${btoa(afterSql)}`}
      mergedSource={mergedSource}
      tableKey={tableKey}
      navigationLinkBuilder={navigationLinkBuilder}
      diffMetaKeys={TEST_DIFF_META_KEYS}
      displayMode={displayMode}
      devMode={true}
    />
  );
};
