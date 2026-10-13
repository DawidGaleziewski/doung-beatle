# 02. Graders: the whole division

A **grader** is logic that scores one aspect of a trial. Two independent ways to divide them:
by **kind** (who or what decides) and by **group** (what the check is for).

## By kind: code, model, human

| Kind | Decides by | Good for | Bad for | Cost | Folder |
|---|---|---|---|---|---|
| **Code-based** | Exact match, regex, counting, rules | Things with one right form: a route exists, a label exists, `max_length: 5`, a count is 0 | Meaning ("the record states the age rule correctly") | Free, fast, never flaky | `graders/code/` |
| **Model-based** (LLM as judge) | A second model call answers one narrow question | Meaning: rules, processes, definitions, prose over-claims, terms with variants | Anything code can decide; anything without human labels to calibrate it | Tokens, some noise | `graders/model/` |
| **Human** | A person labels or reviews | Calibrating judges, hold-out ground truth, spot checks | Scale | Your time | `graders/human/` |

Keep all three folders even when one is empty, so the kinds stay visible.

**Use the cheapest grader that measures the right thing.** Our first version used code graders
for everything, including rules and processes, which are about meaning. That mismatch produced
both false passes and false fails (see [06](06-validity-noise-baselines.md)).

| Use code | Use a judge | Use a human |
|---|---|---|
| Screens (route template matches) | Rules (does a record state this rule, correctly?) | Labels for judge calibration |
| Fields (label exists) | Processes (steps and end described?) | Hold-out ground truth |
| Constraints with a clear value | Over-claims phrased in prose | Periodic spot checks of a judge |
| Safety checks (`password_hits = 0`) | Terms with variants ("Autocasco" vs "Autocasco (AC)") or definitions | |

## By group: goal, guardrail, diagnostic

| Group | Question | Example | Rule |
|---|---|---|---|
| **Goal** | Did the agent achieve what the user wanted? Scored against ground truth | Screens reached, docs coverage per category, a trace's steps in order | The north-star numbers |
| **Guardrail** | Did something happen that must never happen? | Portal password appears in any output; a widget action on a read-only persona | Must stay 0; listed as hard-zero checks; **block promotion** of a baseline |
| **Diagnostic** | Why did a score move? | Crawl completed? Relogins, refused tool calls, record-shape mistakes | Explain, never gate |

## Rules for graders

- **Code first.** Add a model grader only for a category where reading outputs showed code
  gives wrong answers.
- **Grade the outcome**, i.e. what the store holds at the end, not the path the agent took.
  Agents find valid paths you didn't plan. Exception: the steps of a trace task *are* its outcome.
- **An empty denominator scores 0 (or `n/a`), never 100 %.**
- **Skip, don't zero**, a grader whose agent didn't run (BA graders under a crawler-only trial).
- **One grader per file, named by what it grades**: `docs-coverage.ts`, `crawl-coverage.ts`,
  `process-trace.ts`, `leaks.ts`, `run-checks.ts`. Never `utils.ts`.
- **Naming**: goal graders `score<Thing>()`, guardrails `sweep<Thing>()` or `<thing>Checks()`.
- **Result fields**: `scores.<category> = { matched, total, pct }`, `overclaims`,
  `checks.<name>` (booleans or counts), `conditions.<name>`, and judges in their own `judges`
  section.
- **Every verdict carries evidence**: which items matched, which were missed, which records
  over-claimed. A number you can't read back is a number you can't debug.
- **Grader code is unit-tested** on saved outputs (fast tier). The paid trial is never in the
  test suite.

## How to review a grader

1. **Does 100 % mean the goal is met?** Imagine a perfect score. Would the user be happy?
2. **Can a bad output score well?** Write a deliberately wrong record. If it passes, too lenient.
3. **Can a good output score badly?** Write a correct record in other words. If it fails, too strict.
4. **What's the noise?** Run 5×; compare the spread with the improvement you're chasing.
5. **Who wrote the answer key, and did they see the output first?**
6. **How many items stand behind the %?** Under ~20, report counts, not percentages.

A **reference solution** (a hand-made perfect output) must score ~100 %. If it doesn't, the
grader or the ground truth is wrong, not the agent.
