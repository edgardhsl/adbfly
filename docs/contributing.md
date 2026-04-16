# Contributing

## Local Setup

```bash
npm install
npm run tauri:dev
```

For SQLCipher work, configure OpenSSL paths in `adbfly.ini` before starting Tauri.

## Checks

Run the checks that match the change:

```bash
npm run test:unit
npm run test:e2e
```

```bash
cd src-tauri
cargo test
```

For documentation changes:

```bash
pip install -r requirements-docs.txt
npm run docs:build
```

## Documentation Policy

Keep documentation aligned with the implemented app behavior.

- Update English, Portuguese, and Spanish pages together.
- Document only features that are available or needed to use the current app.
- Mention important limits, especially ADB access, `run-as`, database writes, SQLCipher, and OpenSSL setup.
- Keep internal planning and design notes out of MkDocs pages.

## Pull Requests

- Keep PRs focused.
- Include screenshots for UI changes.
- Include tests or a clear manual validation note when automation is not practical.
- Avoid unrelated formatting churn.
