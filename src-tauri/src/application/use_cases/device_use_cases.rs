use crate::domain::entities::{Device, DeviceOverview, Package};
use crate::infrastructure::adb::AdbAdapter;
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

const PACKAGES_CACHE_TTL: Duration = Duration::from_secs(8);
const OVERVIEW_CACHE_TTL: Duration = Duration::from_secs(2);

pub struct DeviceUseCases {
    adb: AdbAdapter,
    packages_cache: Mutex<HashMap<String, (Instant, Vec<Package>)>>,
    overview_cache: Mutex<HashMap<String, (Instant, DeviceOverview)>>,
}

impl DeviceUseCases {
    pub fn new() -> Self {
        Self {
            adb: AdbAdapter::new(),
            packages_cache: Mutex::new(HashMap::new()),
            overview_cache: Mutex::new(HashMap::new()),
        }
    }

    pub fn list_devices(&self) -> Result<Vec<Device>, String> {
        log::info!("Listing devices");
        let devices = self.adb.list_devices()?;
        log::info!("Found {} devices", devices.len());
        Ok(devices)
    }

    pub fn list_packages(&self, device_id: &str) -> Result<Vec<Package>, String> {
        if let Ok(cache) = self.packages_cache.lock() {
            if let Some((stored_at, packages)) = cache.get(device_id) {
                if stored_at.elapsed() <= PACKAGES_CACHE_TTL {
                    return Ok(packages.clone());
                }
            }
        }

        log::info!("Listing packages for device: {}", device_id);
        let packages = self.adb.list_packages(device_id)?;
        log::info!("Found {} packages", packages.len());

        if let Ok(mut cache) = self.packages_cache.lock() {
            cache.insert(device_id.to_string(), (Instant::now(), packages.clone()));
        }

        Ok(packages)
    }

    pub fn get_device_overview(&self, device_id: &str) -> Result<DeviceOverview, String> {
        if let Ok(cache) = self.overview_cache.lock() {
            if let Some((stored_at, overview)) = cache.get(device_id) {
                if stored_at.elapsed() <= OVERVIEW_CACHE_TTL {
                    return Ok(overview.clone());
                }
            }
        }

        let android_version = self
            .adb
            .shell(device_id, "getprop ro.build.version.release")
            .unwrap_or_default()
            .trim()
            .to_string();

        let cpu_abi = self
            .adb
            .shell(device_id, "getprop ro.product.cpu.abi")
            .unwrap_or_default()
            .trim()
            .to_string();

        let meminfo = self
            .adb
            .shell(device_id, "cat /proc/meminfo")
            .unwrap_or_default();
        let total_ram_kb = parse_meminfo_kb(&meminfo, "MemTotal").unwrap_or(0);
        let available_ram_kb = parse_meminfo_kb(&meminfo, "MemAvailable").unwrap_or(0);
        let used_ram_kb = total_ram_kb.saturating_sub(available_ram_kb);

        let total_ram_mb = total_ram_kb / 1024;
        let used_ram_mb = used_ram_kb / 1024;
        let memory_usage_percent = if total_ram_kb > 0 {
            (used_ram_kb as f64 / total_ram_kb as f64) * 100.0
        } else {
            0.0
        };

        let df_output = self.adb.shell(device_id, "df -k /data").unwrap_or_default();
        let (storage_total_gb, storage_used_gb) =
            parse_storage_gb(&df_output).unwrap_or((0.0, 0.0));

        let cpu_output = self
            .adb
            .shell(device_id, "dumpsys cpuinfo")
            .unwrap_or_default();
        let cpu_usage_percent = parse_cpu_percent(&cpu_output).unwrap_or(0.0);

        let overview = DeviceOverview {
            android_version: if android_version.is_empty() {
                "unknown".to_string()
            } else {
                android_version
            },
            cpu_abi: if cpu_abi.is_empty() {
                "unknown".to_string()
            } else {
                cpu_abi
            },
            total_ram_mb,
            used_ram_mb,
            storage_total_gb,
            storage_used_gb,
            cpu_usage_percent,
            memory_usage_percent,
        };

        if let Ok(mut cache) = self.overview_cache.lock() {
            cache.insert(device_id.to_string(), (Instant::now(), overview.clone()));
        }

        Ok(overview)
    }
}

fn parse_meminfo_kb(meminfo: &str, key: &str) -> Option<u64> {
    meminfo.lines().find_map(|line| {
        if !line.starts_with(key) {
            return None;
        }

        let value = line
            .split_whitespace()
            .nth(1)
            .and_then(|v| v.parse::<u64>().ok())?;
        Some(value)
    })
}

fn parse_storage_gb(df_output: &str) -> Option<(f64, f64)> {
    let line = df_output
        .lines()
        .rev()
        .find(|entry| {
            let trimmed = entry.trim();
            !trimmed.is_empty() && !trimmed.starts_with("Filesystem")
        })?;
    let cols: Vec<&str> = line.split_whitespace().collect();
    if cols.len() < 3 {
        return None;
    }

    let total_kb = cols.get(1)?.parse::<u64>().ok()?;
    let used_kb = cols.get(2)?.parse::<u64>().ok()?;

    let total_gb = total_kb as f64 / 1024.0 / 1024.0;
    let used_gb = used_kb as f64 / 1024.0 / 1024.0;
    Some((total_gb, used_gb))
}

fn parse_cpu_percent(cpu_output: &str) -> Option<f64> {
    cpu_output
        .lines()
        .filter(|line| line.contains("TOTAL"))
        .find_map(|line| {
            let token = line.split_whitespace().find(|value| value.contains('%'))?;
            let cleaned = token.trim().trim_end_matches('%');
            cleaned.replace(',', ".").parse::<f64>().ok()
        })
}
