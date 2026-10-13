---
name: create-eval
description: How to build or extend an eval for an LLM agent the same way every time — Anthropic's eval terms, the evals/ folder layout (tasks, prompts, harness, graders by kind, results), writing ground truth in YAML, graders (code first, LLM judge only after calibration against human labels), running Claude as an isolated judge from the CLI, trials, conditions and baselines. Use when creating an eval for any agent, adding a task, a ground truth, a grader or an LLM judge, calibrating a judge, running or promoting trials. Not for deterministic tests (those are tests, not evals).
---

# Create an eval

Background and reasons for every rule: `notes/eval-knowledge/` (01–09). This skill is the
checklist.

## 1. Is it an eval?

Non-deterministic agent behaviour, scored over several runs, costing tokens → eval. Same input,
same output, decided in one run → test. Say in one sentence which behaviour is graded.

## 2. Terms (Anthropic, "Demystifying evals for AI agents")

task, evaluation suite, trial, grader (code-based / model-based / human), transcript, outcome,
evaluation harness, agent harness, reference solution. Ours: ground truth, baseline, tolerance.
Use Anthropic's word when one exists; coin a term only when none does. Domain terms of the system
under test are not eval terms.

## 3. On paper first

1. **Success in words**: goal (must be true at the end), guardrails (must never happen),
   diagnostics (explain a score). Name the north-star number.
2. **Tasks**: 3–5, taken from real failures (the findings log), covering *should act* and *should
   not act*; keep 1–2 as hold-out.
3. **Ground truth** (section 5) and one **reference solution**.
4. **Graders** (section 6): a kind and a one-line rule for each check.

Do not write code before these four exist.

## 4. Layout

`apps/<app>/evals/` at the root of the measured app:

```
README.md index.ts config.ts failures.ts tasks.ts prompts.ts queries.ts results.ts
ground-truth/<task>.yaml
harness/   workspace, <env>-server, agent, cost, preflight, lock, ports, outcome
graders/   grade.ts, code/, model/ (judges/<id>.ts), human/ (labels/<judge>.yaml)
tests/     unit tests of every pure module
```

Keep all three grader folders. Files name their concern (no `utils.ts`). Choices between tasks are
data in `tasks.ts`. Results: `data/evals/<task>/` with `baseline.json`, `tolerances.json`, `history/`.

## 5. Ground truth

- YAML, one file per portal, a header comment naming the portal, the source, `today` and `locale`.
- Written **by a person** from the real system, never saved from agent output unreviewed.
- Every item: the fact (portal's own words), `how_i_know`, `who_sees`, `counts_when`; optional
  `unsure:`. No source → no item. Unsure items are left out of the grader's file.
- `who_sees: nobody` items are over-claim traps.
- Next to the system when we own it, with a self-check test; else `evals/ground-truth/`.
- The AI may format notes into the schema file and challenge items; it never proposes hold-out items.

## 6. Graders

- **Groups**: goal (vs ground truth), guardrail (must stay 0, block promotion), diagnostic.
- **Code first.** A judge only for a category where reading outputs showed code is wrong.
- Grade the **outcome** (end state), not the path, except a trace's steps.
- Empty denominator → `n/a`, never 100 %. A grader whose agent didn't run is skipped, not zeroed.
- Every score lists what matched, what was missed, what over-claimed.

### Adding an LLM judge

1. `graders/model/judges/<id>.ts`: `defineJudge({ id, category, question, pass, fail, examples,
   selectPairs })`, plus one line in the judges index.
   - One narrow yes/no question about one (item, record) pair; one the code can't answer.
   - `fail` covers "not clearly stated"; `unknown` only when the record can't decide it at all.
   - `selectPairs` pure and deterministic; looser than the code matcher; whole words, not substrings.
   - The judge sees only the item and the record.
2. Draw pairs into `graders/human/labels/<id>.yaml` with the question at the top. **The human
   labels** every pair (pass/fail + one sentence) and adds hand-made hard pairs. Split dev/test.
   Never label from the judge's output.
3. Calibrate on `dev` (each pair 3×, majority vote): read every disagreement, refine wording or a
   label, repeat. Then once on `test`. **Calibrated = TPR and TNR ≥ 0.9 on `test` for the current
   wording and model.** Report TPR, TNR, flip rate. Any wording or model change = uncalibrated.
4. Few-shot examples only from `dev`.
5. Judge scores go in `judges`, beside `scores`; never gate a baseline; never in the test suite.

### Running Claude as the judge

One CLI call per pair:

```
claude -p <user> --model sonnet --system-prompt <judge> --tools "" --strict-mcp-config \
  --no-session-persistence --output-format stream-json --verbose --json-schema <verdict schema>
```

- Fresh empty `CLAUDE_CONFIG_DIR` and fresh empty cwd per call, both deleted in `finally`.
- Strip `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `CLAUDE_CODE_OAUTH_TOKEN` from the child env.
- Login: a `claude setup-token` token from a file, passed as `CLAUDE_CODE_OAUTH_TOKEN` to the
  child only (never exported in the shell); fallback: symlink `~/.claude/.credentials.json` into
  the fresh folder. Validate the token shape; a rejected token stops the run, never falls back.
- Isolation check from the `system/init` event: tools = `[StructuredOutput]`, no MCP servers, only
  `@builtin` plugins, none of the user's or project's skills/agents, memory inside the fresh
  folder, input tokens < 2000.
- Parse `structured_output` from the result event; a 401 is a setup error, not a `fail`.
- Store per verdict: pair id, verdict, reason, judge version (hash of wording + model), model id,
  CLI version, tokens.

## 7. Trials and baselines

- Fresh isolated workspace per trial; record its path in the result.
- API error or usage limit → abort, no result. The eval's own budget running out → recorded.
- One trial at a time (lock file); the eval starts and stops its own servers.
- `--dry-run` covers everything up to the first paid call.
- Record `git_sha` (commit first) and `conditions`; warn when the baseline's differ.
- 3+ trials before trusting a score; tolerances from the spread.
- Promote a typical, completed trial with all guardrails at 0; old baseline to `history/`.
- Re-baseline when prompt, agent definition, persona, locale or model change.
- Paid trials and judge calls need the owner's go-ahead.

## 8. Validate the eval before trusting it

Reference solution ~100 %; an empty or wrong store scores low; no `0/0` as 100 %; read the first
trials' transcripts next to the ground truth and sort every disagreement into agent bug or grader
bug.

## 9. Grow it

Every bug found becomes a findings-log entry with a test/eval idea, then a task or a grader.
Update ground truth in the same commit as the system it describes.
