# ADB Device Explorer

<div align="center">

[![Version](https://img.shields.io/badge/version-0.1.0-blue)](https://github.com/edgardhsl/adb-device-explorer)
[![License](https://img.shields.io/badge/license-MIT-green)](https://github.com/edgardhsl/adb-device-explorer/blob/main/LICENSE)

<p align="center">
  <img src="./public/images/app.png" alt="ADB Device Explorer - Light and Dark Theme" />
</p>

**Browse and manage SQLite databases on Android devices via ADB**

[English](./README.md) · [Português](./README.pt-BR.md) · [Español](./README.es.md)

</div>

---

## Table of Contents

1. [About](#about)
2. [Features](#features)
3. [Requirements](#requirements)
4. [Installation](#installation)
5. [Usage](#usage)
6. [Tech Stack](#tech-stack)
7. [Contributing](#contributing)
8. [License](#license)
9. [FAQ](#faq)

---

## About

ADB Device Explorer is a desktop application that allows you to browse and manage SQLite databases from apps installed on connected Android devices via ADB (Android Debug Bridge).

With a simple interface, you can explore device apps, view databases, and perform CRUD operations on table data.

---

## Features

- **Device Browser**: List and select connected Android devices via ADB
- **App Explorer**: View user-installed apps on the device
- **Database Browser**: List SQLite databases within each app
- **Table Viewer**: Browse table data with pagination, sorting, and filtering
- **Cell Editing**: Edit cell values directly by double-clicking
- **Add/Delete Rows**: Insert and remove records from tables
- **Auto-sync**: Changes are automatically pushed back to the device
- **Dark/Light Theme**: Supports system theme and manual toggle
- **Multi-language**: Portuguese, English, and Spanish

---

## Requirements

### Software
- [ADB](https://developer.android.com/studio/command-line/adb) (Android SDK Platform Tools)
- Windows 10/11 (other platforms not tested)

### Android Device
- Android 5.0+ (Lollipop)
- USB debugging enabled in Developer Options

### Setup Android Device
1. Go to **Settings > About Phone**
2. Tap **Build Number** 7 times to enable Developer Options
3. Go to **Settings > Developer Options**
4. Enable **USB Debugging**
5. Connect device via USB
6. Accept the authorization prompt on your device

---

## Installation

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
npm run tauri build
```

The built executable will be in `src-tauri/target/release/`

---

## Usage

1. Connect your Android device via USB
2. Ensure USB debugging is enabled
3. Select your device from the sidebar
4. Expand the device to see installed apps
5. Select an app to view its databases
6. Click on a database, then select a table
7. Double-click a cell to edit, press Enter to save

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, Tailwind CSS |
| Desktop | Tauri 2 |
| Backend | Rust |
| Database | rusqlite |
| Communication | ADB |

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting PRs.

---

## License

MIT License - see [LICENSE](LICENSE) file.

---

## FAQ

### Can't see my device?
Make sure:
- USB debugging is enabled
- Device is authorized (check for prompt on device)
- Run `adb devices` to verify connection

### Database won't open?
Some apps may have corrupted databases or restricted access. Try closing the app on your device first.

### Can I edit any table?
Only tables with a primary key can be edited. The app uses the primary key to identify rows.

### Are changes saved to the device?
Yes! After INSERT, UPDATE, or DELETE, the modified database is automatically pushed back to the device.

---

<div align="center">

**Made with ❤️ by [EdgarHS](https://github.com/edgardhsl)**

</div>