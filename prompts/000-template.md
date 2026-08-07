# NNN — Title in kebab-case (copy this file to NNN-title.md)

> How to use this template: Copy to `prompts/NNN-your-title.md`. Replace NNN with the next number. Write in ASD-STE100 Simplified Technical English. Keep each sentence ≤ 20 words. Use active voice and imperative for steps. Delete this block before you lint.

## 1. Objective

State the objective in one paragraph. Use approved STE words. One idea per sentence.

Example (STE): `Update the build system to use npm scripts and Vite. Keep the public API unchanged.`

## 2. Context

Why this prompt exists. Reference upstream and project state.

- Fork: `oreoorbitz/cartjs` (exact copy of `discolabs/cartjs` v1.1.0).
- Related goal in `AGENTS.md` section: (e.g., `2 — Modernization goals`).
- Mepto relation: (e.g., `Test Mepto for $.ajax replacement` or `No Mepto relation`).

## 3. Scope

### 3.1 In scope

- List items. One item per line. Start with a verb.

### 3.2 Out of scope

- List items that the agent must not do.

## 4. Inputs

- Files to read: `src/core.coffee`, `Gruntfile.coffee`, `package.json`, etc.
- Docs to read: `AGENTS.md`, `https://www.asd-ste100.org/`.
- Dependencies: (e.g., `Mepto vX.Y.Z` or `none`).

## 5. Procedure

Numbered steps. One action per step. Imperative mood.

1. Read `src/core.coffee` and list all `jQuery` usages.
2. Replace `$.ajax` with `fetch` or Mepto equivalent. Keep the queue behavior.
3. Update `Gruntfile.coffee` or replace it. Keep `dist/cart.js` buildable.
4. Run `npm test` and make all tests pass.
5. Do not change `dist/` by hand.

## 6. Constraints

- Obey `AGENTS.md` section 6.
- Keep sentences ≤ 20 words. Use only approved STE vocabulary.
- Do not rewrite git history. Do not publish to npm.
- Keep the `CartJS` public API unchanged unless the prompt says otherwise.

## 7. Mepto test (if applicable)

- Hypothesis: (e.g., `Mepto can replace $.ajax for CartJS.Queue`).
- Test: (e.g., `Run spec/ with Mepto adapter and compare results to jQuery baseline`).
- Record result: pass / fail / gap. File gap as issue in `oreoorbitz/Mepto`.

## 8. Acceptance criteria

- [ ] Criterion 1 uses STE and is testable. Example: `The build completes with `npm run build`.`
- [ ] All tests pass: `npm test` shows zero failures.
- [ ] Lint passes: `npx vale prompts/NNN-your-title.md` shows zero STE errors.
- [ ] No collateral edits to unrelated files.

## 9. Output

State what the agent must produce. Example: `A commit that updates build files and keeps dist/ reproducible.`

## 10. STE checklist (complete before you mark done)

- [ ] Each sentence has ≤ 20 words.
- [ ] Each paragraph has ≤ 6 sentences.
- [ ] One topic per sentence.
- [ ] Active voice only. No passive.
- [ ] Approved words only. No synonyms for variety.
- [ ] Vertical lists for procedures.
- [ ] Technical names used consistently.

## 11. References

- `AGENTS.md`
- https://github.com/discolabs/cartjs
- https://github.com/oreoorbitz/Mepto
- https://www.asd-ste100.org/
