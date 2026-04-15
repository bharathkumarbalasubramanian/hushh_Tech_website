import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  DELETE_ACCOUNT_DELETED_SCOPES,
  DELETE_ACCOUNT_RETAINED_SCOPES,
  DELETE_ACCOUNT_SCHEMA_COVERED_TABLES,
  DELETE_ACCOUNT_SCHEMA_IGNORED_TABLES,
  buildDeleteAccountSuccessPayload,
  buildSignedNdaAssetPathFromUrl,
} from "../supabase/functions/_shared/deleteAccount";

function findUserLinkedTables() {
  const migrationsDir = path.resolve(process.cwd(), "supabase/migrations");
  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql") && file !== "schema.sql")
    .sort();

  const tables = new Set<string>();
  const tablePattern =
    /CREATE TABLE(?: IF NOT EXISTS)?\s+(?:public\.)?([a-zA-Z0-9_]+)\s*\(/gi;
  const userPatterns = [
    /REFERENCES\s+auth\.users/i,
    /REFERENCES\s+public\.users/i,
    /\bsupabase_user_id\s+UUID\b/i,
    /\buser_id\s+(UUID|TEXT)\b/i,
    /\bowner_user_id\s+UUID\b/i,
    /\bactor_user_id\s+UUID\b/i,
    /\btarget_profile_user_id\s+UUID\b/i,
  ];

  for (const file of files) {
    const content = readFileSync(path.join(migrationsDir, file), "utf8");
    const createStatements = content.split(/(?=CREATE TABLE(?: IF NOT EXISTS)?\s+)/i);

    for (const statement of createStatements) {
      const tableMatch = tablePattern.exec(statement);
      tablePattern.lastIndex = 0;

      if (!tableMatch) continue;

      const [, tableName] = tableMatch;
      if (userPatterns.some((pattern) => pattern.test(statement))) {
        tables.add(tableName);
      }
    }
  }

  return [...tables].sort();
}

describe("delete-account shared contract", () => {
  it("builds the structured success payload", () => {
    expect(
      buildDeleteAccountSuccessPayload({
        archivedPaymentAuditRows: 1,
        hushhAiMediaObjectsDeleted: 2,
        ndaAssetObjectsDeleted: 3,
      })
    ).toEqual({
      success: true,
      deletedScopes: DELETE_ACCOUNT_DELETED_SCOPES,
      retainedScopes: DELETE_ACCOUNT_RETAINED_SCOPES,
      details: {
        archivedPaymentAuditRows: 1,
        hushhAiMediaObjectsDeleted: 2,
        ndaAssetObjectsDeleted: 3,
      },
    });
  });

  it("extracts signed NDA asset paths from public storage URLs only", () => {
    expect(
      buildSignedNdaAssetPathFromUrl(
        "https://example.supabase.co/storage/v1/object/public/assets/signed-ndas/nda_user-123_111.pdf"
      )
    ).toBe("signed-ndas/nda_user-123_111.pdf");

    expect(
      buildSignedNdaAssetPathFromUrl(
        "https://example.supabase.co/storage/v1/object/public/assets/other/path.pdf"
      )
    ).toBeNull();
  });
});

describe("delete-account schema coverage", () => {
  it("tracks every user-linked table created by migrations", () => {
    const detectedTables = findUserLinkedTables();
    const coveredTables = new Set(DELETE_ACCOUNT_SCHEMA_COVERED_TABLES);
    const ignoredTables = new Set(DELETE_ACCOUNT_SCHEMA_IGNORED_TABLES);
    const missingTables = detectedTables.filter(
      (table) => !coveredTables.has(table) && !ignoredTables.has(table)
    );

    expect(missingTables).toEqual([]);
  });
});
