import { DdlTableViewer } from "@apihub/components/DdlTableViewer/DdlTableViewer";
import type { Realm } from "@netcracker/qubership-apihub-ddlapi";
import { FC, useEffect, useState } from "react";
import { buildFromDdlInBrowser } from "./build-from-ddl-browser";

export const DEFAULT_DDL = `CREATE TABLE users (
  id bigint PRIMARY KEY,
  email varchar(255) NOT NULL,
  created_at timestamp DEFAULT now()
);`;

export type BuildFromDdlDebugProps = {
  ddlText: string;
};

const navigationLinkBuilder = (schema: string, table: string, column: string) => {
  console.log(`Navigating to ${schema}.${table}.${column}`);
  return `#${schema}.${table}.${column}`;
};

export const BuildFromDdlDebug: FC<BuildFromDdlDebugProps> = ({ ddlText }) => {
  const [realm, setRealm] = useState<Realm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);
    setRealm(null);

    buildFromDdlInBrowser(ddlText)
      .then((result) => {
        if (!cancelled) {
          setRealm(result);
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
  }, [ddlText]);

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

  if (!realm) {
    return null;
  }

  const schema = realm.schemas[0];
  if (!schema) {
    return null;
  }
  const table = schema.tables?.[0];
  if (!table) {
    return null;
  }

  const tableKey = {
    schemaName: schema.name,
    name: table.name,
  };

  return (
    <DdlTableViewer
      source={realm}
      tableKey={tableKey}
      navigationLinkBuilder={navigationLinkBuilder}
      devMode={true}
    />
  );
};
