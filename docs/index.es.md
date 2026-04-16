# Documentación de ADB Fly

**ADB Fly** es una herramienta de escritorio para inspeccionar datos de apps Android mediante ADB. Se centra en el contexto del dispositivo conectado, la selección de paquetes, la navegación/edición de bases SQLite y la inspección de Android Logcat.

## Alcance actual

- Detectar dispositivos Android conectados mediante ADB.
- Listar paquetes de apps del dispositivo seleccionado.
- Mostrar datos generales del dispositivo, como versión de Android, ABI de CPU, RAM, almacenamiento, uso de CPU y uso de memoria.
- Explorar bases SQLite del paquete seleccionado.
- Inspeccionar tablas, esquemas, datos filtrados, datos ordenados y filas paginadas.
- Editar celdas, insertar filas y eliminar filas cuando la tabla tiene una clave primaria utilizable.
- Enviar cambios de la base de datos de vuelta al sandbox de la app mediante ADB.
- Inspeccionar snapshots de Logcat, filtrar entradas, pausar/reanudar captura, limpiar la vista y filtrar por el proceso de la app seleccionada cuando esté disponible.
- Configurar rutas de OpenSSL para builds locales con SQLCipher.
- Cambiar la interfaz entre inglés, portugués de Brasil y español.

## Mapa de la documentación

- **Primeros pasos:** requisitos locales, instalación, ejecución y build.
- **Guía de usuario:** flujo diario y comportamiento de las funciones.
- **Contribución:** checks y expectativas de documentación para cambios.
- **Arquitectura:** vista técnica breve del frontend, comandos Tauri, casos de uso en Rust, adaptador ADB y repositorio SQLite.

## Límites importantes

ADB Fly depende de ADB y del comando `run-as` de Android para acceder a bases dentro del sandbox de las apps. Las bases de apps que no permiten acceso por `run-as` pueden no estar disponibles.
