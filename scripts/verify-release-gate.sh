#!/usr/bin/env bash
set -euo pipefail

git fetch origin main --no-tags
target_sha="$(git rev-parse HEAD)"
main_sha="$(git rev-parse refs/remotes/origin/main)"
if ! git merge-base --is-ancestor "$target_sha" "$main_sha"; then
  echo "::error::Release commit must belong to the main branch."
  exit 1
fi

if [[ ! -s src-tauri/Cargo.lock ]]; then
  echo "::error::Commit src-tauri/Cargo.lock before producing release artifacts."
  exit 1
fi

# Require independent frontend and Rust verification on the *tagged* SHA.
check_runs="$(gh api "repos/$GITHUB_REPOSITORY/commits/$target_sha/check-runs?per_page=100" --paginate --jq '.check_runs[] | .name + ":" + (.conclusion // "pending")')"
for required in frontend rust; do
  if ! grep -Fxq "${required}:success" <<< "$check_runs"; then
    echo "::error::Missing successful ${required} check for $target_sha"
    exit 1
  fi
done
echo "Verified release commit $target_sha with frontend and rust checks."
