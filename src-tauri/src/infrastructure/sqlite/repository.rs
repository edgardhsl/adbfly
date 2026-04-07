use tempfile::TempDir;

use crate::domain::entities::{
    DatabaseInfo, FilterInfo, SortInfo, SqlResult, TableData, TableSchema,
};
use crate::infrastructure::adb::AdbAdapter;

pub struct SqliteRepository {
    adb: AdbAdapter,
}

impl SqliteRepository {
    pub fn new() -> Self {
        Self {
            adb: AdbAdapter::new(),
        }
    }

    fn pull_database(
        &self,
        device_id: &str,
        package: &str,
        db_name: &str,
    ) -> Result<(TempDir, std::path::PathBuf), String> {
        let temp_dir =
            tempfile::tempdir().map_err(|e| format!("Failed to create temp dir: {}", e))?;

        let local_path = temp_dir.path().join(db_name);
        let _local_path_str = local_path.to_string_lossy().to_string();

        let data = self.adb.pull_database_base64(device_id, package, db_name)?;

        std::fs::write(&local_path, data)
            .map_err(|e| format!("Failed to write database file: {}", e))?;

        Ok((temp_dir, local_path))
    }

    pub fn list_databases(
        &self,
        device_id: &str,
        package_name: &str,
    ) -> Result<Vec<DatabaseInfo>, String> {
        let run_as_cmd = format!("run-as {} ls -la databases/", package_name);
        let output = self.adb.shell(device_id, &run_as_cmd);

        let mut databases = Vec::new();

        if let Ok(output) = output {
            for line in output.lines() {
                let is_db =
                    line.contains(".db") || line.contains(".sqlite") || line.contains(".sqlite3");
                if is_db {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if parts.len() >= 5 {
                        let name = parts[parts.len() - 1].to_string();
                        let is_journal = name.contains("-journal")
                            || name.contains("-wal")
                            || name.contains("-shm");
                        if !is_journal {
                            let size: Option<u64> = parts[4].parse().ok();
                            databases.push(DatabaseInfo {
                                name: name.clone(),
                                path: format!("/data/data/{}/databases/{}", package_name, name),
                                size,
                            });
                        }
                    }
                }
            }
        }

        Ok(databases)
    }

    pub fn list_tables(
        &self,
        device_id: &str,
        package_name: &str,
        db_name: &str,
    ) -> Result<Vec<String>, String> {
        let (_temp_dir, local_path) = self.pull_database(device_id, package_name, db_name)?;

        let conn = rusqlite::Connection::open(&local_path)
            .map_err(|e| format!("Failed to open database: {}", e))?;

        let mut stmt = conn
            .prepare(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
            )
            .map_err(|e| format!("Failed to prepare: {}", e))?;

        let tables: Vec<String> = stmt
            .query_map([], |row| row.get(0))
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        Ok(tables)
    }

    pub fn get_table_schema(
        &self,
        device_id: &str,
        package_name: &str,
        db_name: &str,
        table: &str,
    ) -> Result<TableSchema, String> {
        let (_temp_dir, local_path) = self.pull_database(device_id, package_name, db_name)?;

        let conn = rusqlite::Connection::open(&local_path)
            .map_err(|e| format!("Failed to open database: {}", e))?;

        let mut stmt = conn
            .prepare(&format!("PRAGMA table_info('{}')", table))
            .map_err(|e| format!("Failed to prepare: {}", e))?;

        let columns: Vec<_> = stmt
            .query_map([], |row| {
                let pk: i32 = row.get(5)?;
                Ok(crate::domain::entities::ColumnInfo {
                    name: row.get(1)?,
                    col_type: row.get(2)?,
                    nullable: row.get::<_, i32>(3)? == 0,
                    primary_key: pk > 0,
                })
            })
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        Ok(TableSchema {
            name: table.to_string(),
            columns,
        })
    }

    pub fn get_table_data(
        &self,
        device_id: &str,
        package_name: &str,
        db_name: &str,
        table: &str,
        page: u32,
        page_size: u32,
        sort: Option<SortInfo>,
        filters: Option<Vec<FilterInfo>>,
    ) -> Result<TableData, String> {
        let (_temp_dir, local_path) = self.pull_database(device_id, package_name, db_name)?;

        let conn = rusqlite::Connection::open(&local_path)
            .map_err(|e| format!("Failed to open database: {}", e))?;

        let mut sql = format!("SELECT * FROM \"{}\"", table);
        let mut count_sql = format!("SELECT COUNT(*) FROM \"{}\"", table);

        if let Some(filters) = &filters {
            if !filters.is_empty() {
                let filter_clauses: Vec<String> = filters
                    .iter()
                    .filter(|f| !f.value.is_empty())
                    .map(|f| {
                        let val = f.value.trim();
                        if val.parse::<f64>().is_ok() {
                            format!("\"{}\" = {}", f.column, val)
                        } else {
                            format!("\"{}\" LIKE '%{}%'", f.column, val.replace("'", "''"))
                        }
                    })
                    .collect();
                if !filter_clauses.is_empty() {
                    let where_clause = format!(" WHERE {}", filter_clauses.join(" AND "));
                    sql.push_str(&where_clause);
                    count_sql.push_str(&where_clause);
                }
            }
        }

        if let Some(sort) = &sort {
            sql.push_str(&format!(" ORDER BY \"{}\" {}", sort.column, sort.direction));
        }

        let offset = (page.saturating_sub(1)) * page_size;
        sql.push_str(&format!(" LIMIT {} OFFSET {}", page_size, offset));

        let total_rows: u64 = conn
            .query_row(&count_sql, [], |row| row.get(0))
            .unwrap_or(0);

        let mut stmt = conn
            .prepare(&sql)
            .map_err(|e| format!("Failed to prepare query: {}", e))?;

        let column_names: Vec<String> = stmt.column_names().iter().map(|s| s.to_string()).collect();

        let rows: Vec<serde_json::Value> = stmt
            .query_map([], |row| {
                let mut map = serde_json::Map::new();
                for (i, name) in column_names.iter().enumerate() {
                    let value: rusqlite::types::Value = row.get(i)?;
                    let json_value = match value {
                        rusqlite::types::Value::Null => serde_json::Value::Null,
                        rusqlite::types::Value::Integer(i) => serde_json::Value::Number(i.into()),
                        rusqlite::types::Value::Real(f) => serde_json::Value::Number(
                            serde_json::Number::from_f64(f).unwrap_or(serde_json::Number::from(0)),
                        ),
                        rusqlite::types::Value::Text(s) => serde_json::Value::String(s),
                        rusqlite::types::Value::Blob(b) => {
                            serde_json::Value::String(format!("<blob: {} bytes>", b.len()))
                        }
                    };
                    map.insert(name.clone(), json_value);
                }
                Ok(serde_json::Value::Object(map))
            })
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        Ok(TableData {
            columns: column_names,
            rows,
            total_rows,
        })
    }

    pub fn execute_sql(
        &self,
        device_id: &str,
        package_name: &str,
        db_name: &str,
        sql: &str,
    ) -> Result<SqlResult, String> {
        let (_temp_dir, local_path) = self.pull_database(device_id, package_name, db_name)?;

        let conn = rusqlite::Connection::open(&local_path)
            .map_err(|e| format!("Failed to open database: {}", e))?;

        let is_select = sql.trim().to_uppercase().starts_with("SELECT");

        if is_select {
            let mut stmt = conn
                .prepare(sql)
                .map_err(|e| format!("Failed to prepare: {}", e))?;

            let column_names: Vec<String> =
                stmt.column_names().iter().map(|s| s.to_string()).collect();

            let rows: Vec<serde_json::Value> = stmt
                .query_map([], |row| {
                    let mut map = serde_json::Map::new();
                    for (i, name) in column_names.iter().enumerate() {
                        let value: rusqlite::types::Value = row.get(i)?;
                        let json_value = match value {
                            rusqlite::types::Value::Null => serde_json::Value::Null,
                            rusqlite::types::Value::Integer(i) => {
                                serde_json::Value::Number(i.into())
                            }
                            rusqlite::types::Value::Real(f) => serde_json::Value::Number(
                                serde_json::Number::from_f64(f)
                                    .unwrap_or(serde_json::Number::from(0)),
                            ),
                            rusqlite::types::Value::Text(s) => serde_json::Value::String(s),
                            rusqlite::types::Value::Blob(b) => {
                                serde_json::Value::String(format!("<blob: {} bytes>", b.len()))
                            }
                        };
                        map.insert(name.clone(), json_value);
                    }
                    Ok(serde_json::Value::Object(map))
                })
                .map_err(|e| e.to_string())?
                .filter_map(|r| r.ok())
                .collect();

            Ok(SqlResult {
                success: true,
                message: format!("{} rows returned", rows.len()),
                columns: column_names,
                rows,
                rows_affected: 0,
            })
        } else {
            let rows_affected =
                conn.execute(sql, [])
                    .map_err(|e| format!("Failed to execute: {}", e))? as u64;

            drop(conn);

            let data = std::fs::read(&local_path)
                .map_err(|e| format!("Failed to read modified database: {}", e))?;

            self.adb
                .push_database(device_id, package_name, db_name, &data)?;

            Ok(SqlResult {
                success: true,
                message: format!("{} rows affected", rows_affected),
                columns: vec![],
                rows: vec![],
                rows_affected,
            })
        }
    }
}
