# User Guide

## Basic Flow

1. Connect an Android device with USB debugging enabled.
2. Click **Refresh ADB**.
3. Select a device from the sidebar.
4. Search and select an app package.
5. Open **Overview**, **Databases**, or **Logcat** from the workspace navigation.

## Overview

The Overview workspace shows device context returned by ADB:

- Android version.
- CPU ABI.
- RAM.
- Storage usage.
- CPU and memory usage history while the workspace is visible.

If the overview fails to load, use the retry action in the workspace.

## Databases

The Databases workspace lists SQLite files found under the selected app package's `databases/` directory.

Typical workflow:

1. Select a database in the schema explorer.
2. Select a table.
3. Use sorting, filters, and pagination to inspect rows.
4. Double-click a cell to edit it.
5. Use the row actions to insert or delete records.
6. Commit or discard pending row edits from the table toolbar.

Data changes are executed against a temporary local database snapshot. After a successful INSERT, UPDATE, or DELETE, ADB Fly pushes the changed database and SQLite sidecar files back to the app sandbox.

### Editing Limits

- Row editing and deletion need a primary key so the app can identify the target row.
- Blob values are displayed as byte-size placeholders.
- App database access depends on Android `run-as`; non-debuggable or restricted apps may block access.

### SQLCipher

When a database appears encrypted, ADB Fly asks for a SQLCipher key. SQLCipher support is only available when the app is started from a build with OpenSSL configured.

## Logcat

The Logcat workspace reads recent log snapshots from the selected device.

Available actions:

- Pause or resume capture.
- Clear the current log view.
- Filter by keyword or regular expression.
- Filter by selected app process when a package is selected and the process is running.
- Use **Home** and **End** to jump through the log view.

The view keeps following the bottom only while you are already near the newest entries, so reading older logs does not get interrupted.

## Settings

Settings stores environment values in `adbfly.ini`:

- `OPENSSL_DIR`
- `OPENSSL_LIB_DIR`
- `OPENSSL_INCLUDE_DIR`
- Preferred locale

OpenSSL paths are used by local runs/builds that need SQLCipher support.
