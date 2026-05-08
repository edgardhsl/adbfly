use crate::domain::entities::{
    Device, DeviceFileEntry, DeviceFilePreview, DeviceFileProperties, Package,
};
use base64::{engine::general_purpose::STANDARD, Engine};
use std::io::Read;
use std::path::Path;
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

    pub fn get_logcat_logs(
        &self,
        device_id: &str,
        package_name: Option<&str>,
        limit: u32,
    ) -> Result<Vec<String>, String> {
        let bounded_limit = limit.clamp(50, 800);
        let limit_value = bounded_limit.to_string();

        if let Some(package) = package_name {
            let pid_cmd = format!("pidof -s {}", package);
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
        let escaped = escape_single_quotes(&target);
        let command = format!(
            "sh -c 'target='\"'\"'{}'\"'\"'; if [ ! -d \"$target\" ]; then exit 2; fi; ls -a -1 -p \"$target\"'",
            escaped
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

    pub fn download_device_file(&self, device_id: &str, remote_path: &str) -> Result<String, String> {
        let file_name = file_name_from_remote_path(remote_path);
        let sanitized_name = sanitize_local_file_name(&file_name);
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);

        let mut base_dir = std::env::current_dir()
            .map_err(|e| format!("Failed to resolve current dir: {}", e))?;
        base_dir.push("out");
        base_dir.push("downloads");
        std::fs::create_dir_all(&base_dir)
            .map_err(|e| format!("Failed to create downloads directory: {}", e))?;

        let target_name = format!("{}_{}", nonce, sanitized_name);
        let mut local_path = base_dir;
        local_path.push(target_name);

        self.run_with_timeout(
            &[
                "-s",
                device_id,
                "pull",
                remote_path,
                &local_path.to_string_lossy(),
            ],
            Duration::from_secs(DB_IO_TIMEOUT_SECS),
        )?;

        Ok(local_path.to_string_lossy().to_string())
    }

    pub fn create_device_directory(&self, device_id: &str, remote_path: &str) -> Result<(), String> {
        let escaped = escape_single_quotes(remote_path);
        let command = format!("sh -c 'mkdir -p -- '\"'\"'{}'\"'\"''", escaped);
        self.shell_with_timeout(device_id, &command, Duration::from_secs(DEFAULT_TIMEOUT_SECS))
            .map(|_| ())
    }

    pub fn upload_device_file(
        &self,
        device_id: &str,
        destination_dir: &str,
        file_name: &str,
        data: &[u8],
    ) -> Result<String, String> {
        let dir = normalize_remote_path(Some(destination_dir));
        let safe_name = sanitize_remote_file_name(file_name);
        let destination_path = if dir == "/" {
            format!("/{}", safe_name)
        } else {
            format!("{}/{}", dir.trim_end_matches('/'), safe_name)
        };

        self.create_device_directory(device_id, &dir)?;

        let local_tmp = NamedTempFile::new()
            .map_err(|e| format!("Failed to create temporary upload file: {}", e))?;
        std::fs::write(local_tmp.path(), data)
            .map_err(|e| format!("Failed to write temporary upload file: {}", e))?;

        let local_tmp_path = local_tmp.path().to_string_lossy().to_string();
        self.run_with_timeout(
            &["-s", device_id, "push", &local_tmp_path, &destination_path],
            Duration::from_secs(DB_IO_TIMEOUT_SECS),
        )?;

        Ok(destination_path)
    }

    pub fn delete_device_path(&self, device_id: &str, remote_path: &str) -> Result<(), String> {
        let escaped = escape_single_quotes(remote_path);
        let command = format!("sh -c 'rm -rf -- '\"'\"'{}'\"'\"''", escaped);
        self.shell_with_timeout(device_id, &command, Duration::from_secs(DEFAULT_TIMEOUT_SECS))
            .map(|_| ())
    }

    pub fn move_device_path(
        &self,
        device_id: &str,
        source_path: &str,
        destination_path: &str,
    ) -> Result<(), String> {
        let source_escaped = escape_single_quotes(source_path);
        let destination_escaped = escape_single_quotes(destination_path);
        let command = format!(
            "sh -c 'mv -- '\"'\"'{}'\"'\"' '\"'\"'{}'\"'\"''",
            source_escaped, destination_escaped
        );
        self.shell_with_timeout(device_id, &command, Duration::from_secs(DEFAULT_TIMEOUT_SECS))
            .map(|_| ())
    }

    pub fn copy_device_path(
        &self,
        device_id: &str,
        source_path: &str,
        destination_path: &str,
    ) -> Result<(), String> {
        let source_escaped = escape_single_quotes(source_path);
        let destination_escaped = escape_single_quotes(destination_path);
        let command = format!(
            "sh -c 'cp -R -- '\"'\"'{}'\"'\"' '\"'\"'{}'\"'\"''",
            source_escaped, destination_escaped
        );
        self.shell_with_timeout(device_id, &command, Duration::from_secs(DB_IO_TIMEOUT_SECS))
            .map(|_| ())
    }

    pub fn get_device_file_properties(
        &self,
        device_id: &str,
        remote_path: &str,
    ) -> Result<DeviceFileProperties, String> {
        let escaped = escape_single_quotes(remote_path);
        let command = format!(
            "sh -c 'if [ -d '\"'\"'{}'\"'\"' ]; then echo dir; else echo file; fi; ls -ld '\"'\"'{}'\"'\"'; wc -c < '\"'\"'{}'\"'\"' 2>/dev/null || true'",
            escaped, escaped, escaped
        );
        let output = self.shell_with_timeout(device_id, &command, Duration::from_secs(6))?;
        let mut lines = output.lines();
        let type_line = lines.next().unwrap_or("file").trim();
        let ls_line = lines.next().unwrap_or_default();
        let size_line = lines.next().unwrap_or_default().trim();

        let is_directory = type_line == "dir";
        let size_bytes = if is_directory {
            None
        } else {
            size_line.parse::<u64>().ok()
        };

        let (permissions, modified_at) = parse_ls_long_line(ls_line);

        Ok(DeviceFileProperties {
            name: file_name_from_remote_path(remote_path),
            full_path: remote_path.to_string(),
            is_directory,
            size_bytes,
            modified_at,
            permissions,
        })
    }

    pub fn get_device_file_preview(
        &self,
        device_id: &str,
        remote_path: &str,
        max_bytes: usize,
    ) -> Result<DeviceFilePreview, String> {
        let safe_limit = max_bytes.clamp(64 * 1024, 12 * 1024 * 1024);
        let file_size = self
            .shell_with_timeout(
                device_id,
                &format!(
                    "sh -c 'wc -c < '\"'\"'{}'\"'\"' 2>/dev/null || echo 0'",
                    escape_single_quotes(remote_path)
                ),
                Duration::from_secs(4),
            )
            .ok()
            .and_then(|value| value.trim().parse::<usize>().ok())
            .unwrap_or(0);

        let escaped = escape_single_quotes(remote_path);
        let command = format!("head -c {} '\"'\"'{}'\"'\"'", safe_limit, escaped);
        let args_owned = [
            "-s".to_string(),
            device_id.to_string(),
            "exec-out".to_string(),
            "sh".to_string(),
            "-c".to_string(),
            command,
        ];
        let args: Vec<&str> = args_owned.iter().map(String::as_str).collect();
        let bytes = self.run_bytes_with_timeout(&args, Duration::from_secs(DB_IO_TIMEOUT_SECS))?;

        Ok(DeviceFilePreview {
            name: file_name_from_remote_path(remote_path),
            full_path: remote_path.to_string(),
            mime_type: detect_mime_type(remote_path),
            content_base64: STANDARD.encode(&bytes),
            truncated: file_size > bytes.len(),
        })
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

fn normalize_logcat_lines(output: &str) -> Vec<String> {
    output
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(ToString::to_string)
        .collect()
}

fn parse_ls_long_line(line: &str) -> (Option<String>, Option<String>) {
    let cols: Vec<&str> = line.split_whitespace().collect();
    if cols.len() < 8 {
        return (None, None);
    }

    let permissions = cols.first().map(|value| (*value).to_string());
    let modified_at = Some(format!("{} {} {}", cols[5], cols[6], cols[7]));
    (permissions, modified_at)
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

fn file_name_from_remote_path(remote_path: &str) -> String {
    Path::new(remote_path)
        .file_name()
        .map(|value| value.to_string_lossy().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "download.bin".to_string())
}

fn sanitize_local_file_name(name: &str) -> String {
    name.chars()
        .map(|ch| match ch {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '_',
            _ => ch,
        })
        .collect()
}

fn sanitize_remote_file_name(name: &str) -> String {
    name.chars()
        .map(|ch| match ch {
            '/' | '\\' => '_',
            _ => ch,
        })
        .collect()
}

fn detect_mime_type(path: &str) -> String {
    let ext = Path::new(path)
        .extension()
        .map(|value| value.to_string_lossy().to_lowercase())
        .unwrap_or_default();

    let mime = match ext.as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        "gif" => "image/gif",
        "bmp" => "image/bmp",
        "svg" => "image/svg+xml",
        "mp4" => "video/mp4",
        "webm" => "video/webm",
        "mov" => "video/quicktime",
        "mp3" => "audio/mpeg",
        "wav" => "audio/wav",
        "ogg" => "audio/ogg",
        "m4a" => "audio/mp4",
        "pdf" => "application/pdf",
        "json" => "application/json",
        "xml" => "application/xml",
        "txt" | "md" | "csv" | "log" | "yaml" | "yml" => "text/plain",
        _ => "application/octet-stream",
    };

    mime.to_string()
}

#[cfg(test)]
mod tests {
    use super::{
        escape_single_quotes, file_name_from_remote_path, normalize_logcat_lines,
        normalize_remote_path, sanitize_local_file_name, sanitize_remote_file_name,
    };

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

    #[test]
    fn file_name_from_remote_path_returns_fallback_when_needed() {
        assert_eq!(file_name_from_remote_path("/sdcard/Download/demo.apk"), "demo.apk");
        assert_eq!(file_name_from_remote_path("/"), "download.bin");
    }

    #[test]
    fn sanitize_local_file_name_replaces_invalid_windows_characters() {
        let sanitized = sanitize_local_file_name("a:b*c?.txt");
        assert_eq!(sanitized, "a_b_c_.txt");
    }

    #[test]
    fn sanitize_remote_file_name_replaces_path_separators() {
        let sanitized = sanitize_remote_file_name("foo/bar\\baz.db");
        assert_eq!(sanitized, "foo_bar_baz.db");
    }

    #[test]
    fn detect_mime_type_uses_extension() {
        assert_eq!(super::detect_mime_type("/sdcard/image.png"), "image/png");
        assert_eq!(super::detect_mime_type("/sdcard/readme.txt"), "text/plain");
        assert_eq!(
            super::detect_mime_type("/sdcard/archive.unknown"),
            "application/octet-stream"
        );
    }
}
