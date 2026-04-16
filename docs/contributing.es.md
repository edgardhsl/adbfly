# Contribución

## Setup local

```bash
npm install
npm run tauri:dev
```

Para trabajo con SQLCipher, configura las rutas de OpenSSL en `adbfly.ini` antes de iniciar Tauri.

## Checks

Ejecuta los checks que correspondan al cambio:

```bash
npm run test:unit
npm run test:e2e
```

```bash
cd src-tauri
cargo test
```

Para cambios de documentación:

```bash
pip install -r requirements-docs.txt
npm run docs:build
```

## Política de documentación

Mantén la documentación alineada con el comportamiento implementado en la app.

- Actualiza las páginas en inglés, portugués y español juntas.
- Documenta solo funciones disponibles o necesarias para usar la app actual.
- Menciona límites importantes, especialmente acceso por ADB, `run-as`, escrituras en base, SQLCipher y setup de OpenSSL.
- Mantén la planificación interna y notas de diseño fuera de las páginas de MkDocs.

## Pull requests

- Mantén los PRs enfocados.
- Incluye screenshots para cambios de UI.
- Incluye tests o una nota clara de validación manual cuando la automatización no sea práctica.
- Evita churn de formato sin relación con el cambio.
