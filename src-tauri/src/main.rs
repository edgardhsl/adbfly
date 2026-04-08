#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    env_logger::init();
    log::info!("Starting ADB Fly");
    adb_device_explorer_lib::run();
}
