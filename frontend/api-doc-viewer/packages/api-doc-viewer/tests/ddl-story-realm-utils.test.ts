import { describe, expect, test } from "@jest/globals";
import type { Realm } from "@netcracker/qubership-apihub-ddlapi";
import {
  emptyRealmLike,
  realmHasTables,
  resolveDdlDiffComparePair,
} from "../src/stories/ddlapi-suite/ddl-story-realm-utils";

const AFTER_REALM: Realm = {
  ddlapi: "1.0.0",
  schemas: [{ name: "public", tables: [{ kind: "Table", name: "t", columns: [] }] }],
};

const BEFORE_CREATE_SCHEMA_ONLY: Realm = {
  ddlapi: "1.0.0",
  schemas: [],
};

describe("ddl-story-realm-utils", () => {
  test("realmHasTables is false for CREATE SCHEMA-only Realm", () => {
    expect(realmHasTables(BEFORE_CREATE_SCHEMA_ONLY)).toBe(false);
    expect(realmHasTables(AFTER_REALM)).toBe(true);
  });

  test("emptyRealmLike copies schema names with empty tables", () => {
    expect(emptyRealmLike(AFTER_REALM)).toEqual({
      ddlapi: "1.0.0",
      schemas: [{ name: "public", tables: [] }],
    });
  });

  test("resolveDdlDiffComparePair substitutes emptyRealmLike when before has no tables", () => {
    const { before, after } = resolveDdlDiffComparePair(BEFORE_CREATE_SCHEMA_ONLY, AFTER_REALM);
    expect(before).toEqual(emptyRealmLike(AFTER_REALM));
    expect(after).toBe(AFTER_REALM);
  });
});
