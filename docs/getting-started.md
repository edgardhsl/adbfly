# Getting Started

## Requirements

- Windows 10/11.
- Node.js 20+.
- Rust stable toolchain.
- Android SDK Platform Tools with `adb` available in `PATH`.
- An Android device with USB debugging enabled.
- OpenSSL only when building with SQLCipher support.

## Prepare an Android Device

1. Open **Settings > About phone**.
2. Tap **Build number** seven times to enable Developer Options.
3. Open **Settings > Developer options**.
4. Enable **USB debugging**.
5. Connect the device by USB.
6. Accept the authorization prompt on the device.
7. Confirm the host can see the device:

```bash
adb devices
```

## Install Dependencies

```bash
npm install
```

## Run Locally

```bash
npm run tauri:dev
```

The Tauri runner starts the frontend dev server and loads OpenSSL paths from `adbfly.ini` when available.

## Build

```bash
npm run build
npm run tauri:build
```

The desktop build is generated under `src-tauri/target/release/`.

## Configuration

ADB Fly stores local settings in `adbfly.ini` in the app config directory. During development, `scripts/tauri-runner.js` also checks:

- `ADBFLY_CONFIG_PATH`
- `%APPDATA%/com.adbfly.app/adbfly.ini`
- `./adbfly.ini`

Supported keys:

```ini
openssl_dir=
openssl_lib_dir=
openssl_include_dir=
preferred_locale=en
```

When OpenSSL paths are configured, the Tauri runner enables the `sqlcipher` Rust feature. Without them, the app runs with regular SQLite support.
