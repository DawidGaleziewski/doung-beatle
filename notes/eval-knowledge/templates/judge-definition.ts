/**
 * Template: one LLM judge (model-based grader). Copy to `evals/graders/model/judges/<id>.ts` and
 * add one line to the judges index. Changing question, pass, fail, examples or the model makes a
 * new version: uncalibrated until a new `test` calibration (TPR and TNR ≥ 0.9).
 */
import { defineJudge, type Pair } from '../definition.js';
import { normalise, ofKind, toPair } from '../selectors.js';

/** Whole words, never substrings: as substrings "OC" would match "Autocasco". */
const words = (s: string): string[] =>
  normalise(s)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 0);

const related = (a: string, b: string): boolean => {
  const ws = new Set(words(a));
  return words(b).some((w) => ws.has(w));
};

export const rulesStated = defineJudge({
  id: 'rules-stated',
  category: 'rules',
  // One narrow yes/no question about one (item, record) pair, one the code matcher can't answer.
  question:
    'Does this documentation record state the given business rule, with the same limits and ' +
    'conditions, as something the portal does?',
  pass:
    'The record states this rule as behaviour of the portal, with the same limits, values and ' +
    'conditions, in any language or words. Extra details are fine when they do not change it.',
  // `fail` covers "not clearly stated" (the leniency defence).
  fail:
    'The record states other limits or conditions, the opposite, only part of the rule, a ' +
    'different field, or poses it as an open question; or it does not clearly state it.',
  // From `dev` labels only, with the labeller's reason. Never from `test`.
  examples: [
    // { item: '…', record: '…', reason: '…', verdict: 'fail' },
  ],
  // Pure and deterministic: same input, same pairs, same order. Looser than the code matcher so
  // the judge can find the code matcher's false fails.
  selectPairs: ({ groundTruth, records }) => {
    const rules = [...ofKind(records, 'business_rule')].sort((a, b) => a.key.localeCompare(b.key, 'en'));
    return groundTruth.rules.flatMap((r): Pair[] =>
      rules
        .filter((rec) => related(r.anchor.label, rec.text) || rec.cites(r.anchor.screen))
        .map((rec) => toPair(r.id, `rule: ${r.statement}\nwhere: ${r.anchor.screen} / ${r.anchor.label}`, rec)),
    );
  },
});
