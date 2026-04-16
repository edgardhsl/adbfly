# Primeiros passos

## Requisitos

- Windows 10/11.
- Node.js 20+.
- Toolchain Rust stable.
- Android SDK Platform Tools com `adb` disponível no `PATH`.
- Um dispositivo Android com depuração USB ativada.
- OpenSSL apenas para builds com suporte a SQLCipher.

## Preparar um dispositivo Android

1. Abra **Configurações > Sobre o telefone**.
2. Toque em **Número da versão** sete vezes para ativar as Opções do desenvolvedor.
3. Abra **Configurações > Opções do desenvolvedor**.
4. Ative **Depuração USB**.
5. Conecte o dispositivo por USB.
6. Aceite a autorização no dispositivo.
7. Confirme que o host enxerga o dispositivo:

```bash
adb devices
```

## Instalar dependências

```bash
npm install
```

## Rodar localmente

```bash
npm run tauri:dev
```

O runner do Tauri inicia o servidor frontend de desenvolvimento e carrega caminhos do OpenSSL a partir de `adbfly.ini` quando o arquivo existe.

## Build

```bash
npm run build
npm run tauri:build
```

O build desktop é gerado em `src-tauri/target/release/`.

## Configuração

O ADB Fly guarda configurações locais em `adbfly.ini` no diretório de configuração do app. Em desenvolvimento, `scripts/tauri-runner.js` também verifica:

- `ADBFLY_CONFIG_PATH`
- `%APPDATA%/com.adbfly.app/adbfly.ini`
- `./adbfly.ini`

Chaves suportadas:

```ini
openssl_dir=
openssl_lib_dir=
openssl_include_dir=
preferred_locale=en
```

Quando os caminhos do OpenSSL estão configurados, o runner do Tauri ativa a feature Rust `sqlcipher`. Sem eles, o app roda com suporte a SQLite comum.
