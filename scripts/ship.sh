#!/bin/bash
set -e

MESSAGE="$1"

if [ -z "$MESSAGE" ]; then
  echo "Usage: npm run ship -- \"Commit message\""
  exit 1
fi

BRANCH=$(git branch --show-current)

if [ "$BRANCH" != "main" ]; then
  echo "❌ Refusing to ship from branch: $BRANCH"
  echo "Switch to main first."
  exit 1
fi

echo "📦 Staging tracked changes..."
git add -u

echo "➕ Staging intentional new app files..."

# App/source files
git add src api server shared public scripts 2>/dev/null || true

# Project configuration
git add \
  package.json \
  package-lock.json \
  vite.config.js \
  vercel.json \
  index.html \
  .gitignore \
  .env.example 2>/dev/null || true

# Keep only final validation reports from generated audit folders.
find docs -type f -name "report.md" -print0 2>/dev/null | xargs -0 -r git add

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
