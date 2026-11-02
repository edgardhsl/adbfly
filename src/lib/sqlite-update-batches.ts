export type PendingSqliteRow = {
  rowKey: string;
  pkValue: unknown;
  changes: Record<string, string>;
};

export type SqliteUpdateBatch = {
  sql: string;
  params: Array<string | number>;
  rowKeys: string[];
};

const MAX_SQLITE_PARAMETERS = 900; // compatible with older 999-variable SQLite builds

function quoteIdentifier(identifier: string): string {
  if (!identifier || identifier.includes("\0")) throw new Error("Identificador SQLite inválido.");
  return '"' + identifier.replaceAll('"', '""') + '"';
}

/**
 * Groups cell updates into CASE expressions. Each batch is ONE parameterized
 * UPDATE statement, reducing remote full-database transfers from N to ~1.
 * Batches cannot exceed the lowest supported SQLite variable limit (999).
 */
export function buildSqliteUpdateBatches(
  table: string,
  primaryKey: string,
  updates: PendingSqliteRow[],
): SqliteUpdateBatch[] {
  const tableName = quoteIdentifier(table);
  const pk = quoteIdentifier(primaryKey);
  const output: SqliteUpdateBatch[] = [];
  const groups: PendingSqliteRow[][] = [];
  let group: PendingSqliteRow[] = [];
  let placeholders = 0;

  for (const row of updates) {
    const entries = Object.entries(row.changes);
    if (!entries.length) continue;
    if (typeof row.pkValue !== "string" && typeof row.pkValue !== "number") {
      throw new Error("Chave primária inválida no lote de alterações.");
    }
    if (typeof row.pkValue === "number" && !Number.isSafeInteger(row.pkValue)) {
      throw new Error("Chave primária numérica fora do intervalo seguro.");
    }
    for (const [column] of entries) quoteIdentifier(column);
    const required = entries.length * 2 + 1;
    if (required > MAX_SQLITE_PARAMETERS) {
      throw new Error("Uma linha possui colunas demais para atualização em lote.");
    }
    if (group.length && placeholders + required > MAX_SQLITE_PARAMETERS) {
      groups.push(group);
      group = [];
      placeholders = 0;
    }
    group.push(row);
    placeholders += required;
  }
  if (group.length) groups.push(group);

  for (const rows of groups) {
    const byColumn = new Map<string, Array<{ pk: string | number; value: string }>>();
    for (const row of rows) {
      const key = row.pkValue as string | number;
      for (const [column, value] of Object.entries(row.changes)) {
        const pairs = byColumn.get(column) ?? [];
        pairs.push({ pk: key, value });
        byColumn.set(column, pairs);
      }
    }
    const params: Array<string | number> = [];
    const assignments: string[] = [];
    for (const [column, cases] of byColumn) {
      const name = quoteIdentifier(column);
      assignments.push(`${name} = CASE ${pk} ${cases.map(() => "WHEN ? THEN ?").join(" ")} ELSE ${name} END`);
      for (const entry of cases) params.push(entry.pk, entry.value);
    }
    const where = rows.map(() => "?").join(", ");
    for (const row of rows) params.push(row.pkValue as string | number);
    if (params.length > MAX_SQLITE_PARAMETERS) throw new Error("Lote SQLite excedeu o limite de parâmetros.");
    output.push({
      sql: `UPDATE ${tableName} SET ${assignments.join(", ")} WHERE ${pk} IN (${where})`,
      params,
      rowKeys: rows.map((row) => row.rowKey),
    });
  }
  return output;
}
