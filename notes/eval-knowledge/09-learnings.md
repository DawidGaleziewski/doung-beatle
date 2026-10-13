# 09. Learnings

What actually went wrong while we built our evals and the judge, and what each taught us.

## About the eval method

- **The eval was never validated.** The processes score stayed 0 % for weeks: the crawler ran only
  in map mode, so trace evidence never existed and two of five processes *couldn't* match. A
  reference solution graded on day one would have shown it. → Step 6 (validate the eval itself)
  is not optional.
- **One trial as baseline.** The next trial on the same commit differed by 20–40 points. → 3+
  trials, tolerances from the spread.
- **`0/0` reported as 100 %.** → Empty denominators are `n/a`.
- **String matching for meaning.** Rule markers passed a record that said the opposite. → Judge for
  rules, after calibration.
- **Circular ground truth.** Sites, keys and fixes all came from the same model, and the crawler was
  tuned on the same sites it was measured on. → A hand-written hold-out on a portal nobody tuned on.
- **Measuring activity, not the goal.** "19 rule records written" says nothing about whether the
  portal could be rebuilt from them.
- **Trials that hit the usage limit were scored as bad agent runs.** Both BA transcripts ended with
  "You've hit your session limit". → An API or usage-limit error aborts the trial with no result;
  exit code 3.
- **Evals share the quota with the working session.** → One at a time, a lock file.
- **Exact route template comparison.** `:id` vs `:nr` counted as different screens. → Compare with
  every `:name` reduced to `:`.
- **Outcomes couldn't be found again.** Results didn't record their workspace, `/tmp` gets cleared,
  dry runs left empty workspaces behind. → Record the workspace path; re-grading any store is a
  first-class command.
- **`process.exit()` inside `try` skips `finally`.** A failed trial left the site server running. →
  Throw an abort error inside the trial; stop the whole process group; check ports afterwards.
- **Anonymous persona named anything but `guest`** was graded on logged-in screens. Known gap: name
  conventions in graders are fragile.

## About the judge

- **F-08: the judge asked a question the code already answered.** It checked "same term?" while the
  human labelled "is the definition right?". Calibration would have compared two different
  questions. → Ask what code *can't* answer; put the judge's question at the top of the label file.
- **Real pairs were easy passes.** The BA quoted the portal's definition verbatim, so every real pair
  passed. All hard cases had to be hand-made. → Plan for hand-made pairs (wrong limits, broader or
  narrower term, mixed-up related term) from the start.
- **F-03: "reason first" isn't enforced by a JSON schema.** The CLI delivers the answer as a
  `StructuredOutput` tool call and the model picks field order; 2 of 3 calls wrote `verdict` first.
  → Ask for it in the prompt; if it matters, force it with field names (`a_reason`, `b_verdict`) or
  prose before the structured answer. Measure during calibration whether it changes agreement.
- **F-07: substring matching in the selector.** "OC" matched "Autocasco". → Whole words for short
  labels.
- **F-06: the schema stripped what the judge needed.** A non-strict schema dropped the rule
  `statement`, which wasn't scored by code. → Readers keep fields the judge shows the model.
- **F-05: hand-written probes mislead.** A probe without the question got `unknown`. → Build every
  probe through the real prompt builder.
- **F-02: token setup is easy to get wrong.** Clipped and quote-wrapped tokens gave 401 only at the
  first call. → Validate the token shape on load; surface it in `--dry-run` and `judge-check`;
  never print the value.
- **F-04: a linked login may be refreshed into a deleted folder** (risk, not observed). → Prefer a
  separate `claude setup-token` token for the judge.
- **Built-ins load even with an empty config.** → The isolation check allows `@builtin`, forbids
  user/project skills, agents, plugins, and bounds input tokens to catch leaked instructions.
- **Labels can shift by one.** One pair was labelled while its neighbour stayed empty, likely
  misaligned. → Review the label file once before calibrating; each pair's id names item and record.
- **Dev smoke isn't calibration.** TPR 1.0 on 4 pairs proves the plumbing, not the judge.

## About working with an AI assistant on evals

- The parts that **define good** (success criteria, ground truth, labels, first transcript reads)
  stay with the human. Delegating them makes the eval circular and costs understanding.
- The parts that **compute** (harness, graders, reports, calibration maths) can be generated.
- Use one vocabulary (Anthropic's) everywhere so code, docs, learning material and agents agree.
- Write ground truth and labels in YAML; anything a person writes by hand should be YAML.
- Token-hungry or costly steps (full trials, calibration runs) need the owner's go-ahead.
