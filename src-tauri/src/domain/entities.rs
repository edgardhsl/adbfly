use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Device {
    pub id: String,
    pub model: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Package {
    pub name: String,
    pub label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceOverview {
    pub android_version: String,
    pub cpu_abi: String,
    pub total_ram_mb: u64,
    pub used_ram_mb: u64,
    pub storage_total_gb: f64,
    pub storage_used_gb: f64,
    pub cpu_usage_percent: f64,
    pub memory_usage_percent: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceFileEntry {
    pub name: String,
    pub full_path: String,
    pub is_directory: bool,
    pub size_bytes: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceFileProperties {
    pub name: String,
    pub full_path: String,
    pub is_directory: bool,
    pub size_bytes: Option<u64>,
    pub modified_at: Option<String>,
    pub permissions: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceFilePreview {
    pub name: String,
    pub full_path: String,
    pub mime_type: String,
    pub content_base64: String,
    pub truncated: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseInfo {
    pub name: String,
    pub path: String,
    pub size: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableSchema {
    pub name: String,
    pub columns: Vec<ColumnInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnInfo {
    pub name: String,
    pub col_type: String,
    pub nullable: bool,
    pub primary_key: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableData {
    pub columns: Vec<String>,
    pub rows: Vec<serde_json::Value>,
    pub total_rows: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SqlResult {
    pub success: bool,
    pub message: String,
    pub columns: Vec<String>,
    pub rows: Vec<serde_json::Value>,
    pub rows_affected: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SortInfo {
    pub column: String,
    pub direction: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilterInfo {
    pub column: String,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub openssl_dir: String,
    pub openssl_lib_dir: String,
    pub openssl_include_dir: String,
    pub preferred_locale: String,
    pub config_file_path: String,
}
