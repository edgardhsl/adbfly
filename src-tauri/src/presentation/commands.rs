use crate::application::use_cases::{DatabaseUseCases, DeviceUseCases};
use crate::domain::entities::{FilterInfo, SortInfo};
use std::env;
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{AppHandle, Manager, State};

pub struct AppState {
    pub device_use_cases: DeviceUseCases,
    pub database_use_cases: DatabaseUseCases,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            device_use_cases: DeviceUseCases::new(),
            database_use_cases: DatabaseUseCases::new(),
        }
    }
}

pub type SharedAppState = Arc<AppState>;

async fn run_with_state<T, F>(state: State<'_, SharedAppState>, task: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce(&AppState) -> Result<T, String> + Send + 'static,
{
    let state = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || task(state.as_ref()))
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn list_devices(
    state: State<'_, SharedAppState>,
) -> Result<Vec<crate::domain::entities::Device>, String> {
    run_with_state(state, |app_state| app_state.device_use_cases.list_devices()).await
}

#[tauri::command]
pub async fn list_packages(
    state: State<'_, SharedAppState>,
    device_id: String,
) -> Result<Vec<crate::domain::entities::Package>, String> {
    run_with_state(state, move |app_state| {
        app_state.device_use_cases.list_packages(&device_id)
    })
    .await
}

#[tauri::command]
pub async fn get_device_overview(
    state: State<'_, SharedAppState>,
    device_id: String,
) -> Result<crate::domain::entities::DeviceOverview, String> {
    run_with_state(state, move |app_state| {
        app_state.device_use_cases.get_device_overview(&device_id)
    })
    .await
}

#[tauri::command]
pub async fn list_databases(
    state: State<'_, SharedAppState>,
    device_id: String,
    package_name: String,
) -> Result<Vec<crate::domain::entities::DatabaseInfo>, String> {
    run_with_state(state, move |app_state| {
        app_state
            .database_use_cases
            .list_databases(&device_id, &package_name)
    })
    .await
}

#[tauri::command]
pub async fn list_tables(
    state: State<'_, SharedAppState>,
    device_id: String,
    package_name: String,
    db_name: String,
    db_key: Option<String>,
) -> Result<Vec<String>, String> {
    run_with_state(state, move |app_state| {
        app_state
            .database_use_cases
            .list_tables(&device_id, &package_name, &db_name, db_key.as_deref())
    })
    .await
}

#[tauri::command]
pub async fn get_table_schema(
    state: State<'_, SharedAppState>,
    device_id: String,
    package_name: String,
    db_name: String,
    table: String,
    db_key: Option<String>,
) -> Result<crate::domain::entities::TableSchema, String> {
    run_with_state(state, move |app_state| {
        app_state
            .database_use_cases
            .get_table_schema(&device_id, &package_name, &db_name, &table, db_key.as_deref())
    })
    .await
}

#[tauri::command]
pub async fn get_table_data(
    state: State<'_, SharedAppState>,
    device_id: String,
    package_name: String,
    db_name: String,
    table: String,
    page: u32,
    page_size: u32,
    sort: Option<SortInfo>,
    filters: Option<Vec<FilterInfo>>,
    db_key: Option<String>,
) -> Result<crate::domain::entities::TableData, String> {
    run_with_state(state, move |app_state| {
        app_state.database_use_cases.get_table_data(
            &device_id,
            &package_name,
            &db_name,
            &table,
            page,
            page_size,
            sort,
            filters,
            db_key.as_deref(),
        )
    })
    .await
}

#[tauri::command]
pub async fn execute_sql(
    state: State<'_, SharedAppState>,
    device_id: String,
    package_name: String,
    db_name: String,
    sql: String,
    db_key: Option<String>,
) -> Result<crate::domain::entities::SqlResult, String> {
    run_with_state(state, move |app_state| {
        app_state
            .database_use_cases
            .execute_sql(&device_id, &package_name, &db_name, &sql, db_key.as_deref())
    })
    .await
}

#[tauri::command]
pub async fn sync_changes(
    _device_id: String,
    _package_name: String,
    _db_name: String,
) -> Result<(), String> {
    Err("Sync not implemented in this version. Changes are temporary.".to_string())
}

fn app_config_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Failed to resolve app config dir: {}", e))?;
    Ok(config_dir.join("adbfly.ini"))
}

fn parse_ini_value(content: &str, key: &str) -> String {
    content
        .lines()
        .find_map(|line| {
            let trimmed = line.trim();
            if trimmed.starts_with('#') || trimmed.starts_with(';') || trimmed.is_empty() {
                return None;
            }
            let (line_key, line_value) = trimmed.split_once('=')?;
            if line_key.trim() == key {
                Some(line_value.trim().to_string())
            } else {
                None
            }
        })
        .unwrap_or_default()
}

fn apply_openssl_env(config: &crate::domain::entities::AppConfig) {
    if !config.openssl_dir.is_empty() {
        env::set_var("OPENSSL_DIR", &config.openssl_dir);
    }
    if !config.openssl_lib_dir.is_empty() {
        env::set_var("OPENSSL_LIB_DIR", &config.openssl_lib_dir);
    }
    if !config.openssl_include_dir.is_empty() {
        env::set_var("OPENSSL_INCLUDE_DIR", &config.openssl_include_dir);
    }
}

fn default_app_config(config_path: PathBuf) -> crate::domain::entities::AppConfig {
    crate::domain::entities::AppConfig {
        openssl_dir: String::new(),
        openssl_lib_dir: String::new(),
        openssl_include_dir: String::new(),
        preferred_locale: "en".to_string(),
        config_file_path: config_path.to_string_lossy().to_string(),
    }
}

fn write_app_config_ini(config: &crate::domain::entities::AppConfig) -> Result<(), String> {
    let ini_content = format!(
        "# ADB Fly configuration\nopenssl_dir={}\nopenssl_lib_dir={}\nopenssl_include_dir={}\npreferred_locale={}\n",
        config.openssl_dir, config.openssl_lib_dir, config.openssl_include_dir, config.preferred_locale
    );
    fs::write(&config.config_file_path, ini_content)
        .map_err(|e| format!("Failed to save config file: {}", e))
}

pub fn ensure_app_config_exists(app: &AppHandle) -> Result<crate::domain::entities::AppConfig, String> {
    let config_path = app_config_file_path(app)?;

    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }

    if config_path.exists() {
        let content = fs::read_to_string(&config_path).unwrap_or_default();
        let config = crate::domain::entities::AppConfig {
            openssl_dir: parse_ini_value(&content, "openssl_dir"),
            openssl_lib_dir: parse_ini_value(&content, "openssl_lib_dir"),
            openssl_include_dir: parse_ini_value(&content, "openssl_include_dir"),
            preferred_locale: {
                let locale = parse_ini_value(&content, "preferred_locale");
                if locale.is_empty() { "en".to_string() } else { locale }
            },
            config_file_path: config_path.to_string_lossy().to_string(),
        };

        apply_openssl_env(&config);
        return Ok(config);
    }

    let config = default_app_config(config_path);
    write_app_config_ini(&config)?;
    apply_openssl_env(&config);
    Ok(config)
}

#[tauri::command]
pub async fn get_app_config(app: AppHandle) -> Result<crate::domain::entities::AppConfig, String> {
    ensure_app_config_exists(&app)
}

#[tauri::command]
pub async fn save_app_config(
    app: AppHandle,
    openssl_dir: String,
    openssl_lib_dir: String,
    openssl_include_dir: String,
    preferred_locale: Option<String>,
) -> Result<crate::domain::entities::AppConfig, String> {
    let config_path = app_config_file_path(&app)?;

    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }

    let normalized = crate::domain::entities::AppConfig {
        openssl_dir: openssl_dir.trim().to_string(),
        openssl_lib_dir: openssl_lib_dir.trim().to_string(),
        openssl_include_dir: openssl_include_dir.trim().to_string(),
        preferred_locale: {
            let locale = preferred_locale
                .unwrap_or_else(|| "en".to_string())
                .trim()
                .to_string();
            if locale.is_empty() { "en".to_string() } else { locale }
        },
        config_file_path: config_path.to_string_lossy().to_string(),
    };

    write_app_config_ini(&normalized)?;

    apply_openssl_env(&normalized);

    Ok(normalized)
}
