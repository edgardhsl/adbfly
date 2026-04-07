use crate::domain::entities::{Device, Package};
use crate::infrastructure::adb::AdbAdapter;

pub struct DeviceUseCases {
    adb: AdbAdapter,
}

impl DeviceUseCases {
    pub fn new() -> Self {
        Self {
            adb: AdbAdapter::new(),
        }
    }

    pub fn list_devices(&self) -> Result<Vec<Device>, String> {
        log::info!("Listing devices");
        let devices = self.adb.list_devices()?;
        log::info!("Found {} devices", devices.len());
        Ok(devices)
    }

    pub fn list_packages(&self, device_id: &str) -> Result<Vec<Package>, String> {
        log::info!("Listing packages for device: {}", device_id);
        let packages = self.adb.list_packages(device_id)?;
        log::info!("Found {} packages", packages.len());
        Ok(packages)
    }
}
