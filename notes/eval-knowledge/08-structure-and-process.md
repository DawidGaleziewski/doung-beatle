# 08. Structure and process

## Order of work

```
 0. Is it an eval?            non-deterministic behaviour → eval; fixed input/output → test
 1. Success in words          what outcome means "the agent did its job"
 2. Tasks                     the inputs that vary; 3–5 to start, from real failures
 3. Ground truth              the answer key, written independently of the agent
 4. Graders                   goal / guardrail / diagnostic; code first
 5. Build                     the layout below; --dry-run passes
 6. Validate the eval itself  reference solution scores ~100 %, a bad output scores low
 7. Trials                    3+ per task; measure the noise; set tolerances from it
 8. Baseline                  promote a representative, clean trial
 9. Use it                    after every change that could matter; read transcripts on a drop
10. Grow it                   every new failure becomes a task or a grader
```

**Steps 0–4 happen on paper.** An eval built before you know what success means measures the wrong
thing very precisely.

| Step | Done when |
|---|---|
| 0 | You can say in one sentence which agent behaviour is graded |
| 1 | 1–3 goal statements, the guardrails, and the north-star number |
| 2 | Each task has an id, its input and one line of success criteria. Cover *should act* and *should not act* tasks; keep 1–2 as hold-out |
| 3 | Every task has ground truth; unsure parts are marked, not guessed; one reference solution exists |
| 4 | Each check has a grader kind and a one-line rule for how it decides |
| 5 | Unit tests pass and `--dry-run` passes for every task |
| 6 | The reference solution scores ~100 %, an empty or wrong store scores low, no `0/0` counts as 100 % — you'd bet a score change means a behaviour change |
| 7 | You know the normal spread of every goal score |
| 8 | `baseline.json` exists for every task |
| 10 | Bugs become tasks or graders; ground truth updated with the system in the same commit; tasks every trial passes for months are retired or moved to a cheaper suite |

## Folder layout

At the root of the app the eval measures: `apps/<app>/evals/`, never under `scripts/` or inside a
sub-package.

```
evals/
  README.md        terminology, layout, graders table, kinds of task, where data lives, known gaps
  index.ts         entry: parse config → preflight → task → dry run or runTrial(); reads top to bottom
  config.ts        strict arg parsing (unknown flags are errors) into one EvalConfig; USAGE
  failures.ts      die (before the trial), EvalAbort + abort (inside it, so `finally` cleans up)
  tasks.ts         EvalTask, SUITE, taskFor(), loadGroundTruth(): the suite as data
  ground-truth/    <task>.yaml for systems we don't own
  prompts.ts       what each agent is asked; the *how* stays in agent definitions and skills
  queries.ts       named read-only store queries, one function per question
  results.ts       TrialRecord, buildResult(), saveResult(), promote, comparability warnings
  harness/         one file per concern: workspace, <env>-server, agent, cost, preflight, lock, ports, outcome
  graders/
    grade.ts       grade(): runs every grader over one finished trial
    code/          code-based graders, one file per thing graded
    model/         LLM judge mechanism + judges/<id>.ts, one per judge
    human/         labels.ts + labels/<judge>.yaml
  tests/           unit tests of every pure module (fast tier)
```

Judge mechanism, one file per concern: `definition.ts` (defineJudge), `prompt.ts` (system prompt
+ user message), `call.ts` (isolated CLI call), `login.ts`, `isolation.ts`, `answer.ts` (parse the
stream), `selectors.ts` (pure pair selection helpers), `score.ts`, `calibration.ts` (TPR, TNR,
flip rate, disagreements), `reports.ts`. Commands: `judge.ts`, `draw.ts`, `calibrate.ts`,
`judge-check.ts`.

Outside the folder: results, `baseline.json`, `tolerances.json`, `history/` in
`data/evals/<task>/`; judge reports in `data/evals/judges/<judge>/`.

## Naming

- Files name their concern; never `utils.ts`/`helpers.ts`.
- Types: `EvalConfig`, `EvalTask`, `TraceSpec`, `SUITE`, `taskFor`, `TrialRecord`, `Grades`.
- Functions: `runTrial()`, `grade()`, goal graders `score<Thing>()`, guardrails `sweep<Thing>()`,
  queries named by the question (`pendingFrontierCount`).
- A task is named by its portal id; results in `data/evals/<task>/`.
- Choices between tasks are **data** in `tasks.ts`, not nested ternaries.
- No module-level globals besides constants: pass `EvalConfig` down.

## Kinds of task (for a portal-documenting agent)

| Kind | In `tasks.ts` | Agent does | Extra grading |
|---|---|---|---|
| Map | no `trace` | maps the whole portal | — |
| Trace | `trace: { processId, name, goal }` | walks one named process toward a goal | steps reached in order, goal reached |
| Live site | no `server` | as above, on a site we don't own | — |

**Live sites** (production systems we don't own), before the first trial: read-only action class on
portal and persona, exact allowed hosts, small limits, 1 request/s, an honest user agent, respect
robots.txt (and read it yourself), denylist login/account/edit paths, the owner signs compliance
(never the AI on their behalf), and run crawler-only unless the BA is part of the question.

## A sketch for a chat agent eval

| Step | For a chat agent |
|---|---|
| 0 | Eval: the agent chooses questions and tool calls |
| 1 | Goal: the user reaches a scoped process for the right portal and persona. Guardrail: no forbidden tool call, no write outside the workspace. Diagnostic: turns, questions asked |
| 2 | 3 tasks: a normal onboarding; a portal that doesn't exist (should ask, not guess); a scan it must refuse |
| 3 | Expected end state per task, plus tools that must and must not appear |
| 4 | Code: end state, tool calls from the transcript. Model: "was each question necessary?" (after calibration). Human: labels for that judge |
| 5 | `apps/chat/evals/`; a scripted user plays the user turns |
