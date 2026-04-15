pub mod application;
pub mod domain;
pub mod infrastructure;
pub mod presentation;

pub use application::{DatabaseUseCases, DeviceUseCases};
pub use domain::entities;
pub use presentation::commands;
use std::sync::Arc;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_state = Arc::new(presentation::commands::AppState::new());

    tauri::Builder::default()
        .manage(app_state)
        .setup(|app| {
            presentation::commands::ensure_app_config_exists(&app.handle())
                .map_err(std::io::Error::other)?;
            infrastructure::adb::tracker::start_device_tracker(app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            presentation::commands::list_devices,
            presentation::commands::list_packages,
            presentation::commands::get_device_overview,
            presentation::commands::list_databases,
            presentation::commands::list_tables,
            presentation::commands::get_table_schema,
            presentation::commands::get_table_data,
            presentation::commands::execute_sql,
            presentation::commands::sync_changes,
            presentation::commands::get_app_config,
            presentation::commands::save_app_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
