use tempfile::TempDir;

use crate::domain::entities::{
    DatabaseInfo, FilterInfo, SortInfo, SqlResult, TableData, TableSchema,
};
use crate::infrastructure::adb::AdbAdapter;

pub struct SqliteRepository {
    adb: AdbAdapter,
}

impl SqliteRepository {
    fn validate_db_name(db_name: &str) -> Result<(), String> {
        if db_name.is_empty()
            || db_name == "."
            || db_name == ".."
            || db_name.contains('/')
            || db_name.contains('\\')
            || db_name.contains('\0')
            || db_name.contains('\n')
            || db_name.contains('\r')
        {
            return Err("Invalid database filename".to_string());
        }
        Ok(())
    }

    fn ensure_package_stopped(&self, device_id: &str, package: &str) -> Result<(), String> {
        // Writing a snapshot over a database held open by Android risks corrupting WAL state.
        let quoted_package = crate::infrastructure::adb::adapter::shell_quote(package)?;
        let command = format!(
            "if ! command -v pidof >/dev/null 2>&1; then echo UNKNOWN; elif pidof -s {} >/dev/null 2>&1; then echo RUNNING; else echo STOPPED; fi",
            quoted_package
        );
        let state = self.adb.shell(device_id, &command)?;
        if state.trim() != "STOPPED" {
            return Err(
                "Database writes require the Android app to be stopped and pidof available. Close the app and retry."
                    .to_string(),
            );
        }
        Ok(())
    }

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
        Self::validate_db_name(db_name)?;
        let temp_dir =
            tempfile::tempdir().map_err(|e| format!("Failed to create temp dir: {}", e))?;

        let remote_db = format!("databases/{}", db_name);
        let local_db = temp_dir.path().join(db_name);

        let db_bytes = self
            .adb
            .pull_app_file_snapshot(device_id, package, &remote_db)
            .map_err(|e| format!("Failed to pull database snapshot '{}': {}", remote_db, e))?;
        std::fs::write(&local_db, db_bytes)
            .map_err(|e| format!("Failed to write local database snapshot: {}", e))?;

        for suffix in ["-wal", "-shm"] {
            let remote_sidecar = format!("{}{}", remote_db, suffix);
            let local_sidecar = temp_dir.path().join(format!("{}{}", db_name, suffix));

            if let Some(bytes) =
                self.adb
                    .pull_app_file_snapshot_optional(device_id, package, &remote_sidecar)?
            {
                std::fs::write(&local_sidecar, bytes).map_err(|e| {
                    format!(
                        "Failed to write local sqlite sidecar '{}': {}",
                        local_sidecar.display(),
                        e
                    )
                })?;
            }
        }

        Ok((temp_dir, local_db))
    }

    fn open_connection(
        &self,
        local_path: &std::path::Path,
        db_key: Option<&str>,
    ) -> Result<rusqlite::Connection, String> {
        let conn = rusqlite::Connection::open(local_path)
            .map_err(|e| format!("Failed to open database: {}", e))?;

        if let Some(raw_key) = db_key {
            let trimmed_key = raw_key.trim();
            if !trimmed_key.is_empty() {
                #[cfg(not(feature = "sqlcipher"))]
                {
                    return Err(
                        "SQLCipher is not enabled in this build. Configure OpenSSL and start with SQLCipher support."
                            .to_string(),
                    );
                }

                #[cfg(feature = "sqlcipher")]
                {
                let escaped_key = trimmed_key.replace('\'', "''");
                conn.execute_batch(&format!("PRAGMA key = '{}';", escaped_key))
                    .map_err(|e| format!("Failed to apply SQLCipher key: {}", e))?;
                }
            }
        }

        match conn.query_row("SELECT count(*) FROM sqlite_master", [], |row| row.get::<_, i64>(0))
        {
            Ok(_) => Ok(conn),
            Err(error) => {
                let error_text = error.to_string().to_lowercase();
                if error_text.contains("file is not a database") {
                    if db_key.is_some() {
                        Err("Invalid SQLCipher key for this database.".to_string())
                    } else {
                        #[cfg(feature = "sqlcipher")]
                        {
                            Err("This database appears to be encrypted. Provide a SQLCipher key."
                                .to_string())
                        }
                        #[cfg(not(feature = "sqlcipher"))]
                        {
                            Err("This database appears encrypted and SQLCipher is disabled in this build."
                                .to_string())
                        }
                    }
                } else {
                    Err(format!("Failed to validate database connection: {}", error))
                }
            }
        }
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
        db_key: Option<&str>,
    ) -> Result<Vec<String>, String> {
        let (_temp_dir, local_path) = self.pull_database(device_id, package_name, db_name)?;

        let conn = self.open_connection(&local_path, db_key)?;

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
        db_key: Option<&str>,
    ) -> Result<TableSchema, String> {
        let (_temp_dir, local_path) = self.pull_database(device_id, package_name, db_name)?;

        let conn = self.open_connection(&local_path, db_key)?;

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
        db_key: Option<&str>,
    ) -> Result<TableData, String> {
        let (_temp_dir, local_path) = self.pull_database(device_id, package_name, db_name)?;

        let conn = self.open_connection(&local_path, db_key)?;

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
        db_key: Option<&str>,
    ) -> Result<SqlResult, String> {
        let is_select = sql.trim().to_uppercase().starts_with("SELECT");
        if !is_select {
            self.ensure_package_stopped(device_id, package_name)?;
        }
        let (_temp_dir, local_path) = self.pull_database(device_id, package_name, db_name)?;
        let conn = self.open_connection(&local_path, db_key)?;

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

            return Ok(SqlResult {
                success: true,
                message: format!("{} rows returned", rows.len()),
                columns: column_names,
                rows,
                rows_affected: 0,
            });
        }

        let rows_affected = conn
            .execute(sql, [])
            .map_err(|e| format!("Failed to execute: {}", e))? as u64;
        // Consolidate local WAL changes before copying the snapshot to Android.
        conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);")
            .map_err(|e| format!("Failed to checkpoint SQLite before writing: {}", e))?;
        drop(conn);

        let local_db = std::fs::read(&local_path)
            .map_err(|e| format!("Failed to read modified database: {}", e))?;
        let remote_db = format!("databases/{}", db_name);
        // Fail closed if the application reopened while the local copy was being edited.
        self.ensure_package_stopped(device_id, package_name)?;
        self.adb
            .push_app_file_snapshot(device_id, package_name, &remote_db, &local_db)?;

        for suffix in ["-wal", "-shm"] {
            let local_sidecar = local_path.with_file_name(format!("{}{}", db_name, suffix));
            let remote_sidecar = format!("{}{}", remote_db, suffix);

            if local_sidecar.exists() {
                let sidecar_data = std::fs::read(&local_sidecar).map_err(|e| {
                    format!(
                        "Failed to read sqlite sidecar '{}': {}",
                        local_sidecar.display(),
                        e
                    )
                })?;
                self.adb.push_app_file_snapshot(
                    device_id,
                    package_name,
                    &remote_sidecar,
                    &sidecar_data,
                )?;
            } else {
                let _ = self
                    .adb
                    .delete_app_file_snapshot(device_id, package_name, &remote_sidecar);
            }
        }

        Ok(SqlResult {
            success: true,
            message: format!("{} rows affected", rows_affected),
            columns: vec![],
            rows: vec![],
            rows_affected,
        })
    }
}
