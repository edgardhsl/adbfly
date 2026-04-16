# Guia do usuário

## Fluxo básico

1. Conecte um dispositivo Android com depuração USB ativada.
2. Clique em **Refresh ADB**.
3. Selecione um dispositivo na sidebar.
4. Pesquise e selecione um pacote de app.
5. Abra **Overview**, **Databases** ou **Logcat** pela navegação do workspace.

## Overview

O workspace Overview mostra contexto do dispositivo retornado pelo ADB:

- Versão do Android.
- ABI da CPU.
- RAM.
- Uso de armazenamento.
- Histórico de uso de CPU e memória enquanto o workspace está visível.

Se a visão geral falhar ao carregar, use a ação de retry no workspace.

## Databases

O workspace Databases lista arquivos SQLite encontrados em `databases/` dentro do pacote selecionado.

Fluxo comum:

1. Selecione um banco no explorador de schema.
2. Selecione uma tabela.
3. Use ordenação, filtros e paginação para inspecionar linhas.
4. Dê duplo clique em uma célula para editá-la.
5. Use as ações de linha para inserir ou excluir registros.
6. Confirme ou descarte edições pendentes pela toolbar da tabela.

Alterações de dados são executadas em um snapshot local temporário do banco. Depois de um INSERT, UPDATE ou DELETE bem-sucedido, o ADB Fly envia o banco alterado e arquivos auxiliares do SQLite de volta para o sandbox do app.

### Limites de edição

- Edição e exclusão de linhas precisam de chave primária para que o app identifique a linha alvo.
- Valores blob aparecem como placeholders com o tamanho em bytes.
- O acesso ao banco do app depende do `run-as` do Android; apps não depuráveis ou restritos podem bloquear o acesso.

### SQLCipher

Quando um banco parece criptografado, o ADB Fly solicita a chave SQLCipher. O suporte a SQLCipher só fica disponível quando o app é iniciado a partir de um build com OpenSSL configurado.

## Logcat

O workspace Logcat lê snapshots recentes de logs do dispositivo selecionado.

Ações disponíveis:

- Pausar ou retomar captura.
- Limpar a visualização atual.
- Filtrar por palavra-chave ou expressão regular.
- Filtrar pelo processo do app selecionado quando há um pacote selecionado e o processo está rodando.
- Usar **Home** e **End** para navegar rapidamente pela visualização.

A visualização continua acompanhando o fim apenas quando você já está perto das entradas mais recentes, para não interromper a leitura de logs antigos.

## Settings

Settings salva valores de ambiente em `adbfly.ini`:

- `OPENSSL_DIR`
- `OPENSSL_LIB_DIR`
- `OPENSSL_INCLUDE_DIR`
- Locale preferido

Os caminhos do OpenSSL são usados por execuções/builds locais que precisam de suporte a SQLCipher.
