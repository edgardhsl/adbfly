use crate::domain::entities::{Device, Package};
use std::io::Read;
use std::process::{Command, Stdio};
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tempfile::NamedTempFile;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

const DEFAULT_TIMEOUT_SECS: u64 = 8;
const DB_IO_TIMEOUT_SECS: u64 = 90;

pub struct AdbAdapter;

impl AdbAdapter {
    pub fn new() -> Self {
        Self
    }

    pub fn run(&self, args: &[&str]) -> Result<String, String> {
        self.run_with_timeout(args, Duration::from_secs(DEFAULT_TIMEOUT_SECS))
    }

    pub fn run_with_timeout(&self, args: &[&str], timeout: Duration) -> Result<String, String> {
        let bytes = self.run_bytes_with_timeout(args, timeout)?;
        Ok(String::from_utf8_lossy(&bytes).to_string())
    }

    pub fn run_bytes_with_timeout(
        &self,
        args: &[&str],
        timeout: Duration,
    ) -> Result<Vec<u8>, String> {
        let mut cmd = Command::new("adb");
        cmd.args(args);
        cmd.stdout(Stdio::piped()).stderr(Stdio::piped());

        #[cfg(target_os = "windows")]
        cmd.creation_flags(CREATE_NO_WINDOW);

        let mut child = cmd
            .spawn()
            .map_err(|e| format!("Failed to run ADB: {}", e))?;

        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| "Failed to capture ADB stdout".to_string())?;
        let stderr = child
            .stderr
            .take()
            .ok_or_else(|| "Failed to capture ADB stderr".to_string())?;

        let stdout_handle = thread::spawn(move || {
            let mut reader = stdout;
            let mut buf = Vec::new();
            let _ = reader.read_to_end(&mut buf);
            buf
        });

        let stderr_handle = thread::spawn(move || {
            let mut reader = stderr;
            let mut buf = Vec::new();
            let _ = reader.read_to_end(&mut buf);
            buf
        });

        let start = Instant::now();
        let status = loop {
            if let Some(status) = child
                .try_wait()
                .map_err(|e| format!("Failed waiting for ADB process: {}", e))?
            {
                break status;
            }

            if start.elapsed() >= timeout {
                let _ = child.kill();
                let _ = child.wait();
                return Err(format!(
                    "ADB command timed out after {}s: adb {}",
                    timeout.as_secs(),
                    args.join(" ")
                ));
            }

            thread::sleep(Duration::from_millis(50));
        };

        let stdout = stdout_handle
            .join()
            .map_err(|_| "Failed joining ADB stdout reader".to_string())?;
        let stderr = stderr_handle
            .join()
            .map_err(|_| "Failed joining ADB stderr reader".to_string())?;

        if status.success() {
            Ok(stdout)
        } else {
            Err(String::from_utf8_lossy(&stderr).to_string())
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
                    .map(|p| p.trim_start_matches("model:").replace('_', " "))
                    .unwrap_or_else(|| "Unknown".to_string());

                devices.push(Device { id, model, status });
            }
        }

        Ok(devices)
    }

    pub fn list_packages(&self, device_id: &str) -> Result<Vec<Package>, String> {
        let third_party_output = self.run(&["-s", device_id, "shell", "pm", "list", "packages", "-3"])?;

        let mut packages: Vec<Package> = third_party_output
            .lines()
            .filter_map(|line| {
                line.strip_prefix("package:").map(|name| Package {
                    name: name.to_string(),
                    label: None,
                })
            })
            .collect();

        if packages.is_empty() {
            let all_packages_output = self.run(&["-s", device_id, "shell", "pm", "list", "packages"])?;
            packages = all_packages_output
                .lines()
                .filter_map(|line| {
                    line.strip_prefix("package:").map(|name| Package {
                        name: name.to_string(),
                        label: None,
                    })
                })
                .collect();
        }

        packages.sort_by(|a, b| a.name.cmp(&b.name));

        Ok(packages)
    }

    pub fn shell(&self, device_id: &str, command: &str) -> Result<String, String> {
        self.run(&["-s", device_id, "shell", command])
    }

    pub fn shell_with_timeout(
        &self,
        device_id: &str,
        command: &str,
        timeout: Duration,
    ) -> Result<String, String> {
        self.run_with_timeout(&["-s", device_id, "shell", command], timeout)
    }

    pub fn pull_app_file_snapshot(
        &self,
        device_id: &str,
        package: &str,
        relative_path: &str,
    ) -> Result<Vec<u8>, String> {
        let args_owned = [
            "-s".to_string(),
            device_id.to_string(),
            "exec-out".to_string(),
            "run-as".to_string(),
            package.to_string(),
            "cat".to_string(),
            relative_path.to_string(),
        ];
        let args: Vec<&str> = args_owned.iter().map(String::as_str).collect();
        self.run_bytes_with_timeout(&args, Duration::from_secs(DB_IO_TIMEOUT_SECS))
    }

    pub fn pull_app_file_snapshot_optional(
        &self,
        device_id: &str,
        package: &str,
        relative_path: &str,
    ) -> Result<Option<Vec<u8>>, String> {
        match self.pull_app_file_snapshot(device_id, package, relative_path) {
            Ok(bytes) => Ok(Some(bytes)),
            Err(error)
                if error.contains("No such file")
                    || error.contains("No such file or directory")
                    || error.contains("not found") =>
            {
                Ok(None)
            }
            Err(error) => Err(error),
        }
    }

    pub fn push_app_file_snapshot(
        &self,
        device_id: &str,
        package: &str,
        relative_path: &str,
        data: &[u8],
    ) -> Result<(), String> {
        let local_tmp = NamedTempFile::new()
            .map_err(|e| format!("Failed to create temporary snapshot file: {}", e))?;
        std::fs::write(local_tmp.path(), data)
            .map_err(|e| format!("Failed to write temporary snapshot file: {}", e))?;

        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0);

        let local_tmp_path = local_tmp.path().to_string_lossy().to_string();
        let remote_tmp = format!(
            "/data/local/tmp/adbfly_{}_{}",
            package.replace('.', "_"),
            nonce
        );

        self.run_with_timeout(
            &["-s", device_id, "push", &local_tmp_path, &remote_tmp],
            Duration::from_secs(DB_IO_TIMEOUT_SECS),
        )?;

        let run_as_cmd = format!(
            "run-as {} sh -c 'cp {} {} && chmod 600 {}'",
            package, remote_tmp, relative_path, relative_path
        );
        let result = self.shell_with_timeout(
            device_id,
            &run_as_cmd,
            Duration::from_secs(DB_IO_TIMEOUT_SECS),
        );

        let cleanup_cmd = format!("rm -f {}", remote_tmp);
        let _ = self.shell_with_timeout(
            device_id,
            &cleanup_cmd,
            Duration::from_secs(DEFAULT_TIMEOUT_SECS),
        );

        result.map(|_| ())
    }

    pub fn delete_app_file_snapshot(
        &self,
        device_id: &str,
        package: &str,
        relative_path: &str,
    ) -> Result<(), String> {
        let run_as_cmd = format!("run-as {} rm -f {}", package, relative_path);
        self.shell_with_timeout(
            device_id,
            &run_as_cmd,
            Duration::from_secs(DEFAULT_TIMEOUT_SECS),
        )
        .map(|_| ())
    }
}
