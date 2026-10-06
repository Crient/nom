#!/bin/bash
set -e

MESSAGE="$1"
DRY_RUN=false
if [ "$MESSAGE" = "--dry-run" ]; then DRY_RUN=true; fi
GIT_ADD=(git add)
if $DRY_RUN; then GIT_ADD+=(--dry-run --verbose); fi

if [ -z "$MESSAGE" ]; then
  echo "Usage: npm run ship -- \"Commit message\" | --dry-run"
  exit 1
fi

BRANCH=$(git branch --show-current)

if [ "$BRANCH" != "main" ]; then
  echo "❌ Refusing to ship from branch: $BRANCH"
  echo "Switch to main first."
  exit 1
fi

# These account artifacts must accompany the app. Check before staging anything.
for REQUIRED in supabase/migrations/202610060001_nom_accounts.sql supabase/tests/accounts_rls.sql; do
  if [ ! -f "$REQUIRED" ]; then
    echo "Missing required account artifact: $REQUIRED" >&2
    exit 1
  fi
done

# Even git add --dry-run requests an index lock. Use a disposable index copy so
# preview works with read-only repository metadata and never touches its index.
if $DRY_RUN; then
  SHIP_PREVIEW_INDEX=$(mktemp "${TMPDIR:-/tmp}/nom-ship-index.XXXXXX")
  trap 'rm -f "$SHIP_PREVIEW_INDEX" "$SHIP_PREVIEW_INDEX.lock"' EXIT
  SHIP_CURRENT_INDEX=$(git rev-parse --git-path index)
  if [ -f "$SHIP_CURRENT_INDEX" ]; then
    cp "$SHIP_CURRENT_INDEX" "$SHIP_PREVIEW_INDEX"
  else
    rm -f "$SHIP_PREVIEW_INDEX"
  fi
  export GIT_INDEX_FILE="$SHIP_PREVIEW_INDEX"
fi

echo "📦 Staging tracked changes..."
"${GIT_ADD[@]}" -u

echo "➕ Staging intentional new app files..."

# App/source files
"${GIT_ADD[@]}" src api server shared public scripts 2>/dev/null || true

# Project configuration
"${GIT_ADD[@]}" \
  package.json \
  package-lock.json \
  vite.config.js \
  vercel.json \
  index.html \
  .gitignore \
  .env.example 2>/dev/null || true

# Only SQL artifacts belong in this package; local Supabase config, credentials,
# CLI state, and development files are deliberately outside these path lists.
shopt -s nullglob
ACCOUNT_SQL=(supabase/migrations/*.sql supabase/tests/*.sql)
"${GIT_ADD[@]}" -- "${ACCOUNT_SQL[@]}"

# Keep only final validation reports from generated audit folders.
while IFS= read -r -d '' REPORT; do
  "${GIT_ADD[@]}" -- "$REPORT"
done < <(find docs -type f -name "report.md" -print0 2>/dev/null)

if $DRY_RUN; then
  echo "Dry run complete. The index and HEAD are unchanged; no commit, push, or deployment was performed."
  exit 0
fi

echo
echo "✅ Files staged:"
git diff --cached --stat

if git diff --cached --quiet; then
  echo "Nothing to commit."
  exit 0
fi

echo
echo "💾 Committing..."
git commit -m "$MESSAGE"

echo
echo "🚀 Pushing to origin/main..."
git push origin main

echo
echo "✅ Shipped. Vercel should deploy automatically."
