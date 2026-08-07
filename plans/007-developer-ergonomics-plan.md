# 007 — Improve Developer Ergonomics — Setup, Build, Test, Lint, and CI Plan

> Standard: ASD-STE100 Simplified Technical English, Issue 8
> Reference: `AGENTS.md`, `package.json`, `vite.config.js`, `Gruntfile.coffee`, `docs/NVM.md`, `docs/THEME_TEST.md`, `spec/runner.html`, `plans/005-vite-build-plan.md`, `plans/006-shopify-cli-theme-test-plan.md`
> Status: Draft — execution follows this plan step-by-step
> Risk level: Low — no public API change, build and test only

## 1. Objective

Improve developer ergonomics so a new contributor can set up, build, test, lint, and push on Node `24.19.0` without manual workarounds. Keep the public CartJS API frozen.

## 2. Context

The project now builds with Vite (`vite@6.4.3`) on Node `24.19.0` (`.nvmrc`). Shopify CLI (`@shopify/cli@4.6.1`) requires `>=22.12.0` and fails on the system Node `20.17.0` with `enableCompileCache`. The test command (`vitest run`) finds zero files and still exits `0`. Grunt (`Gruntfile.coffee`, 9 `grunt-*` plugins, `bower.json`) remains alongside Vite. No linter, formatter, or CI workflow exists. `.travis.yml` still targets Node `0.10`. `README.md` and `CONTRIBUTING.md` are upstream v1.1.0. This plan fixes setup, build, test, lint, and CI without changing `CartJS.*` or `dist` filenames.

## 3. Scope

### 3.1 In scope

- Enforce Node version and fix ESM warning.
- Make `npm test` real (Vitest finds and runs `spec` tests).
- Clarify build truth (Vite vs Grunt) and remove empty chunk workaround.
- Add lint, format, and pre-commit guard.
- Add GitHub Actions CI on Node `24.19.0`.
- Update `README.md` and `CONTRIBUTING.md` to match current tooling.
- Trim unused dependencies and derived file handling.
- Document `NPM_CONFIG_CACHE` status.

### 3.2 Out of scope

- Do not change `CartJS.*` public API or `data-cart-*` contract.
- Do not change `src/*.js` logic or `dist` banner/IIFE/filenames.
- Do not migrate `docs/theme` (Terraform/Jade) in this plan.
- Do not publish to npm or Theme Store.

## 4. Inputs

- `package.json` (scripts `build`/`test`/`theme:*`, dev deps `grunt*`, `vite`, `vitest`, `@shopify/cli`, `jquery`, `rivets`, `sightglass`)
- `vite.config.js` (manual concat + `esbuild` minify, dummy chunk)
- `Gruntfile.coffee` + `bower.json` + `.travis.yml`
- `spec/runner.html` + `spec/cartjs/*.js` + `spec/shopify/*.js`
- `.nvmrc` (`24.19.0`), `.tool-versions`, `docs/NVM.md`, `docs/THEME_TEST.md`
- `AGENTS.md` §2, §3, §4.2 (STE100)
- Audit 2026-08-07 (ergonomics baseline)

## 5. Findings (evidence)

### 5.1 Node version is not enforced

- `package.json` has no `engines` or `engineStrict`. `node -v` on this machine is `20.17.0`; `.nvmrc` is `24.19.0`. `npm install` shows 10 `EBADENGINE` warnings and `npx shopify --version` throws `SyntaxError: enableCompileCache`.
- `vite.config.js` uses `import` but `package.json` has no `"type": "module"`, so Node warns `To load an ES module, set "type": "module"`.
- `NPM_CONFIG_CACHE=/tmp/npm-cache-adhoc` workaround was for the ancient lockfile; current `lockfileVersion` is `3` and the warning may no longer apply.

### 5.2 Tests are fake-green

- `package.json:test` is `vitest run` with default `include **/*.{test,spec}.?(c|m)[jt]s?(x)`. Specs are `spec/cartjs/formatters.js` etc. using Mocha globals. Vitest finds 0 files, logs `No test files found`, exits `0`.
- `grunt test` via `mocha_phantomjs` is broken on `mocha@11.8`. No CI runs tests.

### 5.3 Two builds confuse contributors

- Both `Gruntfile.coffee` (with `concat`, `uglify`, `terraform`, `less`) and `vite.config.js` (concat shim) exist. `package.json` exposes `build` (Vite) and `build:grunt`. The Vite build runs minify three times during `vitest` (see logs: triple `Built dist/cart.js`).
- `vite.config.js` emits an empty `dist/dummy.js` and deletes it in `closeBundle`. This is a workaround for `build.lib` with no entry.

### 5.4 No quality gates

- No `eslint`, `prettier`, `biome`, `oxlint`, `editorconfig`, `husky`, or `lint-staged`. No `typecheck`. No format script.

### 5.5 CI and docs are stale

- `.travis.yml` targets Node `0.10` and global `grunt-cli`. No `.github/workflows`. `README.md` and `CONTRIBUTING.md` still mention `bower`, `develop` branch, and `git clone .../cartjs.git`.

### 5.6 Dependencies are heavy

- `devDependencies` still contain `jquery@4.0.0`, `rivets@0.9.6`, `sightglass@0.2.6`, both `jsdom` and `happy-dom`, and 9 `grunt-*` plugins (`~50 MB`). `dependencies` contains `meptos@2.0.0` (should be dev, not shipped). `overrides` for `terraform`, `glob` etc. are Grunt-only.
- `dist/*.js` and `cartjs.zip` are committed; `theme-test/assets/*.js` are derived copies of `dist` but are untracked (`.gitkeep` only).

## 6. Procedure

Do the steps in order. One action per step. Verify after each step. Keep API frozen.

1. Enforce Node:
   - Add `"engines": {"node": ">=22.12.0"}` and `"engineStrict": true` to `package.json` (or `>=24.19.0` if Mepto policy is strict).
   - Add `.node-version` (mirror `.nvmrc`) for modern managers.
   - Rename `vite.config.js` to `vite.config.mjs` **or** add `"type": "module"` to `package.json` to remove the ESM warning. Prefer `mjs` to keep `scripts/*.js` as CJS (`sync-theme-assets.js` uses `require`).
   - Verify: `node -v` on `20.17.0` now shows `EBADENGINE` + `engineStrict` error on `npm install`; on `24.19.0` it passes. `npm run build` shows no ESM warning.

2. Verify cache workaround:
   - Run `NPM_CONFIG_CACHE=/tmp/npm-cache-adhoc npm install` vs plain `npm install` on Node `24.19.0`. If plain install succeeds with no `EPERM` / lockfile error, remove the workaround from `docs/NVM.md` and `docs/THEME_TEST.md` and add `.npmrc` with `engine-strict=true` if needed. If it still fails, keep `.npmrc` with `cache=/tmp/npm-cache-adhoc` or document `NPM_CONFIG_CACHE` in `package.json` scripts via `cross-env`.

3. Make `npm test` real:
   - Add `vitest.config.mjs` (or `vitest.config.js`) with `test: { include: ['spec/**/*.js'], environment: 'happy-dom', globals: true, setupFiles: ['spec/setup.js'] }`.
   - Create `spec/setup.js` to expose `should` and load `dist/cart.js` + test helpers (migrate from `spec/runner.html`).
   - Update `package.json:test` to `vitest run --passWithNoTests=false` so zero files fails.
   - Verify: `npm test` finds `spec/cartjs/*.js` and passes (or shows real failures, not `No test files found`). Keep `test:grunt` as fallback for one release.

4. Clarify build truth:
   - Document in `AGENTS.md` §2 and `README.md` that `vite` is the source of truth; `grunt` is deprecated.
   - Add `Gruntfile.coffee` header comment `// DEPRECATED — use npm run build (Vite)`.
   - Fix dummy chunk: in `vite.config.mjs` set `build.lib` with a real entry (e.g. `src/entry.js` that re-exports) **or** keep current `closeBundle` concat but set `build.rollupOptions.input` to a virtual module so no `dummy.js` is emitted. Remove manual `unlinkSync` after verification.
   - Verify: `npm run build` produces only `dist/cart.js`, `rivets-cart.js`, `*.min.js` (no `dummy.js`), and `npx vitest run` does not trigger three builds.

5. Add lint, format, and pre-commit:
   - Add `editorconfig` (`.editorconfig` with `end_of_line = lf`, `indent_style = space`, `indent_size = 2`).
   - Add `prettier` (`prettier@latest`, config `.prettierrc` `semi: true`, `singleQuote: true`) and `eslint` (`eslint@latest` flat config, `eslint:recommended` + `globals: browser, node`).
   - Add `package.json` scripts: `"lint": "eslint .", "lint:fix": "eslint . --fix", "format": "prettier --check .", "format:fix": "prettier --write ."`.
   - Add `husky` + `lint-staged` (optional, low weight): `husky init`, `lint-staged` runs `eslint` and `prettier` on staged `*.js`.
   - Verify: `npm run lint` and `npm run format` pass on current `src/*.js` (fix via `lint:fix`/`format:fix` if needed).

6. Add CI:
   - Add `.github/workflows/ci.yml` with `on: [push, pull_request]`, `node: [24.19.0]`, steps `actions/checkout`, `actions/setup-node`, `npm ci`, `npm run build`, `npm run lint || true` (until lint is clean), `npm test`, `npm run theme:check` (allow failure on Node mismatch or skip when `theme-test` absent).
   - Verify: workflow appears in GitHub Actions and passes on `master`.

7. Update docs:
   - Rewrite `README.md` quickstart (remove `bower`, `develop`, `0.10`; add `Node 24.19.0`, `scripts/use-nvmrc.sh`, `npm ci`, `npm run build`, `npm test`, `npm run theme:check`).
   - Update `CONTRIBUTING.md` (fix `git clone git@github.com:oreoorbitz/cartjs.git`, branch `master`, add lint/test/build steps).
   - Update `docs/NVM.md` with `engines` and `engineStrict` note.
   - Verify: `README.md` copy-paste installs and builds on a fresh clone.

8. Trim dependencies (after build/test are stable):
   - Move `meptos` to `devDependencies` if not shipped to themes (it is only used by `mepto-adapter.js` fallback).
   - Remove `rivets`, `sightglass`, `jquery` from `devDependencies` if `tinybind`/`meptos` fully replace them (check `spec` and `src` for remaining imports; keep for one release if unsure).
   - Keep `happy-dom` **or** `jsdom`, not both (Vitest needs one).
   - Remove Grunt `overrides` (`terraform`, `glob`, `minimatch`, `inflight`, `adm-zip`, `diff`, `serialize-javascript`) after `Gruntfile.coffee` is deprecated (or keep one release).
   - Verify: `npm install` warns zero `EBADENGINE` on Node `24.19.0`, `npm audit` shows fewer Grunt vulns.

9. Handle derived files:
   - Decide: either keep `dist/` committed (for CDN) **or** `.gitignore` it and build in CI. Document choice in `AGENTS.md`.
   - For `theme-test/assets/*.js`, either add `theme-test/assets/*.js` to `.gitignore` (keep `.gitkeep`) or commit the sync output (not recommended — it duplicates `dist`). Prefer ignore.
   - Verify: `git status` is clean after `npm run build && npm run theme:assets`.

10. Final verification:
    - Run `npm run lint && npm run format && npm run build && npm test && npm run theme:check` on Node `24.19.0` (use `scripts/use-nvmrc.sh`).
    - Record results in the commit message.

## 7. Constraints (vital — API must remain same)

- **Public CartJS API frozen:** `CartJS.*`, `data-cart-*`, `window.CartJS`, `window.tinybind`, `window.mepto` — no change.
- **Filenames frozen:** `dist/cart.js`, `dist/rivets-cart.js`, `dist/*.min.js` stay at same paths with same banner and IIFE.
- **Node `24.19.0` stays in `.nvmrc`:** Shopify CLI `>=22.12.0` and Mepto `24.x` remain satisfied.
- **Incremental:** Keep `npm run build` green after each step; do not delete `Gruntfile.coffee` until CI and tests pass on Vite alone.
- **Weights:** Prefer light tools (`eslint` + `prettier` + `husky` total <5 MB) over heavy formatters if install becomes too slow.
- Follow STE100 for new MD files (≤20 words/sentence, active voice, vertical lists).

## 8. Risks

- **ESM rename breaks scripts:** Renaming to `vite.config.mjs` is safe, but adding `"type": "module"` makes `scripts/*.js` (CJS `require`) fail. Mitigation: use `mjs` for Vite/Vitest configs, keep scripts as CJS or rename them to `cjs`.
- **Vitest include breaks existing specs:** `spec` uses Mocha globals; moving to Vitest may need `setupFiles` shims for `should`. Mitigation: keep `spec/runner.html` for one release and run both `vitest` and `grunt test` in CI until migrated.
- **Lint on legacy code fails:** `src/*.js` still has decaffeinate comments; `eslint` may error. Mitigation: run `lint:fix` first and allow `warn` on `DS*` comments via ignore.
- **CI `theme:check` on Node 20 fails:** `shopify` crashes on `20.17.0`. Mitigation: CI uses `24.19.0` only; make `theme:check` optional (`continue-on-error`) until Node 24 is default.
- **Dependency removal breaks build:** `jquery`/`rivets` may still be imported in some `spec`. Mitigation: `grep` imports before removal; remove in a separate commit.

## 9. Acceptance criteria

- [ ] `package.json` has `engines` and `engineStrict`; `vite.config.mjs` (or `type: module`) removes ESM warning.
- [ ] `vitest.config.*` exists; `npm test` finds `spec/**/*.js` and does not log `No test files found`; `passWithNoTests=false` fails on zero files.
- [ ] `Gruntfile.coffee` is marked deprecated; `vite` is documented as source of truth; no `dist/dummy.js` is emitted.
- [ ] `.editorconfig`, `eslint`, `prettier`, `husky`/`lint-staged` (if added) exist; `npm run lint` and `npm run format` pass.
- [ ] `.github/workflows/ci.yml` exists and runs `build`, `lint`, `test` on Node `24.19.0`.
- [ ] `README.md` and `CONTRIBUTING.md` reflect Node `24.19.0`, `vite`, and `theme:check` (no `bower`/`0.10`/`develop`).
- [ ] `NPM_CONFIG_CACHE` workaround is either encoded in `.npmrc` or documented as removed after verification.
- [ ] `npm install` on Node `24.19.0` shows no `EBADENGINE`; `npm audit` shows fewer Grunt vulns after trim (or documented as next step).
- [ ] `git status` is clean after `npm run build && npm run theme:assets` (derived files ignored or committed by choice).
- [ ] This file `plans/007-developer-ergonomics-plan.md` references the audit, `AGENTS.md`, and `https://shopify.dev/docs/api/shopify-cli`.

## 10. Output

This plan file `plans/007-developer-ergonomics-plan.md`. Execution produces: `package.json` + lockfile (engines, lint deps), `vite.config.mjs`, `vitest.config.mjs`, `spec/setup.js`, `.editorconfig`, `.prettierrc`, `eslint.config.*`, `.husky/*`, `.github/workflows/ci.yml`, updated `README.md`/`CONTRIBUTING.md`/`docs/NVM.md`/`AGENTS.md`, updated `.gitignore`/`.npmrc`, and commits that cite this plan.

## 11. STE100 checklist

- [ ] Each sentence ≤ 20 words.
- [ ] Each paragraph ≤ 6 sentences.
- [ ] One topic per sentence.
- [ ] Active voice only.
- [ ] Approved words only.
- [ ] Vertical lists for procedures.

## 12. References

- Audit: 2026-08-07 ergonomics audit (this plan §5, Node `20.17.0` vs `24.19.0`, Vite dummy chunk, fake-green tests)
- Build: `vite.config.js`, `Gruntfile.coffee`, `bower.json`, `package.json`
- Test: `spec/runner.html`, `spec/cartjs/*.js`, `vitest@4.1.10`, `happy-dom@20.11.2`
- Docs: `README.md`, `CONTRIBUTING.md`, `docs/NVM.md`, `docs/THEME_TEST.md`
- Tool: `https://shopify.dev/docs/api/shopify-cli` (`@shopify/cli@4.6.1`)
- Context: `AGENTS.md` §2–§6, `.nvmrc`, `.tool-versions`, `scripts/use-nvmrc.sh`
