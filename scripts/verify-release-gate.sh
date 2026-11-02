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

# A random check named "frontend" is not proof that our trusted workflow ran.
# Require the same successful GitHub Actions run to verify both checks on
# the exact tagged SHA. The workflow must originate from a push to main.
runs="$(gh api "repos/$GITHUB_REPOSITORY/actions/runs?head_sha=$target_sha&per_page=100"   --jq '.workflow_runs[] | select(.head_sha == "'"$target_sha"'" and .path == ".github/workflows/code-quality.yml" and .event == "push" and .head_branch == "main" and .conclusion == "success") | .id')"
verified=false
for run in $runs; do
  jobs="$(gh api "repos/$GITHUB_REPOSITORY/actions/runs/$run/jobs?per_page=100"     --jq '.jobs[] | select(.conclusion == "success") | .name')"
  if grep -Fxq frontend <<< "$jobs" && grep -Fxq rust <<< "$jobs"; then
    verified=true
    break
  fi
done
if [[ "$verified" != true ]]; then
  echo "::error::No trusted successful Code quality workflow with frontend+rust jobs on $target_sha."
  exit 1
fi
echo "Verified release commit $target_sha with trusted CI run $run."
