use crate::domain::entities::{Device, DeviceFileEntry, Package};
use std::io::{Read, Write};
use std::process::{Command, Stdio};
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

const DEFAULT_TIMEOUT_SECS: u64 = 8;
const DB_IO_TIMEOUT_SECS: u64 = 90;

pub(crate) fn shell_quote(input: &str) -> Result<String, String> {
    if input.contains('\0') || input.contains('\n') || input.contains('\r') {
        return Err("Invalid character in Android shell argument".to_string());
    }
    Ok(format!("'{}'", input.replace('\'', "'\"'\"'")))
}


fn validate_write_destination(path: &str) -> Result<(), String> {
    let filename = path.strip_prefix("databases/")
        .ok_or_else(|| "Only files inside the Android databases directory can be written".to_string())?;
    if filename.is_empty()
        || filename == "." || filename == ".."
        || filename.contains("..")
        || filename.contains('/')
        || filename.contains('\\')
        || filename.contains('\0')
        || filename.contains('\n')
        || filename.contains('\r')
    {
        return Err("Invalid database snapshot path".to_string());
    }
    Ok(())
}

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

    pub fn get_logcat_logs(
        &self,
        device_id: &str,
        package_name: Option<&str>,
        limit: u32,
    ) -> Result<Vec<String>, String> {
        let bounded_limit = limit.clamp(50, 800);
        let limit_value = bounded_limit.to_string();

        if let Some(package) = package_name {
            let pid_cmd = format!("pidof -s {}", shell_quote(package)?);
            let pid = self
                .shell_with_timeout(device_id, &pid_cmd, Duration::from_secs(3))
                .unwrap_or_default()
                .trim()
                .to_string();

            if !pid.is_empty() {
                let args_owned = [
                    "-s".to_string(),
                    device_id.to_string(),
                    "logcat".to_string(),
                    "-d".to_string(),
                    "-v".to_string(),
                    "threadtime".to_string(),
                    format!("--pid={}", pid),
                    "-t".to_string(),
                    limit_value.clone(),
                ];
                let args: Vec<&str> = args_owned.iter().map(String::as_str).collect();
                let output = self.run_with_timeout(&args, Duration::from_secs(8))?;
                return Ok(normalize_logcat_lines(&output));
            }
        }

        let args_owned = [
            "-s".to_string(),
            device_id.to_string(),
            "logcat".to_string(),
            "-d".to_string(),
            "-v".to_string(),
            "threadtime".to_string(),
            "-t".to_string(),
            limit_value,
        ];
        let args: Vec<&str> = args_owned.iter().map(String::as_str).collect();
        let output = self.run_with_timeout(&args, Duration::from_secs(8))?;
        Ok(normalize_logcat_lines(&output))
    }

    pub fn list_device_files(
        &self,
        device_id: &str,
        path: Option<&str>,
    ) -> Result<Vec<DeviceFileEntry>, String> {
        let target = normalize_remote_path(path);
        let quoted = shell_quote(&target)?;
        let command = format!(
            "if [ ! -d {0} ]; then exit 2; fi; ls -a -1 -p -- {0}",
            quoted
        );
        let output = self.shell_with_timeout(device_id, &command, Duration::from_secs(6))?;

        let mut entries = output
            .lines()
            .map(str::trim)
            .filter(|line| !line.is_empty() && *line != "." && *line != "..")
            .map(|line| {
                let is_directory = line.ends_with('/');
                let name = line.trim_end_matches('/').to_string();
                let full_path = if target == "/" {
                    format!("/{}", name)
                } else {
                    format!("{}/{}", target.trim_end_matches('/'), name)
                };

                DeviceFileEntry {
                    name,
                    full_path,
                    is_directory,
                    size_bytes: None,
                }
            })
            .collect::<Vec<_>>();

        entries.sort_by(|a, b| match (a.is_directory, b.is_directory) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        });

        Ok(entries)
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

    /// Streams binary bytes directly into the debuggable app's private directory.
    /// No copy is ever created in /data/local/tmp or external storage.
    fn stream_private_file(
        &self,
        device_id: &str,
        package: &str,
        relative_path: &str,
        data: &[u8],
    ) -> Result<(), String> {
        validate_write_destination(relative_path)?;
        let shell_script = format!("umask 077; cat > {}", shell_quote(relative_path)?);
        let mut cmd = Command::new("adb");
        cmd.args(["-s", device_id, "exec-in", "run-as", package, "sh", "-c", &shell_script])
            .stdin(Stdio::piped())
            .stdout(Stdio::null())
            .stderr(Stdio::piped());
        #[cfg(target_os = "windows")]
        cmd.creation_flags(CREATE_NO_WINDOW);

        let mut child = cmd.spawn().map_err(|e| format!("Failed to stream database to Android: {}", e))?;
        let mut stdin = child.stdin.take().ok_or("ADB stdin unavailable")?;
        let mut stderr = child.stderr.take().ok_or("ADB stderr unavailable")?;
        let result: Result<(), String> = thread::scope(|scope| {
            let writer = scope.spawn(move || stdin.write_all(data).map_err(|e| e.to_string()));
            let error_reader = scope.spawn(move || {
                let mut errors = Vec::new();
                let _ = stderr.read_to_end(&mut errors);
                String::from_utf8_lossy(&errors).to_string()
            });
            let start = Instant::now();
            let status = loop {
                match child.try_wait() {
                    Ok(Some(status)) => break Ok(status),
                    Ok(None) if start.elapsed() < Duration::from_secs(DB_IO_TIMEOUT_SECS) => {
                        thread::sleep(Duration::from_millis(50));
                    }
                    Ok(None) => {
                        let _ = child.kill();
                        let _ = child.wait();
                        break Err("ADB private write timed out".to_string());
                    }
                    Err(error) => {
                        let _ = child.kill();
                        let _ = child.wait();
                        break Err(format!("ADB private write failed: {}", error));
                    }
                }
            };
            let write_result = writer.join().map_err(|_| "ADB writer panicked".to_string())?;
            let errors = error_reader.join().map_err(|_| "ADB stderr reader panicked".to_string())?;
            let status = status?;
            write_result.map_err(|e| format!("ADB upload failed: {}", e))?;
            if !status.success() {
                return Err(format!("ADB upload process failed: {}", errors));
            }
            Ok(())
        });
        result?;

        // exec-in has no reliable remote exit status; verify every byte received.
        let received = self.pull_app_file_snapshot(device_id, package, relative_path)?;
        if received != data {
            return Err("ADB private-file transfer verification failed".to_string());
        }
        Ok(())
    }

    pub fn push_app_file_snapshot(
        &self,
        device_id: &str,
        package: &str,
        relative_path: &str,
        data: &[u8],
    ) -> Result<(), String> {
        validate_write_destination(relative_path)?;
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .map_err(|e| e.to_string())?;
        let staged = format!("{}.adbfly-stage-{}", relative_path, nonce);
        validate_write_destination(&staged)?;
        let transfer = (|| -> Result<(), String> {
            self.stream_private_file(device_id, package, &staged, data)?;
            let commit = format!(
                "mv -f -- {} {}",
                shell_quote(&staged)?,
                shell_quote(relative_path)?
            );
            let run_as = format!("run-as {} sh -c {}", shell_quote(package)?, shell_quote(&commit)?);
            self.shell_with_timeout(device_id, &run_as, Duration::from_secs(DB_IO_TIMEOUT_SECS))?;
            Ok(())
        })();

        let cleanup = format!("run-as {} rm -f -- {}", shell_quote(package)?, shell_quote(&staged)?);
        let cleanup_result = self.shell_with_timeout(device_id, &cleanup, Duration::from_secs(DEFAULT_TIMEOUT_SECS));
        match (transfer, cleanup_result) {
            (Err(error), _) => Err(error),
            (Ok(()), Err(error)) => Err(format!("Database staging cleanup failed: {}", error)),
            (Ok(()), Ok(_)) => Ok(()),
        }
    }

    pub fn delete_app_file_snapshot(
        &self,
        device_id: &str,
        package: &str,
        relative_path: &str,
    ) -> Result<(), String> {
        validate_write_destination(relative_path)?;
        let run_as_cmd = format!(
            "run-as {} rm -f -- {}",
            shell_quote(package)?,
            shell_quote(relative_path)?
        );
        self.shell_with_timeout(
            device_id,
            &run_as_cmd,
            Duration::from_secs(DEFAULT_TIMEOUT_SECS),
        )
        .map(|_| ())
    }
}

fn normalize_logcat_lines(output: &str) -> Vec<String> {
    output
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(ToString::to_string)
        .collect()
}

fn escape_single_quotes(input: &str) -> String {
    input.replace('\'', "'\"'\"'")
}

fn normalize_remote_path(path: Option<&str>) -> String {
    let candidate = path
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("/sdcard");

    if candidate == "/" {
        return "/".to_string();
    }

    let normalized = candidate.trim_end_matches('/');
    if normalized.is_empty() {
        "/sdcard".to_string()
    } else {
        normalized.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::{escape_single_quotes, normalize_logcat_lines, normalize_remote_path, validate_write_destination, shell_quote};

    #[test]
    fn rejects_snapshot_paths_outside_database_directory() {
        for path in ["../db", "shared_prefs/a.xml", "databases/", "databases/../secrets", "databases/a/b"] {
            assert!(validate_write_destination(path).is_err(), "accepted {path}");
        }
        for path in ["databases/app.db", "databases/app.db-wal", "databases/app.db-shm"] {
            assert!(validate_write_destination(path).is_ok(), "rejected {path}");
        }
    }

    #[test]
    fn remote_shell_quote_escapes_unsafe_bytes() {
        assert_eq!(shell_quote("a'b").unwrap(), "'a'\"'\"'b'");
        for value in ["a\0b", "a\nb", "a\rb"] {
            assert!(shell_quote(value).is_err());
        }
    }

    #[test]
    fn normalize_logcat_lines_trims_and_removes_empty_lines() {
        let raw = " 04-15 12:00:00.000  111  111 I Demo: start \n\n   \n04-15 12:00:01.000  111  111 W Demo: warn  ";
        let lines = normalize_logcat_lines(raw);

        assert_eq!(lines.len(), 2);
        assert_eq!(lines[0], "04-15 12:00:00.000  111  111 I Demo: start");
        assert_eq!(lines[1], "04-15 12:00:01.000  111  111 W Demo: warn");
    }

    #[test]
    fn normalize_remote_path_defaults_to_sdcard_and_trims_trailing_slash() {
        assert_eq!(normalize_remote_path(None), "/sdcard");
        assert_eq!(normalize_remote_path(Some("")), "/sdcard");
        assert_eq!(normalize_remote_path(Some("/sdcard/")), "/sdcard");
        assert_eq!(normalize_remote_path(Some("/")), "/");
    }

    #[test]
    fn escape_single_quotes_applies_shell_safe_pattern() {
        let escaped = escape_single_quotes("/sdcard/O'Brien");
        assert_eq!(escaped, "/sdcard/O'\"'\"'Brien");
    }
}
