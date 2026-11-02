#!/usr/bin/env node
// Whitelist only inline scripts emitted by the trusted static Next.js build.
// This avoids using script-src 'unsafe-inline' in the packaged WebView.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'out');
const configPath = path.join(root, 'src-tauri', 'tauri.conf.json');
const check = process.argv.includes('--check');

function htmlFiles(dir) {
  if (!fs.existsSync(dir)) throw new Error('Next.js static output missing: ' + dir);
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? htmlFiles(full) : entry.name.endsWith('.html') ? [full] : [];
  });
}

const files = htmlFiles(dist);
if (files.length === 0) throw new Error('No Next.js HTML files generated');
const hashes = new Set();
for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (/\bsrc\s*=/.test(match[1])) continue;
    if (!match[2].trim()) continue;
    const digest = crypto.createHash('sha256').update(match[2], 'utf8').digest('base64');
    hashes.add("'sha256-" + digest + "'");
  }
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const original = config.app.security.csp;
if (typeof original !== 'string' || !/script-src\s+[^;]+/.test(original)) {
  throw new Error('Expected a strict Tauri script-src directive');
}
const directive = "script-src 'self'" + (hashes.size ? " " + [...hashes].sort().join(' ') : '');
const updated = original.replace(/script-src\s+[^;]+/, directive);
if (/script-src[^;]*'unsafe-inline'/.test(updated)) {
  throw new Error('unsafe-inline scripts are not allowed in release CSP');
}
if (check) {
  if (updated !== original) {
    throw new Error('Inline-script hashes are missing or stale in the release CSP');
  }
  console.log('Validated ' + hashes.size + ' CSP hashes across ' + files.length + ' HTML files');
} else {
  config.app.security.csp = updated;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  console.log('Updated Tauri CSP: ' + hashes.size + ' trusted inline-script hashes');
}
