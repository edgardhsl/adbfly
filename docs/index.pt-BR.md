# Documentação do ADB Fly

**ADB Fly** é uma ferramenta desktop para inspecionar dados de apps Android via ADB. O foco é contexto do dispositivo conectado, seleção de pacote, navegação/edição de bancos SQLite e inspeção do Android Logcat.

## Escopo atual

- Detectar dispositivos Android conectados via ADB.
- Listar pacotes de apps do dispositivo selecionado.
- Mostrar dados de visão geral do dispositivo, como versão do Android, ABI da CPU, RAM, armazenamento, uso de CPU e uso de memória.
- Navegar pelos bancos SQLite do pacote selecionado.
- Inspecionar tabelas, schemas, dados filtrados, dados ordenados e linhas paginadas.
- Editar células, inserir linhas e excluir linhas quando a tabela tem uma chave primária utilizável.
- Enviar alterações do banco de volta para o sandbox do app via ADB.
- Inspecionar snapshots do Logcat, filtrar entradas, pausar/retomar captura, limpar a visualização e filtrar pelo processo do app selecionado quando disponível.
- Configurar caminhos do OpenSSL para builds locais com SQLCipher.
- Alternar a interface entre inglês, português do Brasil e espanhol.

## Mapa da documentação

- **Primeiros passos:** requisitos locais, instalação, execução e build.
- **Guia do usuário:** fluxo de uso diário e comportamento dos recursos.
- **Contribuição:** checks e expectativas de documentação para mudanças.
- **Arquitetura:** visão técnica curta do frontend, comandos Tauri, casos de uso em Rust, adaptador ADB e repositório SQLite.

## Limites importantes

O ADB Fly depende do ADB e do comando `run-as` do Android para acessar bancos no sandbox dos apps. Bancos de apps que não permitem acesso por `run-as` podem não estar disponíveis.
