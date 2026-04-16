# Arquitectura

## Stack

- **Frontend:** Next.js, React, Tailwind CSS, componentes Radix UI y React Query.
- **Shell de escritorio:** Tauri 2.
- **Backend:** comandos Rust, casos de uso y adaptadores de infraestructura.
- **Integración con dispositivo:** Android Debug Bridge (`adb`).
- **Acceso SQLite:** `rusqlite`, con soporte opcional SQLCipher mediante una feature de build con OpenSSL.

## Flujo en runtime

1. React llama una función tipada de `src/lib/api.ts`.
2. La API invoca un comando Tauri.
3. El comando delega a un caso de uso en Rust.
4. El caso de uso llama al adaptador ADB o al repositorio SQLite.
5. El resultado vuelve a React y React Query lo cachea/refresca.

## Módulos principales

- `src/app/page.tsx`: estado de la aplicación, carga de datos y orquestación de workspaces.
- `src/components/workspace/*`: UI de Overview, Databases, Logcat, Settings, sidebar y header.
- `src/lib/api.ts`: frontera frontend para comandos Tauri y datos mock en contextos sin Tauri/E2E.
- `src-tauri/src/presentation/commands.rs`: handlers de comandos Tauri.
- `src-tauri/src/application/use_cases/*`: casos de uso de dispositivo y base de datos.
- `src-tauri/src/infrastructure/adb/*`: ejecución de procesos ADB, descubrimiento de dispositivos/paquetes, Logcat y snapshots de archivos del sandbox de la app.
- `src-tauri/src/infrastructure/sqlite/repository.rs`: lecturas/escrituras SQLite locales y envío de bases modificadas de vuelta al dispositivo.

## Acceso a bases

ADB Fly lee bases de apps trayendo un snapshot temporal desde el directorio `databases/` del paquete seleccionado con `run-as`. La navegación por tablas, filtros, ordenación y lectura de esquema ocurren localmente sobre ese snapshot.

Para operaciones INSERT, UPDATE y DELETE, la base local modificada se envía de vuelta al sandbox de la app. Los archivos auxiliares SQLite `-wal` y `-shm` también se manejan cuando existen.

## Notas de rendimiento

- El polling de la vista general del dispositivo corre solo mientras Overview está visible.
- El polling de Logcat corre solo mientras la captura está activa y la ventana está visible.
- Las lecturas de tabla usan paginación y virtualización de filas en la UI.
- Logcat mantiene una ventana limitada de snapshots y preserva la posición de scroll al leer entradas antiguas.

## Fronteras de seguridad

- Todas las operaciones de dispositivo quedan acotadas al dispositivo ADB seleccionado.
- El acceso a datos de app queda acotado al paquete seleccionado.
- Las escrituras en base son acciones de tabla iniciadas por el usuario y traducidas a SQL.
- Las configuraciones de entorno se guardan en el archivo local de configuración de la app.
