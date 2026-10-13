# 01. Evals vs tests, and the vocabulary

## The difference in one line

- A **test** checks that *code* does what it was written to do. Same input, same output. Pass/fail.
- An **eval** measures how well a *non-deterministic system* (an LLM agent plus its harness)
  reaches a *goal*. Same input, different output each run. A **score with a spread**.

| | Test | Eval |
|---|---|---|
| Checks | Code | Behaviour of a model + harness |
| Repeatable | Exactly | No, every run differs |
| Result | Pass / fail | Score, e.g. 62 % ± 8 |
| One run enough | Yes | No, run several trials |
| Expected answer written by | The developer, from the spec | A domain expert, from reality (ground truth) |
| Cost | Milliseconds, free | Minutes, real tokens |
| When it fails | Fix the code | Read transcripts first: agent, harness, grader or ground truth may be wrong |

### Three tiers we ended up with

| Tier | What it is |
|---|---|
| Unit / integration tests | Deterministic code checks |
| Gates | Deterministic tests **of the harness**: a scripted driver (no LLM) walks a demo site and checks the tools record what they should. "Can the harness click a `div` with an `onclick`?" |
| Evals | The real agents run headless, graders score the outcome against ground truth |

A green gate set with a 0 % eval means the machinery works and the outcome doesn't.

**Is it an eval at all?** "The sandbox blocks writes outside the workspace" is a test. "The chat
agent guides a user to a scoped process without needless questions" is an eval. If one run can
decide it and it costs no tokens, it's a test.

## The vocabulary (Anthropic's terms)

Use these in code, docs and agent notes; coin your own word only when Anthropic has none.

| Term | Meaning | Our example |
|---|---|---|
| Task | One problem with inputs and success criteria | "Document portal X as a guest" |
| Evaluation suite | A set of tasks | `SUITE` in `tasks.ts` |
| Trial | One attempt at a task; outputs vary, so run several | One `eval` run, one result file |
| Grader | Logic that scores one aspect: code-based, model-based (LLM judge) or human | `graders/<kind>/` |
| Transcript | Everything the agent saw and did in a trial | The agent CLI session files |
| Outcome | The final state of the environment after the trial | The store and the documentation records |
| Evaluation harness | The code that runs evals end to end | The `evals/` folder |
| Agent harness | What lets the model act as an agent | MCP servers + the agent CLI |
| Reference solution | A known good output that passes all graders | Hand-made records; proves the graders work |

Our own terms, kept on purpose:

- **Ground truth**: the facts the graders compare against (the answer key).
- **Baseline**: the trial chosen as the standard to compare later trials with (not the latest one).
- **Tolerance**: how far a score may drop below the baseline before it counts as a regression.

Domain words of the system under test (crawl run, state, frontier, persona) are *not* eval terms.

## Capability vs regression evals

- **Capability eval**: "can it do this at all?" Starts low, should climb.
- **Regression eval**: "did we break what worked?" Should stay near 100 %.

Mixing both in one baseline with one tolerance hides both signals.

## pass@k and pass^k

- **pass@k**: at least one of k trials succeeded. "Can it ever do it?"
- **pass^k**: all k trials succeeded. "Can I rely on it?"

For a tool someone trusts with documentation, pass^k is what matters.

## Bad and good evals (all of the bad ones were ours)

Bad:

1. One run as the baseline. The next run differed by 20–40 points with no code change.
2. A score with nothing to score: `rules: 0/0 → 100 %`. Means "not measured".
3. A tiny answer key: `screens 1/2`. One record moves the score by 50 points.
4. A string match for meaning: a rule matched any record containing "18" and "75", so "age is
   NOT limited to 18–75" passed and "drivers must be adults up to 75" failed.
5. An eval written by the system it grades: the demo sites, their ground truth and the crawler
   fixes all came from the same model. Circular.
6. An eval of the wrong goal: "did the BA write 19 rule records?" measures activity, not whether
   someone could rebuild the portal from them.

Good:

1. Several trials, reported as mean and spread: "rules 48 % (min 31, max 56, n=5)".
2. One narrow binary question per check, graded by code where possible, by a calibrated judge
   where not.
3. Ground truth written by a domain expert before the run, from the real system.
4. A hold-out task nobody tuned against.
5. Every score links to evidence: which items matched, which were missed, the transcript.
6. Measures the user's goal end to end.

## Who does what (human vs AI)

| Part | Who |
|---|---|
| What counts as success | **The human** (domain judgement) |
| Ground truth content | **The human**, from the real system; AI may format and challenge, never write a hold-out |
| Labels for calibrating a judge | **The human**, pass/fail + one sentence each |
| Grader code, harness, reports | AI (mechanical) |
| Judge prompt | AI drafts, human calibrates against labels |
| First reads of failing transcripts | The human; AI summarises once you know what to look for |

The parts that *define* "good" come from a human. The parts that *compute* the score can be generated.

## Resources

- Anthropic: [Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) (start here)
- Anthropic docs: [Define success criteria](https://platform.claude.com/docs/en/test-and-evaluate/define-success), [Develop tests](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests)
- Hamel Husain: [LLM Evals FAQ](https://hamel.dev/blog/posts/evals-faq/), ["It's Hard to Eval" Is a Product Smell](https://hamel.dev/blog/posts/eval-smell)
- DeepLearning.AI + Arize: [Evaluating AI Agents](https://www.deeplearning.ai/short-courses/evaluating-ai-agents/) (free video course)
