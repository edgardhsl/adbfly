use tempfile::TempDir;

use crate::domain::entities::{
    DatabaseInfo, FilterInfo, SortInfo, SqlResult, TableData, TableSchema,
};
use crate::infrastructure::adb::AdbAdapter;

fn quote_identifier(name: &str) -> Result<String, String> {
    if name.is_empty() || name.contains('\0') {
        return Err("Invalid SQLite identifier".to_string());
    }
    Ok(format!("\"{}\"", name.replace('"', "\"\"")))
}

fn has_numeric_affinity(declared_type: &str) -> bool {
    let kind = declared_type.to_ascii_uppercase();
    if kind.contains("CHAR")
        || kind.contains("CLOB")
        || kind.contains("TEXT")
        || kind.contains("BLOB")
    {
        return false;
    }
    kind.contains("INT")
        || kind.contains("REAL")
        || kind.contains("FLOA")
        || kind.contains("DOUB")
        || kind.contains("NUM")
        || kind.contains("DEC")
}

fn to_bound_sql_value(value: &serde_json::Value) -> Result<rusqlite::types::Value, String> {
    use rusqlite::types::Value;
    match value {
        serde_json::Value::Null => Ok(Value::Null),
        serde_json::Value::Bool(flag) => Ok(Value::Integer(i64::from(*flag))),
        serde_json::Value::String(text) => Ok(Value::Text(text.clone())),
        serde_json::Value::Number(number) => {
            if let Some(integer) = number.as_i64() {
                return Ok(Value::Integer(integer));
            }
            if number.as_u64().is_some() {
                return Err("Integer parameter outside SQLite i64 range".to_string());
            }
            let float = number.as_f64().ok_or("Invalid SQL number")?;
            if !float.is_finite() {
                return Err("SQL parameter must be finite".to_string());
            }
            Ok(Value::Real(float))
        }
        _ => Err("SQL parameters must be scalar values".to_string()),
    }
}

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

    fn quote_shell_arg(value: &str) -> Result<String, String> {
        if value.contains('\0') || value.contains('\n') || value.contains('\r') {
            return Err("Invalid Android package name".to_string());
        }
        Ok(format!("'{}'", value.replace('\'', "'\"'\"'")))
    }

    fn ensure_package_stopped(&self, device_id: &str, package: &str) -> Result<(), String> {
        // Writing a snapshot over a database held open by Android risks corrupting WAL state.
        let quoted_package = Self::quote_shell_arg(package)?;
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

        match conn.query_row("SELECT count(*) FROM sqlite_master", [], |row| {
            row.get::<_, i64>(0)
        }) {
            Ok(_) => Ok(conn),
            Err(error) => {
                let error_text = error.to_string().to_lowercase();
                if error_text.contains("file is not a database") {
                    if db_key.is_some() {
                        Err("Invalid SQLCipher key for this database.".to_string())
                    } else {
                        #[cfg(feature = "sqlcipher")]
                        {
                            Err(
                                "This database appears to be encrypted. Provide a SQLCipher key."
                                    .to_string(),
                            )
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
            .prepare(&format!("PRAGMA table_info({})", quote_identifier(table)?))
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

        let table_ident = quote_identifier(table)?;
        let mut sql = format!("SELECT * FROM {}", table_ident);
        let mut count_sql = format!("SELECT COUNT(*) FROM {}", table_ident);

        // Column identifiers must match the schema; values are always bound as parameters.
        let mut column_types = std::collections::HashMap::<String, String>::new();
        let mut schema = conn
            .prepare(&format!("PRAGMA table_info({})", table_ident))
            .map_err(|e| format!("Failed to inspect table schema: {}", e))?;
        let columns = schema
            .query_map([], |row| {
                Ok((row.get::<_, String>(1)?, row.get::<_, String>(2)?))
            })
            .map_err(|e| e.to_string())?;
        for column in columns {
            let (name, declared_type) = column.map_err(|e| e.to_string())?;
            column_types.insert(name, declared_type);
        }
        if column_types.is_empty() {
            return Err("Table has no available columns".to_string());
        }

        let mut filter_values: Vec<rusqlite::types::Value> = Vec::new();
        if let Some(filters) = filters {
            let mut clauses = Vec::new();
            for filter in filters
                .into_iter()
                .filter(|filter| !filter.value.is_empty())
            {
                if !column_types.contains_key(&filter.column) {
                    return Err(format!("Unknown filter column: {}", filter.column));
                }
                let column = quote_identifier(&filter.column)?;
                let value = filter.value.trim();
                if column_types
                    .get(&filter.column)
                    .is_some_and(|kind| has_numeric_affinity(kind))
                {
                    if let Ok(number) = value.parse::<i64>() {
                        clauses.push(format!("{} = ?", column));
                        filter_values.push(rusqlite::types::Value::Integer(number));
                        continue;
                    }
                    if let Ok(number) = value.parse::<f64>() {
                        if number.is_finite() {
                            clauses.push(format!("{} = ?", column));
                            filter_values.push(rusqlite::types::Value::Real(number));
                            continue;
                        }
                    }
                }
                clauses.push(format!("{} LIKE ?", column));
                filter_values.push(rusqlite::types::Value::Text(format!("%{}%", value)));
            }
            if !clauses.is_empty() {
                let where_clause = format!(" WHERE {}", clauses.join(" AND "));
                sql.push_str(&where_clause);
                count_sql.push_str(&where_clause);
            }
        }

        if let Some(sort) = sort {
            if !column_types.contains_key(&sort.column) {
                return Err(format!("Unknown sort column: {}", sort.column));
            }
            let direction = match sort.direction.to_ascii_uppercase().as_str() {
                "ASC" => "ASC",
                "DESC" => "DESC",
                _ => return Err("Invalid sort direction".to_string()),
            };
            sql.push_str(&format!(
                " ORDER BY {} {}",
                quote_identifier(&sort.column)?,
                direction
            ));
        }

        let safe_page_size = page_size.clamp(1, 1000);
        let offset = u64::from(page.saturating_sub(1)) * u64::from(safe_page_size);
        sql.push_str(&format!(" LIMIT {} OFFSET {}", safe_page_size, offset));

        let total_rows: u64 = conn
            .query_row(
                &count_sql,
                rusqlite::params_from_iter(filter_values.iter()),
                |row| row.get(0),
            )
            .map_err(|e| format!("Failed to count filtered rows: {}", e))?;

        let mut stmt = conn
            .prepare(&sql)
            .map_err(|e| format!("Failed to prepare query: {}", e))?;

        let column_names: Vec<String> = stmt.column_names().iter().map(|s| s.to_string()).collect();

        let rows: Vec<serde_json::Value> = stmt
            .query_map(rusqlite::params_from_iter(filter_values.iter()), |row| {
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
        params: &[serde_json::Value],
    ) -> Result<SqlResult, String> {
        let bound: Vec<rusqlite::types::Value> = params
            .iter()
            .map(to_bound_sql_value)
            .collect::<Result<_, _>>()?;
        let (_temp_dir, local_path) = self.pull_database(device_id, package_name, db_name)?;
        // Preserve the exact source version so another app write cannot be
        // overwritten while the snapshot is being edited on the host.
        let original_db = std::fs::read(&local_path)
            .map_err(|e| format!("Failed to read original DB snapshot: {}", e))?;
        let original_wal_path = local_path.with_file_name(format!("{}-wal", db_name));
        let original_wal = if original_wal_path.exists() {
            Some(std::fs::read(&original_wal_path).map_err(|e| e.to_string())?)
        } else {
            None
        };
        let conn = self.open_connection(&local_path, db_key)?;
        // Unlike a SELECT prefix, the prepared statement correctly classifies
        // WITH queries and read-only PRAGMAs without accidentally entering
        // the multi-file Android write protocol.
        let is_select = conn
            .prepare(sql)
            .map_err(|e| format!("Invalid SQL statement: {}", e))?
            .readonly();
        if !is_select {
            self.ensure_package_stopped(device_id, package_name)?;
        }

        if is_select {
            let mut stmt = conn
                .prepare(sql)
                .map_err(|e| format!("Failed to prepare: {}", e))?;

            let column_names: Vec<String> =
                stmt.column_names().iter().map(|s| s.to_string()).collect();

            let rows: Vec<serde_json::Value> = stmt
                .query_map(rusqlite::params_from_iter(bound.iter()), |row| {
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
            .execute(sql, rusqlite::params_from_iter(bound.iter()))
            .map_err(|e| format!("Failed to execute: {}", e))? as u64;
        // The pragma returns (busy, log_frames, checkpointed_frames); execute_batch
        // hides this status and can silently accept an incomplete checkpoint.
        let (busy, log_frames, checkpointed_frames): (i64, i64, i64) = conn
            .query_row("PRAGMA wal_checkpoint(TRUNCATE)", [], |row| {
                Ok((row.get(0)?, row.get(1)?, row.get(2)?))
            })
            .map_err(|e| format!("Failed to checkpoint WAL: {}", e))?;
        if busy != 0 || log_frames != checkpointed_frames {
            return Err(format!(
                "WAL checkpoint incomplete (busy={}, frames={}, checkpointed={}); refusing to write",
                busy, log_frames, checkpointed_frames
            ));
        }
        let integrity: String = conn
            .query_row("PRAGMA quick_check(1)", [], |row| row.get(0))
            .map_err(|e| format!("Failed to verify local SQLite integrity: {}", e))?;
        if integrity != "ok" {
            return Err(format!(
                "SQLite quick_check failed: {}; refusing to write",
                integrity
            ));
        }
        drop(conn);

        let local_db = std::fs::read(&local_path)
            .map_err(|e| format!("Failed to read modified database: {}", e))?;
        let remote_db = format!("databases/{}", db_name);
        // Force-stop marks the package stopped, preventing normal automatic
        // restarts. The user should be warned in UI before initiating a write.
        self.adb.shell(
            device_id,
            &format!("am force-stop {}", Self::quote_shell_arg(package_name)?),
        )?;
        self.ensure_package_stopped(device_id, package_name)?;
        let current_db = self
            .adb
            .pull_app_file_snapshot(device_id, package_name, &remote_db)?;
        let current_wal = self.adb.pull_app_file_snapshot_optional(
            device_id,
            package_name,
            &format!("{}-wal", remote_db),
        )?;
        if current_db != original_db || current_wal != original_wal {
            return Err(
                "Android database changed since editing began. No changes sent; reload and retry."
                    .to_string(),
            );
        }

        // The adapter performs verified app-private staging and retains remote
        // backups during the replacement, with a rollback attempt on failure.
        self.adb.replace_database_snapshot_with_recovery(
            device_id,
            package_name,
            &remote_db,
            &local_db,
            &original_db,
            original_wal.as_deref(),
        )?;

        Ok(SqlResult {
            success: true,
            message: format!("{} rows affected", rows_affected),
            columns: vec![],
            rows: vec![],
            rows_affected,
        })
    }
}

#[cfg(test)]
mod security_tests {
    use super::{has_numeric_affinity, quote_identifier, to_bound_sql_value};

    #[test]
    fn identifiers_escape_double_quotes() {
        assert_eq!(quote_identifier("odd\"name").unwrap(), "\"odd\"\"name\"");
        assert!(quote_identifier("bad\0name").is_err());
    }

    #[test]
    fn bound_values_preserve_null_empty_text_and_integer_types() {
        use rusqlite::types::Value;
        assert_eq!(
            to_bound_sql_value(&serde_json::Value::Null).unwrap(),
            Value::Null
        );
        assert_eq!(
            to_bound_sql_value(&serde_json::json!("")).unwrap(),
            Value::Text("".to_owned())
        );
        assert_eq!(
            to_bound_sql_value(&serde_json::json!("NULL")).unwrap(),
            Value::Text("NULL".to_owned())
        );
        assert_eq!(
            to_bound_sql_value(&serde_json::json!(123)).unwrap(),
            Value::Integer(123)
        );
        assert!(to_bound_sql_value(&serde_json::json!({"not":"scalar"})).is_err());
    }

    #[test]
    fn filter_affinity_preserves_textual_numbers() {
        assert!(!has_numeric_affinity("TEXT"));
        assert!(!has_numeric_affinity("VARCHAR(40)"));
        assert!(!has_numeric_affinity("BLOB"));
        assert!(has_numeric_affinity("INTEGER"));
        assert!(has_numeric_affinity("REAL"));
    }
}
