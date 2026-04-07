use crate::domain::entities::{Device, Package};
use std::process::Command;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

pub struct AdbAdapter;

impl AdbAdapter {
    pub fn new() -> Self {
        Self
    }

    pub fn run(&self, args: &[&str]) -> Result<String, String> {
        let mut cmd = Command::new("adb");
        cmd.args(args);

        #[cfg(target_os = "windows")]
        cmd.creation_flags(CREATE_NO_WINDOW);

        let output = cmd
            .output()
            .map_err(|e| format!("Failed to run ADB: {}", e))?;

        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    }

    pub fn list_devices(&self) -> Result<Vec<Device>, String> {
        let output = self.run(&["devices", "-l"])?;

        let mut devices = Vec::new();
        for line in output.lines().skip(1) {
            if line.trim().is_empty() {
                continue;
            }
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 2 {
                let id = parts[0].to_string();
                let status = parts[1].to_string();
                let model = parts
                    .iter()
                    .find(|p| p.starts_with("model:"))
                    .map(|p| p.trim_start_matches("model:").replace("_", " "))
                    .unwrap_or_else(|| "Unknown".to_string());

                devices.push(Device { id, model, status });
            }
        }

        Ok(devices)
    }

    pub fn list_packages(&self, device_id: &str) -> Result<Vec<Package>, String> {
        let output = self.run(&["-s", device_id, "shell", "pm", "list", "packages", "-3"])?;

        let packages: Vec<Package> = output
            .lines()
            .filter_map(|line| {
                line.strip_prefix("package:").map(|name| Package {
                    name: name.to_string(),
                    label: None,
                })
            })
            .collect();

        Ok(packages)
    }

    pub fn shell(&self, device_id: &str, command: &str) -> Result<String, String> {
        self.run(&["-s", device_id, "shell", command])
    }

    pub fn pull_database_base64(
        &self,
        device_id: &str,
        package: &str,
        db_name: &str,
    ) -> Result<Vec<u8>, String> {
        let remote_path = format!("databases/{}", db_name);
        let run_as_cmd = format!("run-as {} cat {} | base64", package, remote_path);

        let output = self.shell(device_id, &run_as_cmd)?;
        let base64_str = output.trim();

        crate::infrastructure::base64::decode(base64_str)
    }

    pub fn push_database(
        &self,
        device_id: &str,
        package: &str,
        db_name: &str,
        data: &[u8],
    ) -> Result<(), String> {
        let base64_data = crate::infrastructure::base64::encode(data);
        let remote_path = format!("databases/{}", db_name);

        let run_as_cmd = format!(
            "run-as {} sh -c 'echo \"{}\" | base64 -d > {}'",
            package, base64_data, remote_path
        );

        self.shell(device_id, &run_as_cmd)?;
        Ok(())
    }
}
