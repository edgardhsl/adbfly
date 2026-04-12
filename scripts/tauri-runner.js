const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

function parseIni(content) {
  const result = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith(";")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (key) result[key] = value;
  }
  return result;
}

function findConfigFile() {
  const candidates = [];

  if (process.env.ADBFLY_CONFIG_PATH) {
    candidates.push(process.env.ADBFLY_CONFIG_PATH);
  }

  if (process.env.APPDATA) {
    candidates.push(path.join(process.env.APPDATA, "com.adbfly.app", "adbfly.ini"));
  }

  candidates.push(path.join(process.cwd(), "adbfly.ini"));

  return candidates.find((file) => fs.existsSync(file));
}

function loadOpenSslFromIni() {
  const configFile = findConfigFile();
  if (!configFile) return { configFile: null, values: {} };

  const content = fs.readFileSync(configFile, "utf8");
  const values = parseIni(content);
  return { configFile, values };
}

function run() {
  const commandArgs = process.argv.slice(2);
  const tauriArgs = commandArgs.length > 0 ? commandArgs : ["dev"];

  const env = { ...process.env };
  const { configFile, values } = loadOpenSslFromIni();

  if (!env.OPENSSL_DIR && values.openssl_dir) env.OPENSSL_DIR = values.openssl_dir;
  if (!env.OPENSSL_LIB_DIR && values.openssl_lib_dir) env.OPENSSL_LIB_DIR = values.openssl_lib_dir;
  if (!env.OPENSSL_INCLUDE_DIR && values.openssl_include_dir) env.OPENSSL_INCLUDE_DIR = values.openssl_include_dir;

  if (configFile) {
    console.log(`Loaded OpenSSL config from: ${configFile}`);
  }
  console.log("Starting Tauri with SQLCipher (Rust OpenSSL vendored path).");
  console.log("Note: first build requires C toolchain, perl and make.");

  const fullArgs = ["tauri", ...tauriArgs, "--features", "sqlcipher"];

  let child;
  if (process.platform === "win32") {
    const quote = (value) => `"${String(value).replace(/"/g, '\\"')}"`;
    const command = ["npx", ...fullArgs].map(quote).join(" ");
    child = spawn("cmd.exe", ["/d", "/s", "/c", command], {
      stdio: "inherit",
      env,
      cwd: process.cwd(),
      windowsVerbatimArguments: true,
    });
  } else {
    child = spawn("npx", fullArgs, {
      stdio: "inherit",
      env,
      cwd: process.cwd(),
    });
  }

  child.on("exit", (code) => process.exit(code ?? 1));
}

run();
