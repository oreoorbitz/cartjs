# plans/

This folder holds plans for the CartJS modernization.

## Purpose

Each file in this folder is a plan. A plan describes how to change the project. Agents execute plans in numerical order. Plans are long-form artifacts. They get static analysis before use.

## Naming

- `NNN-kebab-case-title.md` — zero-padded, 3 digits, strictly increasing.
- Example: `001-dependency-modernization-plan.md`, `002-replace-grunt-with-vite.md`
- `README.md` (this file) is not a plan. It explains the folder.

Do not reuse or reorder a number. Add new plans at the end.

## Authoring standard — ASD-STE100

Write all plans in **ASD-STE100 Simplified Technical English** (STE). See https://www.asd-ste100.org/ (Issue 8) and `AGENTS.md` section 4.2.

Key rules:
- Use approved STE words with approved meanings.
- One topic per sentence, maximum 20 words (25 for descriptive).
- Use active voice. Use imperative for procedures.
- Use vertical lists for steps. Number steps.

Run `npx vale plans/*.md` before you commit a plan. Fix STE errors. Do not fix the linter.

## Prompts and plans

- `prompts/` holds LLM prompts. Prompts direct the creation of plans and code changes.
- `plans/` holds the resulting plans. Each plan must reference the prompt that directed its creation.

Example: `plans/001-...md` references `prompts/002-update-node.md`.

## What belongs here vs. prompts vs. AGENTS.md

- `AGENTS.md` — durable project context and rules.
- `prompts/NNN-*.md` — task instruction for one change set.
- `plans/NNN-*.md` — detailed execution plan derived from a prompt.

Do not duplicate `AGENTS.md` content. Reference it.

## Lifecycle

1. Read the prompt in `prompts/`.
2. Create the next `plans/NNN-*.md` from the STE template.
3. Lint with Vale STE rules.
4. Commit only the new plan file(s).
5. Agents execute the plan.

## References

- `AGENTS.md`
- `prompts/README.md`
- `prompts/002-update-node.md`
- https://www.asd-ste100.org/
