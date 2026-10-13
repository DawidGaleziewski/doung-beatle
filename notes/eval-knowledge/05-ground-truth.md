# 05. Ground truth

## What it is

**The answer key: what is really true about the system being documented, written down
independently of the agent being graded.** The grader compares the agent's output to it. If the
student writes the answer sheet, the exam measures nothing.

For a portal, ground truth lists what a perfect BA would document: screens, fields and their
constraints, rules, processes (ordered steps), terms.

```yaml
# sample-portal ground truth (shortened). Facts checked on 2026-10-01, locale pl.
screens:
  - id: S09
    route_template: /kalkulator/kierowca
    guest_visible: true
rules:
  - id: R01
    statement: The driver must be between 18 and 75 years old on the calculation date.
    anchor: { screen: S09, label: Data urodzenia }
    guest_observable: true
    claim_markers: ["18", "75"]
processes:
  - id: P01
    name: Oblicz składkę OC/AC
    steps: [/kalkulator/pojazd, /kalkulator/kierowca, /kalkulator/opcje, /kalkulator/wynik]
    first_route: /kalkulator/pojazd
    last_observable_route: /kalkulator/wynik
terms:
  - { id: T02, term: Autocasco (AC), lang: pl, meaning: Dobrowolne ubezpieczenie pojazdu od uszkodzeń i kradzieży. }
```

## Rules we settled on

- **YAML, never JSON.** People write and review it by hand; YAML allows comments and is easier to
  read. A file starts with a comment naming the portal and where the facts came from.
- **One file per portal.** Next to the system when we own it (its self-check tests read it there);
  in `evals/ground-truth/<task>.yaml` when we don't.
- **Validated by a schema** on read. Careful: a non-strict schema *strips* fields it doesn't score
  (we lost every rule's `statement`, which the judge needed; F-06).
- **Written by a person, not from agent output.** Agent output may be a starting point only for a
  site we don't own, and only after every item is checked by hand.
- **Unsure items are left out** of the grader's file until confirmed; the header says so.
- **Conditions**: `today` (date checked) and `locale`. The persona used by the task must run in the
  same locale, or the trial measures a different site.
- **Evidence** (screenshots) next to the notes, named in `how_i_know`.
- **Reference solution**: for at least one task, a hand-made output that should score ~100 %.

## Why independence matters: circular evaluation

| Ground truth | Site built by | Key written by | Independent? |
|---|---|---|---|
| sample-insurer | the AI | the AI | No |
| demo-site bank / shop / insurer | the AI | AI subagents | No, and the crawler was then fixed against exactly these sites |
| a real portal | a real company | a person who walked it | Yes, this is where a hold-out comes from |

**Circular evaluation**: the system graded against its own idea of the answer. It proves the
plumbing works, not that the agent finds what a human would expect, because the same blind spots
sit in the answer and the key.

**Teaching to the test**: fix the crawler until the demo-site score rises, and the score stops
measuring "handles legacy portals" and starts measuring "handles these three sites". Screens went
36 % → 91 % on one demo site; we don't know how much of that transfers.

**Fix: a hold-out set.** Ground truth for a portal nobody tuned against, written by a person, kept
away from the AI, run rarely (e.g. once per close-out). Tell the agent in its instructions never
to read or edit the hold-out folder except to run the eval.

## Two files: your notes, and the grader's file

You write **notes**: facts in plain words, each with its source. The grader's file (schema, with
matching hints) is produced *from* the notes (by AI or a converter) and checked against them.

| You write (notes) | The grader reads (schema) |
|---|---|
| Facts in plain words | Same facts + matching hints |
| `how_i_know` for every item | Nothing about sources |
| `who_sees: guest / client / nobody` | `guest_visible`, `guest_observable`, `actor` |
| `counts_when`: which record would be correct | `claim_markers` (strings that must appear), or a judge's question |
| Processes as screen ids | Routes, `first_route`, `last_observable_route` |
| `unsure:` for what you couldn't confirm | Nothing: unsure items are left out |

## The four questions every item answers

1. **What is true?** In the portal's own words for labels (`Data zdarzenia`, not "event date").
2. **How do I know?** `how_i_know`. "Tried 29 characters, got an error" is a source; "seems
   likely" is not. **No source, no item.**
3. **Who can see it?** `who_sees`. A guest trial can't be blamed for missing a client-only screen.
   A rule nobody can see on the website (`who_sees: nobody`) is a **trap**: if the BA documents
   it, it made it up (an **over-claim**).
4. **What counts as correct?** `counts_when`, one sentence. It becomes a code check (strings that
   must appear) or a judge's question. Writing it forces you to decide what you require.

Optional: **`unsure:`**. Write doubts instead of guessing; graded only once confirmed.

Example entry (notes) and what it becomes:

```yaml
# notes
- id: R04
  statement: A theft claim (Kradzież) requires the police report number.
  where: { screen: S03, label: Numer zgłoszenia policji }
  who_sees: client
  how_i_know: with Kradzież and the field empty, "Dalej" shows "Podaj numer zgłoszenia policji"
  counts_when: a record says the police report number is mandatory for theft

# grader's file
- id: R04
  statement: A theft claim (Kradzież) requires the police report number.
  type: validation
  anchor: { screen: S03, label: Numer zgłoszenia policji }
  guest_observable: false
  claim_markers: [Kradzież, policji]
```

`claim_markers` is the lossy step: "theft needs the police case number" fails on "policji". That
is exactly why rules want a judge.

Full worked example: [templates/ground-truth-notes.yaml](templates/ground-truth-notes.yaml).

## How to write it: walk the portal, not the editor

One process at a time:

1. **Walk it once as the user would**, without writing.
2. **Walk it again and write the screens** in order: route, title as shown, who sees it. The
   process falls out of this list.
3. **On each form, write every field**: label as shown, type, required. Then **try the limits**:
   empty, too long, -1, tomorrow's date. Every error message is a constraint or a rule, with its
   source.
4. **Write the rules**: everything that decides what's allowed, what it costs, what appears when.
   Signs: an error message, a field that appears or disappears, a disabled button, a number in
   help text. One sentence each.
5. **Add what you know but the website doesn't show** (from the business, a manual) with
   `who_sees: nobody`: your over-claim traps.
6. **Write the terms**: the portal's words a newcomer wouldn't know, with a one-line meaning.
7. **Re-read against the four questions.** Drop or mark `unsure:` whatever fails.
8. **Review again 3–4 days later** without looking at your first reasoning. Where the two passes
   disagree, the item is unclear.

**Pick small, not complete**: one process end to end (4–8 screens, 5–10 rules, its terms). A small
key you trust beats a big one you don't.

**Prioritise by migration risk**: processes and their order → rules that change outcomes →
fields and constraints → terms → screens. Write fewer screens and more rules and processes:
that's where the value and the low scores are.

## Should the AI help?

Two safe ways: **formatting** (notes → schema file, checked by you) and **challenging** ("here are
my 8 rules; which observations would contradict them?", then you verify on the portal). The AI
should **not** propose items for a hold-out set from crawling the portal: then the key contains
what the AI can find and misses what it can't, which is the thing you want to measure.

## How to review ground truth

- Every item has a `how_i_know`. No source → drop it.
- Every item is checkable. "The form is user-friendly" isn't; "postcode must be NN-NNN" is.
- Counts are big enough: under ~10 items per category, report counts, not percentages.
- Agreement with someone else: a second BA writes the same process; items only one of you wrote
  are a miss or an ambiguity (Cohen's kappa for pass/fail agreement).
- It stays true: portals change. Date the file and re-check before an important run.
- For sites we own, a **self-check test** compares the file with the running site (routes answer,
  labels on the page, rule anchors where stated), so system and truth can't drift apart. Update
  ground truth in the same commit as the system.

## Resources

- Hamel Husain: [A Field Guide to Rapidly Improving AI Products](https://hamel.dev/blog/posts/field-guide/)
- Shankar et al.: [Who Validates the Validators?](https://arxiv.org/pdf/2404.12272) (criteria drift: version your key)
- Surge AI: [Inter-rater reliability: Cohen's kappa](https://surgehq.ai/blog/inter-rater-reliability-metrics-understanding-cohens-kappa)
- Maven free lesson: [The cold-start eval problem](https://maven.com/p/5fb214/the-cold-start-eval-problem-evals-for-new-ai-products)
