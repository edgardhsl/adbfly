# Contribuição

## Setup local

```bash
npm install
npm run tauri:dev
```

Para trabalho com SQLCipher, configure os caminhos do OpenSSL em `adbfly.ini` antes de iniciar o Tauri.

## Checks

Rode os checks compatíveis com a mudança:

```bash
npm run test:unit
npm run test:e2e
```

```bash
cd src-tauri
cargo test
```

Para mudanças na documentação:

```bash
pip install -r requirements-docs.txt
npm run docs:build
```

## Política de documentação

Mantenha a documentação alinhada ao comportamento implementado no app.

- Atualize páginas em inglês, português e espanhol juntas.
- Documente apenas recursos disponíveis ou necessários para usar o app atual.
- Mencione limites importantes, especialmente acesso via ADB, `run-as`, escritas em banco, SQLCipher e setup de OpenSSL.
- Deixe planejamento interno e notas de design fora das páginas do MkDocs.

## Pull requests

- Mantenha PRs focados.
- Inclua screenshots para mudanças de UI.
- Inclua testes ou uma nota clara de validação manual quando automação não for prática.
- Evite churn de formatação sem relação com a mudança.
