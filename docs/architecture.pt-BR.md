# Arquitetura

## Stack

- **Frontend:** Next.js, React, Tailwind CSS, componentes Radix UI e React Query.
- **Shell desktop:** Tauri 2.
- **Backend:** comandos Rust, casos de uso e adaptadores de infraestrutura.
- **Integração com dispositivo:** Android Debug Bridge (`adb`).
- **Acesso SQLite:** `rusqlite`, com suporte opcional a SQLCipher por feature de build com OpenSSL.

## Fluxo em runtime

1. O React chama uma função tipada de `src/lib/api.ts`.
2. A API invoca um comando Tauri.
3. O comando delega para um caso de uso em Rust.
4. O caso de uso chama o adaptador ADB ou o repositório SQLite.
5. O resultado volta para o React e é cacheado/refetchado pelo React Query.

## Módulos principais

- `src/app/page.tsx`: estado da aplicação, busca de dados e orquestração dos workspaces.
- `src/components/workspace/*`: UI de Overview, Databases, Logcat, Settings, sidebar e header.
- `src/lib/api.ts`: fronteira frontend para comandos Tauri e dados mock em contextos sem Tauri/E2E.
- `src-tauri/src/presentation/commands.rs`: handlers de comandos Tauri.
- `src-tauri/src/application/use_cases/*`: casos de uso de dispositivo e banco de dados.
- `src-tauri/src/infrastructure/adb/*`: execução de processos ADB, descoberta de dispositivos/pacotes, Logcat e snapshots de arquivos do sandbox do app.
- `src-tauri/src/infrastructure/sqlite/repository.rs`: leituras/escritas SQLite locais e envio de bancos modificados de volta ao dispositivo.

## Acesso a bancos

O ADB Fly lê bancos de apps puxando um snapshot temporário do diretório `databases/` do pacote selecionado com `run-as`. Navegação por tabelas, filtros, ordenação e leitura de schema acontecem localmente nesse snapshot.

Para operações INSERT, UPDATE e DELETE, o banco local modificado é enviado de volta para o sandbox do app. Arquivos auxiliares SQLite `-wal` e `-shm` também são tratados quando existem.

## Notas de performance

- O polling da visão geral do dispositivo roda apenas enquanto Overview está visível.
- O polling do Logcat roda apenas enquanto a captura está ativa e a janela está visível.
- Leituras de tabela usam paginação e virtualização de linhas na UI.
- O Logcat mantém uma janela limitada de snapshots e preserva a posição de scroll durante a leitura de entradas antigas.

## Fronteiras de segurança

- Todas as operações de dispositivo ficam escopadas ao dispositivo ADB selecionado.
- O acesso a dados do app fica escopado ao pacote selecionado.
- Escritas em banco são ações de tabela acionadas pelo usuário e traduzidas em SQL.
- Configurações de ambiente são salvas no arquivo local de configuração do app.
