# Contributing to ADB Device Explorer

Thank you for your interest in contributing!

## Code of Conduct

Please be respectful and inclusive when participating in this project. We expect all contributors to follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## How Can I Contribute?

### Reporting Bugs

1. Check if the bug has already been reported
2. Create a detailed issue with:
   - Clear title
   - Steps to reproduce
   - Expected vs actual behavior
   - Your environment (OS, device, app version)
   - Screenshots if applicable

### Suggesting Features

1. Open an issue with the tag `enhancement`
2. Describe the feature and its use case
3. Explain why this would benefit users

### Pull Requests

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. **Mandatory:** Add/update unit, integration, and regression tests. This is a strict project rule to prevent potential new bugs.
5. Ensure code follows project conventions
6. Write clear commit messages
7. Submit a PR with a detailed description

## Versioning, Branches, and Tags

This project uses an automated semantic versioning and release system powered by GitHub Actions.

1. **Branches:** Feature branches should be merged into the `main` branch via Pull Requests.
2. **Version Bumps:** When a Pull Request is merged into the `main` branch, a GitHub Action (`anothrNick/github-tag-action`) will automatically analyze the commit messages to determine the next semantic version bump (patch, minor, or major) and generate a new tag (e.g., `v1.0.1`).
3. **Releases:** After a tag is created, the Release GitHub Action must be triggered **manually**. Go to the Actions tab, select the Release workflow, and click "Run workflow". The action will automatically retrieve the latest generated tag, build the application for multiple platforms (Windows, macOS, Linux) and create a new GitHub Release draft containing the compiled binaries.

## Development Setup

```bash
# Clone and install
git clone https://github.com/edgardhsl/adb-device-explorer.git
cd adb-device-explorer
npm install

# Run development
npm run dev
npm run tauri dev
```

## Coding Standards

- Use TypeScript for new code
- Follow existing code style and patterns
- Use meaningful variable/function names
- Add comments for complex logic
- Run linting before committing: `npm run lint`

## Testing

Test your changes thoroughly:
- Test on different devices if applicable
- Test both light and dark themes
- Test all supported languages

## Commit Messages

Use clear, descriptive commit messages:
- `feat: add row deletion confirmation`
- `fix: resolve cell editing on null values`
- `docs: update installation instructions`
- `refactor: improve database query performance`

## Review Process

1. PRs require at least one review
2. Address feedback promptly
3. Keep PRs focused and reasonably sized

---

**Thank you for contributing! 🎉**