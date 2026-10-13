# Eval knowledge

What we learned building evals for an LLM agent system (a crawler agent that maps a web portal and
a BA agent that documents it), written so it can be reused for any agent. Nothing here depends on
the code in this repository: the eval harness itself stays in the home project; this folder holds
the method, the structure and the lessons.

Vocabulary follows Anthropic's
[Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents).

## Read in this order

| # | File | Question it answers |
|---|---|---|
| 01 | [01-evals-vs-tests.md](01-evals-vs-tests.md) | What is an eval, what isn't, and the words we use |
| 02 | [02-graders.md](02-graders.md) | The three kinds of grader, the three groups of checks, code first |
| 03 | [03-llm-as-judge.md](03-llm-as-judge.md) | When a judge is worth it, its biases, and how to calibrate it against human labels |
| 04 | [04-claude-as-judge.md](04-claude-as-judge.md) | How to run Claude as the judge from the CLI on a subscription, isolated |
| 05 | [05-ground-truth.md](05-ground-truth.md) | How to write the answer key by hand, in YAML, without circularity |
| 06 | [06-validity-noise-baselines.md](06-validity-noise-baselines.md) | Is the number measuring the right thing, how noisy is it, when to trust a baseline |
| 07 | [07-error-analysis.md](07-error-analysis.md) | Reading outputs by hand and turning failures into tasks and graders |
| 08 | [08-structure-and-process.md](08-structure-and-process.md) | The folder layout, naming, and the order of work from paper to baseline |
| 09 | [09-learnings.md](09-learnings.md) | What actually went wrong while we built ours, with the lesson from each |

Reusable parts:

- [skill/create-eval/SKILL.md](skill/create-eval/SKILL.md): a skill an agent (Claude Code, Kiro)
  loads before building or extending an eval. Copy it into `.claude/skills/` or `.kiro/skills/`.
- [templates/](templates/):
  - [judge-definition.ts](templates/judge-definition.ts): a rules judge to copy
  - [judge-labels.yaml](templates/judge-labels.yaml): a label file with real and hand-made pairs, dev/test split
  - [ground-truth-notes.yaml](templates/ground-truth-notes.yaml): hand-written ground-truth notes for a fictional claim portal
  - [judge-call.sh](templates/judge-call.sh): one isolated Claude judge call from the CLI

## The ten things to remember

1. **A test checks code; an eval measures a non-deterministic agent against a goal.** Tests give
   pass/fail, evals give a score with a spread.
2. **Code graders first.** Add an LLM judge only for a category where you *showed* the code grader
   gives wrong answers (false passes or false fails).
3. **One narrow yes/no question per judge call**, with a reason. Never "rate 1–10".
4. **A judge is trusted only after calibration**: it agrees with a human's labels at TPR and TNR
   ≥ 0.9 on a held-out test split. Report both rates, never one "accuracy".
5. **Judge scores sit beside code scores, never gate a baseline.**
6. **Ground truth is written by a person, independently of the agent's output**, with a
   `how_i_know` per item. Agent-written keys are circular.
7. **Ground truth in YAML**, because people write and review it and YAML allows comments.
8. **Run several trials** (3 minimum) and set tolerances from the measured spread; one run is noise.
9. **A category with nothing to score is `n/a`, never 100 %.**
10. **Read transcripts before trusting a number.** The agent, the harness, the grader or the ground
    truth can each be the one that's wrong.
