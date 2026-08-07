# prompts/

Long-form LLM prompts for the CartJS modernization. Each prompt is a versioned document. Agents execute prompts in numerical order.

## Naming

- `NNN-kebab-case-title.md` — 3-digit zero-padded prefix, strictly increasing.
- `000-template.md` is the template. Do not execute it.
- Example sequence:
  - `001-modernize-build-system.md`
  - `002-replace-jquery-ajax-with-fetch.md`
  - `003-migrate-coffeescript-to-typescript.md`

Never reuse or reorder a number. Add new prompts at the end.

## Authoring standard — ASD-STE100

Write all prompts in **ASD-STE100 Simplified Technical English** (STE).

- Spec: https://www.asd-ste100.org/ (Issue 8)
- Overview: https://www.asd-europe.org/standards-specifications/simplified-technical-english/what-are-the-basics-of-simplified-technical-english/

### STE rules that matter most for prompts

| # | Rule (paraphrased) | Example |
|---|--------------------|---------|
| 1 | Use only approved words with approved meanings | Use `show`, not `display`/`render` interchangeably |
| 2 | One word, one meaning | Pick `start` and use it everywhere |
| 3 | One topic per sentence, max 20 words (25 for descriptive) | Split long sentences |
| 4 | Use active voice and imperative for procedures | `Do X.` not `X should be done.` |
| 5 | Use simple verb tenses only | `The function returns` not `The function will be returning` |
| 6 | Do not make clusters of more than 3 nouns | `cart update request` → `request to update the cart` |
| 7 | Use vertical lists for procedures | Number steps 1., 2., 3. |
| 8 | Be consistent: same name for same thing | Always `CartJS.Core`, not `core module` / `Core` |
| 9 | Avoid idioms, phrasal verbs, and ambiguous pronouns | Avoid `figure out`, `get rid of`, `it` with unclear antecedent |
| 10 | Put warnings/cautions before the hazardous step | `CAUTION: This deletes dist/.` before the command |

Full rules: see the STE specification. This table is a working summary.

## Static analysis

Run these checks before you use a prompt:

```bash
# Vale with STE ruleset (via vale-llm-slop)
npx vale prompts/NNN-your-title.md

# Optional: markdown lint
npx markdownlint prompts/NNN-your-title.md
```

A prompt must pass all checks before an agent executes it. Fix the prompt, not the linter. CI will enforce this when configured.

Configuration lives in `.vale.ini` (when present) and references the `STE` style from `vale-llm-slop`.

## Lifecycle

1. Copy `000-template.md` → `NNN-your-title.md`.
2. Fill each heading in STE. Keep sentences short.
3. Lint and fix.
4. Commit only the new file (or a focused set).
5. Agent executes the prompt and records the result (commit / PR).

## What belongs here vs. AGENTS.md

- `AGENTS.md` — durable project context, conventions, and goals.
- `prompts/NNN-*.md` — task-specific instructions for one change set.

Do not duplicate `AGENTS.md` content into every prompt. Reference it: `Obey AGENTS.md section 6.`
