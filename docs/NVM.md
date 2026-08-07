# Node Version Management

## Purpose of `.nvmrc`

The file `.nvmrc` defines the Node.js version for this project. This project uses Node.js `24.19.0` (Active LTS, codename Krypton). The file ensures that every contributor and every CI environment uses the same Node.js version.

Content of `.nvmrc`:
```
24.19.0
```

Related config: `.tool-versions` (asdf) also pins `nodejs 24.19.0` and `python 3.9.6`, `.node-version` mirrors `.nvmrc` for `fnm`/`volta`, and `package.json` `engines: >=22.12.0` with `engineStrict` enforces it on `npm install`.

Build source of truth is `vite.config.mjs` (`npm run build`); `Gruntfile.coffee` is deprecated. Tests run via `vitest` (`npm test`, 28 tests, `vitest.config.mjs`); lint via `npm run lint` (`eslint`) and `npm run format` (`prettier --check`). CI runs on `24.19.0` via `.github/workflows/ci.yml`.

Plain `npm install` now works (lockfile is v3); the old `NPM_CONFIG_CACHE=/tmp/npm-cache-adhoc` workaround is no longer needed (kept in `docs/THEME_TEST.md` for reference).

## Why this matters

- Avoid `Unsupported engine` warnings seen during `npm install`.
- Ensure `grunt`, `vitest`, `jsdom`, and native bindings compile consistently.
- Align with Node.js LTS schedule (v24 Active LTS until 2028-04-30, v22 Maintenance until 2027-04-30).

## Automatic update script

Use this Bash script to install and activate the Node.js version defined in `.nvmrc`. It works with `nvm` (Node Version Manager) and falls back to `asdf` and `fnm`.

The script lives at `scripts/use-nvmrc.sh`. Make it executable:

```bash
chmod +x scripts/use-nvmrc.sh
./scripts/use-nvmrc.sh
```

Or run the one-liners below.

### Script: `scripts/use-nvmrc.sh`

```bash
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
```

### Quick one-liners

If you have `nvm` installed:

```bash
# Install and use version from .nvmrc
nvm install
nvm use
node --version   # should print v24.19.0
```

If you use `asdf`:

```bash
asdf install
node --version
```

### CI example (GitHub Actions)

```yaml
- uses: actions/setup-node@v4
  with:
    node-version-file: '.nvmrc'
    cache: 'npm'
```

## References

- Prompt that directed this file: `prompts/002-update-node.md`
- Node.js releases: https://nodejs.org/en/about/previous-releases
- nvm: https://github.com/nvm-sh/nvm
- asdf: https://asdf-vm.com/
