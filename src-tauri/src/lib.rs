pub mod application;
pub mod domain;
pub mod infrastructure;
pub mod presentation;

pub use application::{DatabaseUseCases, DeviceUseCases};
pub use domain::entities;
pub use presentation::commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            presentation::commands::list_devices,
            presentation::commands::list_packages,
            presentation::commands::list_databases,
            presentation::commands::list_tables,
            presentation::commands::get_table_schema,
            presentation::commands::get_table_data,
            presentation::commands::execute_sql,
            presentation::commands::sync_changes,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
