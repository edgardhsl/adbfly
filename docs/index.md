# ADB Fly Documentation

**ADB Fly** is a desktop tool for inspecting Android app data through ADB. It focuses on connected-device context, app package selection, SQLite database browsing/editing, and Android Logcat inspection.

## Current Scope

- Detect connected Android devices through ADB.
- List app packages from the selected device.
- Show device overview data such as Android version, CPU ABI, RAM, storage, CPU usage, and memory usage.
- Browse SQLite databases from the selected app package.
- Inspect tables, schemas, filtered data, sorted data, and paginated rows.
- Edit cells, insert rows, and delete rows when the table has a usable primary key.
- Push database changes back to the app sandbox through ADB.
- Inspect Logcat snapshots, filter entries, pause/resume capture, clear the view, and optionally filter by selected app process.
- Configure OpenSSL paths for SQLCipher-enabled local builds.
- Switch the interface between English, Portuguese (Brazil), and Spanish.

## Documentation Map

- **Getting Started:** local requirements, install, run, and build commands.
- **User Guide:** daily app workflow and feature behavior.
- **Contributing:** checks and documentation expectations for changes.
- **Architecture:** short technical overview of the frontend, Tauri commands, Rust use cases, ADB adapter, and SQLite repository.

## Important Limits

ADB Fly depends on ADB and Android's `run-as` command for app-sandbox database access. Databases from apps that do not allow `run-as` access may not be available.
