#!/usr/bin/env bash
# scripts/use-nvmrc.sh — Install and use Node.js version from .nvmrc
# Reference: prompts/002-update-node.md
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NVMRC_FILE="$PROJECT_DIR/.nvmrc"

if [[ ! -f "$NVMRC_FILE" ]]; then
  echo "ERROR: .nvmrc not found at $NVMRC_FILE" >&2
  exit 1
fi

WANTED="$(tr -d '[:space:]' < "$NVMRC_FILE")"
echo "Wanted Node.js version: $WANTED (from .nvmrc)"

# Prefer nvm if available
if command -v nvm >/dev/null 2>&1 || [[ -s "$HOME/.nvm/nvm.sh" ]]; then
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  # shellcheck disable=SC1090
  [[ -s "$NVM_DIR/nvm.sh" ]] && \. "$NVM_DIR/nvm.sh"

  echo "Using nvm..."
  nvm install "$WANTED"
  nvm use "$WANTED"
  nvm alias default "$WANTED"
  echo "Done. Node version: $(node --version)"
  exit 0
fi

# Fallback to asdf
if command -v asdf >/dev/null 2>&1; then
  echo "Using asdf..."
  asdf install nodejs "$WANTED"
  asdf local nodejs "$WANTED"
  asdf reshim nodejs
  echo "Done. Node version: $(node --version)"
  exit 0
fi

# Fallback to fnm
if command -v fnm >/dev/null 2>&1; then
  echo "Using fnm..."
  fnm install "$WANTED"
  fnm use "$WANTED"
  echo "Done. Node version: $(node --version)"
  exit 0
fi

echo "ERROR: No version manager found (nvm, asdf, fnm). Install nvm from https://github.com/nvm-sh/nvm" >&2
exit 1
