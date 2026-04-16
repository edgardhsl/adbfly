# Guía de usuario

## Flujo básico

1. Conecta un dispositivo Android con depuración USB habilitada.
2. Haz clic en **Refresh ADB**.
3. Selecciona un dispositivo en la barra lateral.
4. Busca y selecciona un paquete de app.
5. Abre **Overview**, **Databases** o **Logcat** desde la navegación del workspace.

## Overview

El workspace Overview muestra contexto del dispositivo devuelto por ADB:

- Versión de Android.
- ABI de CPU.
- RAM.
- Uso de almacenamiento.
- Historial de uso de CPU y memoria mientras el workspace está visible.

Si la vista general falla al cargar, usa la acción de retry en el workspace.

## Databases

El workspace Databases lista archivos SQLite encontrados en `databases/` dentro del paquete seleccionado.

Flujo común:

1. Selecciona una base en el explorador de esquema.
2. Selecciona una tabla.
3. Usa ordenación, filtros y paginación para inspeccionar filas.
4. Haz doble clic en una celda para editarla.
5. Usa las acciones de fila para insertar o eliminar registros.
6. Confirma o descarta ediciones pendientes desde la toolbar de la tabla.

Los cambios de datos se ejecutan contra un snapshot local temporal de la base. Después de un INSERT, UPDATE o DELETE exitoso, ADB Fly envía la base modificada y los archivos auxiliares de SQLite de vuelta al sandbox de la app.

### Límites de edición

- La edición y eliminación de filas necesitan una clave primaria para que la app identifique la fila objetivo.
- Los valores blob se muestran como placeholders con el tamaño en bytes.
- El acceso a la base de la app depende de `run-as` de Android; las apps no depurables o restringidas pueden bloquear el acceso.

### SQLCipher

Cuando una base parece cifrada, ADB Fly solicita la clave SQLCipher. El soporte SQLCipher solo está disponible cuando la app se inicia desde un build con OpenSSL configurado.

## Logcat

El workspace Logcat lee snapshots recientes de logs del dispositivo seleccionado.

Acciones disponibles:

- Pausar o reanudar captura.
- Limpiar la vista actual.
- Filtrar por palabra clave o expresión regular.
- Filtrar por el proceso de la app seleccionada cuando hay un paquete seleccionado y el proceso está en ejecución.
- Usar **Home** y **End** para moverse rápidamente por la vista.

La vista sigue el final solo cuando ya estás cerca de las entradas más recientes, para no interrumpir la lectura de logs antiguos.

## Settings

Settings guarda valores de entorno en `adbfly.ini`:

- `OPENSSL_DIR`
- `OPENSSL_LIB_DIR`
- `OPENSSL_INCLUDE_DIR`
- Locale preferido

Las rutas de OpenSSL se usan en ejecuciones/builds locales que necesitan soporte SQLCipher.
