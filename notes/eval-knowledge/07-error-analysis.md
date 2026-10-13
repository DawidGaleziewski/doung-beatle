# 07. Error analysis

**Read many real outputs by hand, note what went wrong in each, group the notes into failure
types, count them.** The counts tell you what to fix first and which evals to write. It's the step
people skip because building feels more productive than reading. You can't write a good eval for
a failure you haven't seen.

## The three moves

1. **Open coding (journaling).** Read one transcript or output. Write a free-text note about the
   *first* thing that went wrong, in your words, no categories yet. "BA wrote a process record for
   the calculator but cited only screen states, no trace steps."
2. **Axial coding (grouping).** After 20–30 notes, group similar notes into a **failure
   taxonomy**: "process record cites wrong evidence kind", "trace never started", "crawler stopped
   at login", "term translated instead of verbatim".
3. **Count.** Fix the biggest category first. Write an eval (code check or judge) for each
   category that matters.

Keep reading until new outputs stop showing new categories (saturation). ~100 traces for a mature
product; 20–30 per agent for a first round.

## Log every bug for evals

Every bug, gap or slip found while running the agents (including the AI assistant's own process
slips) goes into a **findings log** the moment it's found, not at the end:

```markdown
## F-07 Substring matching in the example judge's selector (2026-10-11, caught by test)

- **Symptom**: "OC" matched "Autocasco".
- **Cause**: the selector compared substrings.
- **Fix**: whole-word overlap (commit …) / open.
- **Test/eval idea**: selector test with short labels inside longer words.
```

That log is the raw material for error analysis: each entry becomes a **task** (a new input) or a
**grader** (a new check), so the failure can't come back unnoticed.

## Read transcripts, not only scores

A transcript shows *why*: the agent hit a usage limit, a blocked request reached it as a blank
page, it clicked "Log out" five times, the BA's write calls were refused for a shape error. None
of those are visible in a coverage percentage. Diagnostic graders (refused write calls, record
shape mistakes, relogins) come from exactly these reads.

## Resources

- Hamel Husain: [Evals FAQ](https://hamel.dev/blog/posts/evals-faq/) (error analysis sections)
- Aakash Gupta podcast with Hamel and Shreya: [How to do AI evals step-by-step with real production data](https://www.aakashg.com/hamel-shreya-ai-evals-step-by-step/)
