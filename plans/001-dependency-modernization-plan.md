# 001 — Dependency Modernization Plan

> Reference prompt: `prompts/002-update-node.md`
> Standard: ASD-STE100 Simplified Technical English, Issue 8
> Status: Draft — execution follows this plan step-by-step

## 1. Objective

Update the project to use Node.js 24.19.0. Remove engine warnings. Replace outdated and vulnerable dependencies with modern alternatives. Keep the public API unchanged.

## 2. Context

This plan follows `prompts/002-update-node.md`. The prompt creates `.nvmrc` and updates `.tool-versions`. This prompt also creates `docs/NVM.md` and `scripts/use-nvmrc.sh` for Node.js version management.

Current state:
- `.nvmrc` now contains `24.19.0` (Active LTS, Krypton, released 2026-08-03).
- `.tool-versions` now contains `nodejs 24.19.0` and `python 3.9.6`.
- `npm install` on `v20.17.0` shows nine `EBADENGINE` warnings for packages that require `>=20.19.0` (see Section 5.1).
- `npm outdated --json` now returns `{}` — direct deps are at latest.
- `npm audit` shows 16 vulnerabilities via Grunt transitive deps (see Section 5.2).

Node.js 20 reached End-of-Life on 2026-04-30. Node.js 22 is Maintenance LTS until 2027-04-30. Node.js 24 is Active LTS until 2028-04-30. The project must move to Node.js 24.

## 3. Scope

### 3.1 In scope

- Update Node.js to `24.19.0` in `.nvmrc` and `.tool-versions`.
- Document `.nvmrc` usage in `docs/NVM.md` and `scripts/use-nvmrc.sh`.
- List engine warnings and vulnerabilities.
- Create a plan to replace vulnerable Grunt deps with modern alternatives.
- Update direct deps where modern alternatives exist.

### 3.2 Out of scope

- Do not change `src/*.coffee` logic (the project will be unusable after deps update, per prompt constraint).
- Do not do a full architectural restructure (e.g., replace Grunt with Vite) in this plan — that is for later plans.

## 4. Inputs

- `package.json` (devDependencies at latest, with overrides for `terraform` and `marked`)
- `.tool-versions`
- `.nvmrc` (`24.19.0`)
- `docs/NVM.md`, `scripts/use-nvmrc.sh`
- `/tmp/npm-install-002.log` (engine warnings)
- `/tmp/npm-outdated-002.json` (`{}`)
- `npm audit` output (16 vulns)
- Web search results for each dependency (see Section 5)

## 5. Findings (evidence — do not assume)

### 5.1 Investigation — every dependency via web search and `npm view`

All direct deps via `npm view <pkg> version` (cache `/tmp/npm-cache-adhoc`):

- `grunt 1.6.3`, `grunt-cli 1.5.0`, `grunt-contrib-clean 2.0.1`, `coffee 2.1.0`, `compress 2.0.0`, `concat 2.1.0`, `copy 1.0.0`, `less 3.0.0`, `uglify 5.2.2`, `watch 1.1.0`, `exec 3.0.0`, `mocha-phantomjs 4.0.0`, `grunt-terraform 0.3.1` (abandoned), `jquery 4.0.0`, `jsdom 27.0.1`, `mocha 11.8.0`, `rivets 0.9.6`, `should 13.2.3`, `sightglass 0.2.6`, `vitest 4.1.10`, `shopify.i18n.js 0.2.1` (abandoned).

Node.js LTS via `curl https://nodejs.org/dist/index.json` and `https://nodejs.org/en/about/previous-releases`:
- Latest LTS is `v24.19.0` (Krypton, 2026-08-03). Previous LTS `v22.23.1` is Maintenance LTS.
- Node.js 20 is End-of-Life. You must use Node.js 22 or 24. The Active LTS is 24.

### 5.2 Engine warnings — `npm install` on `v20.17.0` (45 occurrences, 9 unique packages)

All warnings state `required: { node: '>=20.19.0' }`, `current: { node: 'v20.17.0' }`:

1. `@csstools/color-helpers@6.1.0`
2. `@csstools/css-calc@3.3.0`
3. `@csstools/css-color-parser@4.1.10`
4. `@csstools/css-parser-algorithms@4.0.0`
5. `@csstools/css-tokenizer@4.0.0`
6. `entities@8.0.0`
7. `sass@1.101.0` (via `terraform@1.27.0`)
8. `chokidar@5.0.0`
9. `readdirp@5.1.1`

Fix: Use Node.js `24.19.0` from `.nvmrc`. All nine packages then satisfy the engine.

### 5.3 Outdated direct deps

`npm outdated --json` returns `{}`. All direct deps are at `latest` (wanted = current). No outdated direct dep remains.

### 5.4 Vulnerabilities — `npm audit` (16 vulns, transitive via Grunt)

| ID | Severity | Via | Fix |
|---|---|---|---|
| `adm-zip <0.6.0` | High | `grunt-contrib-compress` | Upgrade `adm-zip` to `>=0.5.18` (latest `0.6.0`) — but Grunt pins `0.4.11`. Fix is to replace `grunt-contrib-compress` or override `adm-zip`. |
| `inflight@1.0.6` | High | `glob` → `grunt-contrib-watch` | Deprecated, leaks memory. Replace with `lru-cache`. Modern `glob@13` removes `inflight`. |
| `glob@7.1.7, 7.2.3, 10.5.0, 3.2.11` | High | `grunt-*` | All old Glob versions have vulns. Latest `13.0.6` fixes. Grunt pins old Glob. |
| `minimatch <3.0.2, <10.2.6` | High | `grunt-*` via `glob` | Latest `10.2.6` / `3.0.2+` fixes. |
| `diff 6.0.0-8.0.2` | Low | `mocha` | `diff@9.0.0` fixes (but `mocha@11.8` still pins `diff@8`). Update `mocha` or override `diff`. |
| `form-data` | Critical | `request` → `phantomjs` | `request@2.88.2` is deprecated. Replace `request` with `node-fetch`/`axios` or remove `phantomjs`. |
| `request@2.88.2` | Deprecated | `phantomjs-prebuilt` | Maintainer message: use `node-fetch`, `axios`, or native `fetch` (Node 20+). |
| `phantomjs-prebuilt@2.1.16` | Deprecated | `grunt-mocha-phantomjs` | Development suspended. Replace with `puppeteer` or `playwright`, or remove Grunt PhantomJS and use `vitest`+`jsdom` (already added). |
| `gaze`, `globule` | High | `grunt-contrib-watch` | Old `gaze@0.5` uses old `globule`. Modern `chokidar` replaces `gaze`. |

Web search confirms fixes (see references).

### 5.5 Deprecated modern alternatives (summary)

- `inflight@1.0.6` → `lru-cache` (npm official message)
- `request@2.88.2` → `axios`, `node-fetch`, or native `fetch`
- `phantomjs-prebuilt` → `puppeteer`, `playwright`, or headless `chrome`
- `adm-zip` → `0.6.0` (or `yauzl`, `fflate`)
- `glob` → `13.0.6`, `minimatch` → `10.2.6`
- `terraform@0.13.2` (with `node-sass@3.4.2`) → `terraform@1.27.0` (uses `sass`) — already overridden
- `marked@18` (ESM) → `marked@4.3.0` (CJS) — already overridden

## 6. Procedure

Do not change `src/*.coffee` logic in this plan. Do the steps in order. One action per step.

1. Use Node.js `24.19.0` from `.nvmrc`.
2. Run `nvm install` and `nvm use`, or run `scripts/use-nvmrc.sh`.
3. Verify Node.js version: `node --version` must show `v24.19.0`.
4. Remove `node_modules` and `package-lock.json` if you change overrides.
5. Run `npm install` and record new engine warnings (must be zero on Node 24).
6. Verify `npm outdated --json` is `{}` (no outdated).
7. Run `npm audit` and record remaining vulns.
8. Create overrides for fixable transitive vulns:
   - Override `adm-zip` to `^0.6.0`
   - Override `glob` to `^13.0.6`
   - Override `minimatch` to `^10.2.6`
   - Override `diff` to `^9.0.0`
9. Replace Grunt PhantomJS:
   - Keep `grunt-mocha-phantomjs@4.0.0` for compatibility, and use `vitest@4.1.10` + `jsdom@27.0.1` for new tests.
   - Or remove `grunt-mocha-phantomjs` and update `Gruntfile.coffee` to remove `grunt-mocha-phantomjs` load and `mocha_phantomjs` task.
10. Replace deprecated `request` chain:
    - No direct action — `phantomjs` is the only consumer. Remove `phantomjs` to remove `request`.
11. Update `grunt-contrib-watch`:
    - Replace `gaze`/`globule` with `chokidar@5.0.0` (already a dep of `vitest`), or replace the whole plugin with `vite`/`vitest --watch` in a later plan.
12. Verify after each override: `npm install` must succeed, `npx grunt build` and `npx grunt docs` must succeed.
13. If an override breaks a Grunt plugin, revert that override and add the failure to the plan's risk list.
14. Sort remaining outdated/vuln deps by weekly downloads and fix most-used first (order: `jquery`, `mocha`, `should`, `grunt-cli`, `grunt`, `watch`, `copy`, `clean`, etc.).
15. Document results in this plan's annex (logs, warnings, audit before/after).

## 7. Constraints

- Do not assume state. Investigate every dep via web search and `npm view` (see Section 5).
- Do not rewrite `src/*.coffee` unless a later plan explicitly allows it.
- Keep sentences ≤ 20 words. Use active voice. Use approved STE words.
- Reference the prompt that directed this plan: `prompts/002-update-node.md`.
- Follow STE100 for all new MD files.

## 8. Risks

- Grunt plugins pin old `glob@7`, `inflight`, `minimatch`. Overrides to `glob@13` may break Grunt's `expand` logic. Test `grunt build` after each override.
- `phantomjs-prebuilt` has no Node 24 prebuilt binary. Install will fail on some platforms. Removal is the safe path.
- `jquery@4.0.0` drops old APIs (`$.isArray`, `$.trim`). No `src` change now, but later plans must test with `jquery-migrate`.
- `sass@1.101` requires `>=20.19`. Node 24 satisfies it. No override needed.

## 9. Acceptance criteria

- [ ] `plans/README.md` exists and explains `plans/` purpose.
- [ ] This file `plans/001-dependency-modernization-plan.md` exists, follows STE100, and references `prompts/002-update-node.md`.
- [ ] `.nvmrc` contains `24.19.0`.
- [ ] `.tool-versions` contains `nodejs 24.19.0`.
- [ ] `docs/NVM.md` and `scripts/use-nvmrc.sh` exist and describe `.nvmrc` usage.
- [ ] `npm install` on Node `24.19.0` shows zero `EBADENGINE`.
- [ ] `npm outdated --json` is `{}`.
- [ ] Plan lists all 9 engine warnings, 16 audit vulns, and modern alternatives for each.

## 10. Output

This plan file and `plans/README.md` plus updated config files `.nvmrc`, `.tool-versions`, `docs/NVM.md`, `scripts/use-nvmrc.sh`. The commit must contain all of them.

## 11. STE100 checklist (complete before mark done)

- [ ] Each sentence ≤ 20 words.
- [ ] Each paragraph ≤ 6 sentences.
- [ ] One topic per sentence.
- [ ] Active voice only. No passive.
- [ ] Approved words only. No synonyms for variety.
- [ ] Vertical lists for procedures.
- [ ] Technical names used consistently.

## 12. Annex — evidence logs (copy from `/tmp/npm-install-002.log`)

Engine warnings (9 unique, 45 occurrences): see Section 5.2.
Outdated: `{}` (no outdated).
Audit: 16 vulns (see Section 5.4).

## 13. References

- Prompt: `prompts/002-update-node.md`
- Plan README: `plans/README.md`
- Node version files: `.nvmrc`, `.tool-versions`
- Guide: `docs/NVM.md`
- Script: `scripts/use-nvmrc.sh`
- AGENTS.md Section 4 (STE100)
- https://nodejs.org/en/about/previous-releases
- https://github.com/nodejs/Release
- https://www.asd-ste100.org/
- npm advisories for `adm-zip`, `inflight`, `glob`, `request`, `phantomjs-prebuilt`
