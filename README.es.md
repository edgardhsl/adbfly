# ADB Fly

<div align="center">

[![Versión](https://img.shields.io/badge/version-0.1.0-blue)](https://github.com/edgardhsl/adbfly)
[![Licencia](https://img.shields.io/badge/license-MIT-green)](https://github.com/edgardhsl/adbfly/blob/main/LICENSE)

<img src="./public/images/logo.webp" alt="ADB Fly" width="160" />

<img src="./public/images/app.webp" alt="Captura de pantalla de ADB Fly" width="980" />

**Navega y gestiona bases de datos SQLite en dispositivos Android vía ADB**

[English](./README.md) · [Português](./README.pt-BR.md) · [Español](./README.es.md)

</div>

---

## Acerca de

ADB Fly es una aplicación de escritorio que te permite navegar y gestionar bases de datos SQLite de aplicaciones instaladas en dispositivos Android conectados vía ADB (Android Debug Bridge).

---

## Características

- **Navegador de Dispositivos**: Lista y selecciona dispositivos Android conectados vía ADB
- **Explorador de Apps**: Visualiza aplicaciones instaladas en el dispositivo seleccionado
- **Navegador de Bases de Datos**:
  - Lista bases de datos SQLite de cada app
  - Visor de tablas con paginación, ordenación y filtrado
  - Edición inline de celdas
  - Agregar y eliminar filas
  - Sincronización automática de cambios al dispositivo
- **Búsqueda Global en la Sidebar**: Busca por dispositivos, apps, bases y tablas
- **Multiidioma**: Portugués, Inglés y Español

---

## Requisitos

### Software
- [ADB](https://developer.android.com/studio/command-line/adb) (Android SDK Platform Tools)
- OpenSSL (solo para build local con SQLCipher)
- Windows 10/11 (otras plataformas no probadas)

### Dispositivo Android
- Android 5.0+ (Lollipop)
- Depuración USB activada en Opciones de Desarrollador

### Configurar Dispositivo Android
1. Ve a **Configuración > Acerca del teléfono**
2. Toca **Número de compilación** 7 veces para activar Opciones de desarrollador
3. Ve a **Configuración > Opciones de desarrollador**
4. Activa **Depuración USB**
5. Conecta el dispositivo vía USB
6. Acepta el prompt de autorización en el dispositivo

---

## Instalación

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev
npm run tauri:dev

# Build para producción
npm run build
npm run tauri:build
```

El ejecutable estará en `src-tauri/target/release/`

### SQLCipher con crate OpenSSL de Rust

El proyecto usa el crate `openssl` sin build vendorizado de OpenSSL.

Ejecuta:

```powershell
npm run tauri:dev
```

Si OpenSSL está configurado (`OPENSSL_DIR` o `OPENSSL_LIB_DIR` + `OPENSSL_INCLUDE_DIR`), SQLCipher se habilita.
Si no está configurado, la app inicia con fallback SQLite.

---

## Uso

1. Conecta tu dispositivo Android vía USB
2. Asegúrate de que la depuración USB está activada
3. Selecciona tu dispositivo en la barra lateral
4. Expande el dispositivo para ver las aplicaciones instaladas
5. Selecciona una app para ver sus bases de datos
6. Haz clic en una base de datos, luego selecciona una tabla
7. Haz doble clic en una celda para editar, presiona Enter para guardar

---

## Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 16, React 19, Tailwind CSS |
| Desktop | Tauri 2 |
| Backend | Rust |
| Base de datos | rusqlite |
| Comunicación | ADB |

---

## Contribuyendo

¡Contribuciones son bienvenidas! Lee [CONTRIBUTING.md](CONTRIBUTING.md) antes de enviar PRs.

---

## Licencia

Licencia MIT - consulta el archivo [LICENSE](LICENSE).

---

## FAQ

### No puedo ver mi dispositivo?
Asegúrate de que:
- La depuración USB está activada
- El dispositivo está autorizado (verifica el prompt en el dispositivo)
- Ejecuta `adb devices` para verificar la conexión

### La base de datos no abre?
Algunas apps pueden tener bases de datos corruptas o acceso restringido. Intenta cerrar la app en tu dispositivo primero.

### Puedo editar cualquier tabla?
Solo las tablas con clave primaria pueden ser editadas. La app usa la clave primaria para identificar filas.

### Los cambios se guardan en el dispositivo?
Sí! Después de INSERT, UPDATE o DELETE, la base de datos modificada se envía automáticamente de vuelta al dispositivo.

---

<div align="center">

**Hecho con ❤️ por [EdgarHS](https://github.com/edgardhsl)**

</div>
