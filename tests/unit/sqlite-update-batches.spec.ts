import { expect, test } from "@playwright/test";
import { buildSqliteUpdateBatches } from "../../src/lib/sqlite-update-batches";

test("escapes identifiers while binding literal NULL, apostrophes and numeric-looking text", () => {
  const batches = buildSqliteUpdateBatches('odd"table', "id", [
    { rowKey: "1", pkValue: 1, changes: { name: "O'Brien", score: "001", optional: "NULL" } },
    { rowKey: "2", pkValue: 2, changes: { name: "updated" } },
  ]);
  expect(batches).toHaveLength(1);
  expect(batches[0].sql).toContain('UPDATE "odd""table"');
  expect(batches[0].sql).toContain('CASE "id" WHEN ? THEN ?');
  expect(batches[0].sql).not.toContain("O'Brien");
  expect(batches[0].params).toContain("O'Brien");
  expect(batches[0].params).toContain("001");
  expect(batches[0].params).toContain("NULL");
  expect(batches[0].rowKeys).toEqual(["1", "2"]);
});

test("chunks large sets below SQLite 999 variable limit", () => {
  const edits = Array.from({ length: 350 }, (_, i) => ({
    rowKey: String(i), pkValue: i, changes: { title: "row-" + i },
  }));
  const batches = buildSqliteUpdateBatches("records", "rowId", edits);
  expect(batches).toHaveLength(2);
  expect(batches.reduce((count, batch) => count + batch.rowKeys.length, 0)).toBe(350);
  expect(batches.every((batch) => batch.params.length <= 900)).toBeTruthy();
});

test("refuses non-scalar or unsafe primary keys", () => {
  expect(() => buildSqliteUpdateBatches("records", "id", [
    { rowKey: "x", pkValue: null, changes: { name: "foo" } },
  ])).toThrow(/Chave primária/);
  expect(() => buildSqliteUpdateBatches("records", "id", [
    { rowKey: "x", pkValue: Number.MAX_SAFE_INTEGER + 10, changes: { name: "foo" } },
  ])).toThrow(/intervalo seguro/);
});
