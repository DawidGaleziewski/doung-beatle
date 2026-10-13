# 06. Validity, noise, trials and baselines

Two separate questions about any eval number:

1. **Validity**: is it measuring the thing I care about? If it goes up, did the product get better?
2. **Noise**: if I measure again without changing anything, do I get the same number?

## Validity

A metric is valid when a higher score really means a better outcome for the user. It's invalid
when you can raise the score without improving the outcome, or improve the outcome without the
score noticing. **Goodhart's law**: when a measure becomes a target, it stops being a good measure.
Agents are very good at this, because they read the grader and the ground truth if you let them.

### Five tests for any category

| Test | Question | How |
|---|---|---|
| **Empty** | What does it say with nothing to measure? | Look for `total: 0` |
| **Fake-pass** | Can a wrong output score well? | Write a deliberately wrong record, grade it |
| **Fake-fail** | Can a right output score badly? | Write a correct record in other words |
| **Size** | How many items are behind the %? | `total` < 10–20 → one item moves it a lot |
| **Goal** | If this were 100 %, would the user be happy? | Imagine it, honestly |

### What failed these tests in ours

1. `rules: {matched: 0, total: 0, pct: 100}`: fails *empty*. Must be `n/a` and skipped in comparisons.
2. `screens 1/2`, `fields 0/2`: fails *size*. Can only be 0, 50 or 100.
3. Rules via `claim_markers` ("18", "75"): fails *fake-pass*. Any record on that screen with both
   numbers passes, even one saying the opposite.
4. Terms by exact normalised string: fails *fake-fail*. "Autocasco" vs "Autocasco (AC)" is a miss.
5. Processes by first + last route in cited evidence: fails *fake-fail*. The eval ran the crawler
   only in map mode, so trace evidence never existed and processes ending in a result could
   **never** match. The score was stuck at 0 % for weeks and nobody noticed, because nobody
   validated the eval itself with a reference solution.
6. Screen coverage on the demo sites after tuning the crawler on them: fails *goal* subtly.

## Noise

An agent run is a random draw. Our own data, same site, nearby commits:

| Category | Runs |
|---|---|
| terms | 20, 0, 40, 40, 30, 0 |
| obstacles | 33, 30, 40, 33, 37, 43 |
| rules | 31, 0, 31, 56 |
| fields | 0, 0, 89, 96 |

Our tolerances were 5–15 points; the noise was up to 40. The regression check fired on luck and
missed real drops.

What to do:

1. **Run each configuration several times**: 3 minimum, 5 better. Report mean, min, max.
2. **Compare distributions, not single runs.** "Before 31, 0, 31; after 56, 50, 62" is a change;
   "before 31, after 56" may not be.
3. **Set tolerances from the measured spread.** A drop smaller than the normal spread isn't a regression.
4. **Keep it cheap enough to repeat.** At $2–6 per trial, 5 trials is $10–30 per measurement: keep
   a small fast suite for daily work and the full one for close-out.
5. **Fix what you can**: site, persona data, model version, locale.

Just enough statistics: SE = SD / √n; 95 % interval ≈ mean ± 1.96 × SE. Rules 31, 0, 31, 56 →
mean 29.5, SD ≈ 23, SE ≈ 11.5 → interval ≈ 7 to 52. Four runs told us almost nothing.

## Trials

- **Fresh, isolated workspace per trial**: never the developer's store unless explicitly asked.
- **No result on an outage**: an API error, rate limit or usage limit aborts the trial with no
  result file. Running out of the eval's **own** budget is a fair end and is recorded. We once
  promoted trials whose BA transcripts ended in "You've hit your session limit"; they looked like a
  bad agent.
- **Outcome per agent**: `success`, `budget_end`, `api_error`, `usage_limit`. Only the first two
  write a result.
- **Exit codes**: 0 ok, 1 regression, 2 bad input / preflight / API error, 3 usage limit. Chain
  trials with `&&` so the chain stops on anything but 0.
- **One at a time**: trials share the account's quota with each other and with the session that
  started them. A lock file (holding the pid; a dead pid's lock is taken over) refuses a second.
- **Own servers**: the eval starts the site it needs, refuses when a port is already held (naming
  the process), and stops the whole process group afterwards.
- **`--dry-run`** exercises everything up to the first paid call (workspace, secrets, ground truth).
- **Record the workspace path** in the result, so a trial's outcome can be found and re-graded
  later (we couldn't, F-01).
- **Record conditions** (model, timeouts, crawler-only, prompt version) in `conditions` and warn
  when the baseline's differ. A missing condition in an old result means the default.
- **Commit before a trial**: each result records the `git_sha`, so `git diff <baseline sha>
  <trial sha>` shows what changed.

## Baselines

- **Baseline = a copy of the trial chosen as the standard**, not the latest one.
- **Promotion is refused** when the agent didn't complete or a guardrail is above 0. The old
  baseline moves to `history/`.
- **Pick a typical trial**, near the middle of the spread, not the luckiest.
- **Re-baseline when conditions change** (prompt, agent definition, persona, locale, model,
  crawler-only): replace the baseline instead of comparing across the change.
- Result files and baselines are committed.
- Judge scores never gate a baseline.

## Using it

After any change that could affect behaviour (agent definition, skill, prompt, tool, model):

1. Run the affected tasks (several trials if the change is subtle).
2. Clearly better beyond the noise → promote.
3. Regression → don't argue with the number first; read the failing trial's transcripts next to the
   baseline's.
4. A score you don't believe → the eval may be wrong; go back to validating it.

## Resources

- Anthropic: [A statistical approach to model evals](https://www.anthropic.com/research/statistical-approach-to-model-evals), paper [Adding Error Bars to Evals](https://arxiv.org/pdf/2411.00640)
- Thomas & Uminsky: [The Problem with Metrics is a Fundamental Problem for AI](https://arxiv.org/pdf/2002.08512)
