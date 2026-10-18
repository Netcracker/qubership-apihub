import { DdlTableViewer } from "@apihub/components/DdlTableViewer/DdlTableViewer";
import type { Realm } from "@netcracker/qubership-apihub-ddlapi";
import type { TableKey } from "@netcracker/qubership-apihub-next-data-model/shared/ddlapi/types/table-key";
import { FC, useEffect, useState } from "react";
import { buildFromDdlInBrowser, realmHasTables } from "./build-from-ddl-browser";
import {
  type DebugTableKeyControls,
  resolveDebugTableKey,
  resolveTableKeyFromRealm,
} from "./resolve-debug-table-key";
import { ddlStoryNavigationLinkBuilder } from "./ddl-story-navigation";

export const DEFAULT_DDL = `CREATE TABLE users (
  id bigint PRIMARY KEY,
  email varchar(255) NOT NULL,
  created_at timestamp DEFAULT now()
);`;

export type BuildFromDdlDebugProps = {
  ddlText: string;
} & DebugTableKeyControls;

export const BuildFromDdlDebug: FC<BuildFromDdlDebugProps> = ({
  ddlText,
  useCustomTableKey,
  tableSchemaName,
  tableName,
}) => {
  const [realm, setRealm] = useState<Realm | null>(null);
  const [tableKey, setTableKey] = useState<TableKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);
    setRealm(null);
    setTableKey(null);

    buildFromDdlInBrowser(ddlText)
      .then((result) => {
        if (!cancelled) {
          setRealm(result);
          setTableKey(
            resolveDebugTableKey(
              { useCustomTableKey, tableSchemaName, tableName },
              resolveTableKeyFromRealm(result),
            ),
          );
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
  }, [ddlText, useCustomTableKey, tableSchemaName, tableName]);

  if (loading) {
    return <p>Parsing DDL…</p>;
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

  if (!realm || !tableKey) {
    return null;
  }

  if (!realmHasTables(realm)) {
    return (
      <p>
        Parsed DDL contains no tables. Statements such as <code>CREATE SCHEMA</code> are ignored
        by ddlapi — add a <code>CREATE TABLE</code> (or use the diffs suite for before/after pairs).
      </p>
    );
  }

  return (
    <DdlTableViewer
      source={realm}
      tableKey={tableKey}
      navigationLinkBuilder={ddlStoryNavigationLinkBuilder}
      devMode={true}
    />
  );
};
