# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] - 2026-04-07

### Added
- Device listing via ADB
- App listing (third-party apps only)
- Database listing within apps
- Table listing within databases
- Table data viewing with:
  - Pagination
  - Column sorting (ascending/descending)
  - Column filtering
- Cell inline editing
- Add new row functionality
- Delete row functionality
- Automatic database sync (push changes back to device)
- Dark/Light theme support with system detection
- Multi-language support:
  - Portuguese (pt-BR)
  - English (en)
  - Spanish (es)
- SQL query execution with Monaco Editor

### Tech Stack
- Next.js 16.2.0
- React 19.0.0
- Tauri 2.x
- Tailwind CSS 3.4
- rusqlite
- ADB integration

---

## [Unreleased]

### Planned Features
- Database schema visualization
- Export to CSV/JSON
- Query history
- Favorite tables
- Table relationship diagram
- Multiple device support