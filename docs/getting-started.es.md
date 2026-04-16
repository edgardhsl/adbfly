# Primeros pasos

## Requisitos

- Windows 10/11.
- Node.js 20+.
- Toolchain Rust stable.
- Android SDK Platform Tools con `adb` disponible en `PATH`.
- Un dispositivo Android con depuración USB habilitada.
- OpenSSL solo para builds con soporte SQLCipher.

## Preparar un dispositivo Android

1. Abre **Ajustes > Acerca del teléfono**.
2. Toca **Número de compilación** siete veces para habilitar Opciones de desarrollador.
3. Abre **Ajustes > Opciones de desarrollador**.
4. Habilita **Depuración USB**.
5. Conecta el dispositivo por USB.
6. Acepta la autorización en el dispositivo.
7. Confirma que el host ve el dispositivo:

```bash
adb devices
```

## Instalar dependencias

```bash
npm install
```

## Ejecutar localmente

```bash
npm run tauri:dev
```

El runner de Tauri inicia el servidor frontend de desarrollo y carga rutas de OpenSSL desde `adbfly.ini` cuando el archivo existe.

## Build

```bash
npm run build
npm run tauri:build
```

El build de escritorio se genera en `src-tauri/target/release/`.

## Configuración

ADB Fly guarda la configuración local en `adbfly.ini` dentro del directorio de configuración de la app. En desarrollo, `scripts/tauri-runner.js` también revisa:

- `ADBFLY_CONFIG_PATH`
- `%APPDATA%/com.adbfly.app/adbfly.ini`
- `./adbfly.ini`

Claves soportadas:

```ini
openssl_dir=
openssl_lib_dir=
openssl_include_dir=
preferred_locale=en
```

Cuando las rutas de OpenSSL están configuradas, el runner de Tauri activa la feature Rust `sqlcipher`. Sin ellas, la app funciona con soporte SQLite regular.
