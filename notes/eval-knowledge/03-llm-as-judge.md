# 03. LLM as a judge

## The idea

Some checks are about meaning, not form. "Does this record state the age rule correctly?" can't
be answered reliably by string matching, but a person answers it in five seconds. **An LLM judge
is a second model call that answers one narrow question like that, returns pass/fail plus a
reason, and is trusted only after you've checked it agrees with your own answers.**

The last part is the whole difference between a judge that helps and one that adds noise.

## Known weaknesses and their defences

| Bias | What happens | Defence |
|---|---|---|
| Position bias | Prefers the first (or second) of two options | Never ask it to compare two outputs; judge one (item, record) pair |
| Verbosity bias | Longer answers look better | Binary factual question, not "how good is it" |
| Self-preference | A model rates text in its own style higher | Calibrate against human labels; optionally cross-check with another provider |
| Leniency | Says pass when unsure | "If the record doesn't clearly state it, fail"; measure the true-negative rate |
| Scale drift | "Rate 1–5" means different things each call | Pass/fail only |
| Non-determinism | Same question, different verdicts | Run each pair 3×, take the majority, report the flip rate |

## The method (Hamel Husain's "critique shadowing")

1. **Write the question in one sentence.** Rules: *"Does this record state the given business
   rule, with the same limits and conditions, as something the portal does?"*
2. **Build a labelled set by hand.** ~40 (item, record) pairs, about half should pass, half
   fail. For each: `pass`/`fail` + one sentence why. Take pairs from real outputs and add
   **hand-made** tricky ones: right rule wrong limits, right limits wrong field, a rule stated as
   an open question, a broader or narrower term.
3. **Split**: ~20 `dev` (to develop the prompt), ~20 `test` (locked, for the final check).
4. **Write the judge prompt** (AI can draft): question, definitions of pass and fail, 3–5 of
   your `dev` examples *with your reasons* as few-shot, the answer format.
5. **Run on `dev`, compare with your labels, read every disagreement**, improve the wording
   (usually: a clearer fail definition, one more example). Repeat until ~90 %.
6. **Run once on `test`.** That's the real agreement. Much lower than `dev` = you tuned to `dev`.
7. **Report two numbers, not one:**
   - **TPR** (true-positive rate): of the pairs you said pass, how many did the judge pass?
   - **TNR** (true-negative rate): of the pairs you said fail, how many did the judge fail?

   A judge that passes everything has TPR 1.0 and TNR 0.0. "Accuracy 80 %" hides that.
8. **Re-check regularly**: when the agent's prompt changes a lot, or monthly, label 10 new pairs.

## Agreement table

| | Judge pass | Judge fail |
|---|---|---|
| **You: pass** | true positive | false negative |
| **You: fail** | false positive | true negative |

- **Read every disagreement.** Sometimes *you* were wrong; fix the label (that's *criteria
  drift*, and normal: you learn what "good" means by grading).
- **Stability**: flip rate = share of pairs whose 3 runs didn't all agree. Above ~5 %, make the
  question narrower.
- **Read the reasons, not only verdicts.** A pass whose reason doesn't match the record is a bug.

## The rules we settled on

- **Calibrated** = TPR and TNR ≥ 0.9 on `test` **for the current wording and model**. Changing the
  question, pass/fail text, examples or the model makes it a new version: uncalibrated again.
- **One narrow yes/no question per call about one (item, record) pair.** No scale, no comparing
  records with each other.
- **The judge sees only the item and the record.** No code score, no transcript, no other records.
- **`fail` covers "not clearly stated".** A third answer `unknown` is allowed only when the record
  lacks the information to decide at all; `unknown` and errors count as fail and are reported apart.
- **Reason first, then verdict** (asked in the prompt; see learning F-03 in [09](09-learnings.md):
  a JSON schema alone doesn't enforce field order).
- **Few-shot examples come from `dev` labels, never `test`.** The calibration tool refuses otherwise.
- **Prefilter with code, judge only candidates.** A pure, deterministic `selectPairs` picks which
  records the judge sees for each item (e.g. records sharing a whole word with the term). Make it
  *looser* than the code matcher if the judge is to find the code matcher's false fails. Whole
  words, never substrings ("OC" is inside "Autocasco").
- **Judge scores sit in their own `judges` section**, beside the code `scores`, and **never gate a
  baseline** or block promotion.
- **Never in the test suite.** The pure parts (prompt building, answer parsing, scoring,
  calibration maths, selectors) are unit-tested on saved CLI outputs.
- **Ask the question the code can't answer.** Our first example judge asked "does the record name
  the same term?", which the code matcher already answered, while the human labelled by "is the
  definition right?". Two different questions, so calibration was meaningless (F-08). Write the
  judge's question at the top of the label file so the labeller answers the same one.

## A judge definition (shape)

```ts
export const glossaryTerms = defineJudge({
  id: 'glossary-terms',
  category: 'terms',
  question: 'Does this glossary record define the ground-truth term with the meaning the portal gives it?',
  pass: 'The record is about this term (case, punctuation or an abbreviation in brackets may differ) ' +
        "and its definition says the same as the portal's meaning, in any language or words. " +
        'Extra details are fine when they do not change or contradict that meaning.',
  fail: 'A different, broader or narrower term; or another meaning, a contradiction, a mix-up with a ' +
        "related term, or the core of the portal's meaning missing.",
  examples: [],            // from dev labels only
  selectPairs: ({ groundTruth, records }) => [/* pure: (item, record) candidates */],
});
```

Full template: [templates/judge-definition.ts](templates/judge-definition.ts).

## The workflow as commands (ours)

| Command | What it does | Cost |
|---|---|---|
| `eval:judge-check` | One real judge call; checks nothing of your setup leaked in | 1 call |
| `eval:draw <judge> --portal <p> --store <path>` | Draws the judge's pairs into `graders/human/labels/<judge>.yaml` | free |
| `eval:calibrate <judge> --split dev\|test` | Judges every labelled pair 3×: table, TPR, TNR, flip rate, disagreements | 3 calls/pair |
| `eval:judge <portal> --store <path> [--judge <id>]` | Judges an existing store; code matcher and judge side by side | 1 call/pair |
| `eval <portal>` | Runs judges after the code graders (`--no-judges` to skip) | 1 call/pair |

Calibration and store reports go to `data/evals/judges/<judge>/`.

## Do you need a second provider?

Not to start. The main risk isn't "Claude judging Claude", it's an **uncalibrated** judge. A
Claude judge at TPR/TNR ≥ 0.9 against your labels is fine. A second provider becomes useful later
as a cross-check against self-preference: if only Claude agrees with your labels, scores may be
inflated. Keep the provider behind one function (`judge(prompt) → Verdict`) and remember you're
sending portal content to another company.

## Resources

- Hamel Husain: [Creating a LLM-as-a-Judge That Drives Business Results](https://hamel.dev/blog/posts/llm-judge/) (critique shadowing; read first). [Simon Willison's summary](https://simonwillison.net/2024/Oct/30/llm-as-a-judge)
- Eugene Yan: [Evaluating the Effectiveness of LLM-Evaluators](https://eugeneyan.com/writing/llm-evaluators/)
- Shankar et al.: [Who Validates the Validators?](https://arxiv.org/pdf/2404.12272) (criteria drift)
- Zheng et al.: [Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena](https://neurips.cc/virtual/2023/poster/73434) (position, verbosity, self-enhancement bias)
- Anthropic: [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) (judge rubric for cited documents)
