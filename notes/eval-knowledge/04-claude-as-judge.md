# 04. Running Claude as the judge

How we call Claude as an LLM judge with nothing but the Claude Code CLI and a subscription login:
no API key, no SDK. Verified on Claude Code 2.1.288 (2026-10-11); check `claude --help` if a flag
changed.

## One call per (item, record) pair

```bash
claude -p "<user message: the item and the record>" \
  --model sonnet \
  --system-prompt "<the judge's whole instructions>" \
  --tools "" \
  --strict-mcp-config \
  --no-session-persistence \
  --output-format stream-json --verbose \
  --json-schema '{"type":"object","properties":{"reason":{"type":"string"},"verdict":{"enum":["pass","fail","unknown"]}},"required":["reason","verdict"]}'
```

| Flag | Why |
|---|---|
| `-p` | Headless, one prompt, one answer |
| `--system-prompt` | **Replaces** Claude Code's own system prompt with the judge's instructions |
| `--tools ""` | No tools: the judge can only answer |
| `--strict-mcp-config` | Ignore every MCP server config (none given, so none load) |
| `--no-session-persistence` | Don't write a session file per call |
| `--output-format stream-json --verbose` | Adds the `system/init` event (model id, tools, MCP servers, plugins, skills, agents, CLI version) used for provenance and the isolation check. Plain `json` has no init event |
| `--json-schema` | Forces a parseable answer: the result event's `structured_output` holds `{reason, verdict}` |

Measured: ~870 input tokens per call, ~$0.005 on Sonnet. A full template is
[templates/judge-call.sh](templates/judge-call.sh).

## Isolation: nothing of yours reaches the judge

A judge must see only its instructions, the item and the record. By default Claude Code would also
load your `~/.claude` (CLAUDE.md, rules, memory, skills, agents, hooks, plugins) and the project's
(`CLAUDE.md`, `.mcp.json`, `.claude/settings.json`). That changes verdicts and costs tokens. Our
"light isolation", per call:

1. **Fresh empty config folder** as `CLAUDE_CONFIG_DIR` (`mktemp -d`). Everything personal lives in
   `~/.claude`; a fresh folder drops all of it.
2. **Fresh empty working folder** outside the repo as the cwd, so no project `CLAUDE.md` or
   settings are found.
3. **Strip credentials from the child env** that would outrank the judge's login or point it at
   your config: `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `CLAUDE_CODE_OAUTH_TOKEN`, then set
   `CLAUDE_CONFIG_DIR` to the fresh folder.
4. **Delete both folders** afterwards (in a `finally`).

Rejected: `--bare` (ignores the subscription login, API key only); a container (deferred: only if
the isolation check ever finds a leak).

**Caveat (verified):** Claude Code's *built-in* plugins (`*@builtin`), skills and agents still load
with an empty config. With no tools the judge can't use them, so the check allows built-ins and
forbids only user and project ones.

## The isolation check

Run one real call and read its `system/init` event and usage. All must hold:

| Check | Passes when |
|---|---|
| tools | exactly `[StructuredOutput]` |
| MCP servers | none |
| plugins | only `*@builtin` |
| skills / agents | none of the names in `~/.claude/{skills,agents}` or `<repo>/.claude/{skills,agents}` |
| memory | the auto-memory path is inside the fresh config folder |
| input tokens | < 2000 (the judge prompt alone is ~900; leaked CLAUDE.md or rules, which the init event doesn't list, show up here) |

## The judge's login

The fresh config folder has no login, so the judge needs its own. Lookup order:

1. A token file named by an env var (`<APP>_JUDGE_TOKEN_FILE`).
2. A default token file, e.g. `~/.config/<app>/judge-token` (mode 600, one line, no quotes).
   Create the token with `claude setup-token` (a one-year OAuth token).
3. Fallback: symlink `~/.claude/.credentials.json` into the fresh config folder.

A token from a file goes to the **judge's child process only**, as `CLAUDE_CODE_OAUTH_TOKEN`.
**Never export `CLAUDE_CODE_OAUTH_TOKEN` in your shell**: it outranks the `/login` credential, so
every Claude session on the machine would switch to it.

A token file that exists but is rejected (401) **stops the run** with a clear message naming the
file (never the value). It never falls back silently. Validate the shape before the first call
(`^sk-ant-[A-Za-z0-9_-]+$` after trimming); a copied token with quotes or clipped only fails at
the first call otherwise (learning F-02).

Why a separate token instead of always the symlink: the judge then doesn't share the refreshing
credential file with your live sessions. If Claude Code refreshes the login during a judge call by
*replacing* the file, the new credentials would land in the deleted temp folder (risk F-04, not
observed).

## The prompt

System prompt (the judge's whole instructions):

```
You are a strict grader. You compare one documentation record, written by an analyst about a web
portal, with one ground-truth item about that portal, and answer one question.

Question: <question>
Answer pass when: <pass>
Answer fail when: <fail>
If the record does not clearly state it, answer fail. Answer unknown only when the record lacks the
information needed to decide at all.
Judge only what the record says; do not use outside knowledge to fill gaps.
Give a one-sentence reason first, then the verdict.

Examples, with the reason and verdict expected:
<example_1>
<item>…</item>
<record>…</record>
Reason: …
Verdict: pass
</example_1>
```

User message: exactly one item and one record, as delimited blocks:

```
<item>
term: OC
meaning on the portal: …
</item>

<record>
title: OC
definition: …
</record>
```

Always build probes and test calls through the same prompt builder: a hand-written probe that left
out the question got `unknown` ("the item has no stated criterion") and misled us (F-05).

## TypeScript sketch

```ts
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const STRIPPED = ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'CLAUDE_CODE_OAUTH_TOKEN'];

export async function callJudge(system: string, user: string, token?: string) {
  const configDir = mkdtempSync(join(tmpdir(), 'judge-cfg-'));
  const cwd = mkdtempSync(join(tmpdir(), 'judge-cwd-'));
  const env = { ...process.env, CLAUDE_CONFIG_DIR: configDir };
  for (const k of STRIPPED) delete env[k];
  if (token) env.CLAUDE_CODE_OAUTH_TOKEN = token;   // child only
  const args = ['-p', user, '--model', 'sonnet', '--system-prompt', system,
    '--tools', '', '--strict-mcp-config', '--no-session-persistence',
    '--output-format', 'stream-json', '--verbose', '--json-schema', JSON.stringify(VERDICT_SCHEMA)];
  try {
    const stdout = await run('claude', args, cwd, env, 120_000);   // spawn, collect stdout, kill on timeout
    return parseCallOutput(stdout);   // init event + result event's structured_output + usage + auth error
  } finally {
    rmSync(configDir, { recursive: true, force: true });
    rmSync(cwd, { recursive: true, force: true });
  }
}
```

Parse the stream line by line (JSON per line): the `system`/`init` event for provenance, the
`result` event for `structured_output`, `usage` and errors. A `401`/"Invalid bearer token" in the
result is a setup error (stop), not a `fail` verdict.

## Store with every verdict

`pair_id`, `verdict`, `reason`, the judge id and **version** (hash of question, pass, fail,
examples, model), the model id from the init event, the CLI version, tokens and duration. Then a
verdict can be read back and a judge version tied to its calibration.

## Alternatives

| Option | Pros | Cons |
|---|---|---|
| **CLI on subscription** (ours) | Same CLI and login the agents already use; no key; no SDK | Spawn per call; quota shared with your sessions |
| Messages API with an API key | Prompt caching of the few-shot prefix, batch API at half price, temperature control | Needs a key and separate billing; worth it when judges grow |
| Agent SDK | More control | Also needs an API key (subscription OAuth isn't accepted) |
| Another provider (cross-check) | Detects self-preference | Portal data goes to another company |

Judge calls spend the same usage quota as your working session and the agents: run evals one at a
time.
