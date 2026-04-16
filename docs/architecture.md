# Architecture

## Stack

- **Frontend:** Next.js, React, Tailwind CSS, Radix UI components, React Query.
- **Desktop shell:** Tauri 2.
- **Backend:** Rust commands, use cases, and infrastructure adapters.
- **Device integration:** Android Debug Bridge (`adb`).
- **SQLite access:** `rusqlite`, with optional SQLCipher support through a feature-gated OpenSSL build.

## Runtime Flow

1. React calls a typed function from `src/lib/api.ts`.
2. The API invokes a Tauri command.
3. The command delegates to a Rust use case.
4. The use case calls either the ADB adapter or the SQLite repository.
5. The result returns to React and is cached/refetched by React Query.

## Main Modules

- `src/app/page.tsx`: application state, data fetching, and workspace orchestration.
- `src/components/workspace/*`: Overview, Databases, Logcat, Settings, sidebar, and header UI.
- `src/lib/api.ts`: frontend boundary for Tauri commands and mock data in non-Tauri/E2E contexts.
- `src-tauri/src/presentation/commands.rs`: Tauri command handlers.
- `src-tauri/src/application/use_cases/*`: device and database use cases.
- `src-tauri/src/infrastructure/adb/*`: ADB process execution, device/package discovery, Logcat, and app-sandbox file snapshots.
- `src-tauri/src/infrastructure/sqlite/repository.rs`: local SQLite reads/writes and push-back of modified database files.

## Database Access

ADB Fly reads app databases by pulling a temporary snapshot from the selected package's `databases/` directory with `run-as`. Table browsing, filtering, sorting, and schema reads happen locally against that snapshot.

For INSERT, UPDATE, and DELETE operations, the modified local database is pushed back to the app sandbox. SQLite `-wal` and `-shm` sidecar files are also handled when present.

## Performance Notes

- Device overview polling runs only while Overview is visible.
- Logcat polling runs only while Logcat capture is active and the window is visible.
- Table reads use pagination and row virtualization in the UI.
- Logcat keeps a bounded snapshot window and preserves scroll position when reading older entries.

## Security Boundaries

- All device operations are scoped to the selected ADB device.
- App data access is scoped to the selected package.
- Database writes are user-driven table actions translated into SQL.
- Environment settings are stored in the local app config file.
