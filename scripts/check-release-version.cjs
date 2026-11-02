const fs = require("node:fs");

const tag = process.env.RELEASE_TAG;
if (!/^v\d+\.\d+\.\d+$/.test(tag || "")) {
  console.error("RELEASE_TAG must be a semantic version tag, for example v0.1.1");
  process.exit(1);
}

const packageVersion = require("../package.json").version;
const tauriVersion = require("../src-tauri/tauri.conf.json").version;
const cargo = fs.readFileSync("src-tauri/Cargo.toml", "utf8");
const packageSection = cargo.split("[package]")[1]?.split(/\n\[/)[0];
const cargoVersion = packageSection?.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
const expectedVersion = tag.slice(1);

if (![packageVersion, tauriVersion, cargoVersion].every((version) => version === expectedVersion)) {
  console.error("Release version mismatch:", {
    tag,
    packageVersion,
    tauriVersion,
    cargoVersion,
  });
  process.exit(1);
}
console.log("Release versions match:", tag);
