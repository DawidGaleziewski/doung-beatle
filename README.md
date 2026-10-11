# doung-beatle

Documents an existing web portal from the command line with Kiro: a crawler agent maps the portal
(or traces one process) in a real browser and records what it sees, a BA agent turns those
recordings into evidence-linked documentation, and a command exports it as an SRS folder.

This repository is generated. Do not change code here; when something goes wrong, ask Kiro to
report it (see Issues). Your own files (`portals/`, `personas/`, `issues/`, `data/`, `notes/`)
are never touched by an update.

## Install

Needs Node 22+, pnpm and Kiro CLI.

```sh
pnpm install
pnpm --dir apps/crawler/packages/crawler exec playwright install chromium
pnpm --dir apps/crawler test        # optional: unit tests, no network
```

## Start

```sh
kiro-cli chat --agent beetle
```

The `beetle` agent knows the workflow (`.kiro/steering/beetle.md`). Talk to it in plain words:

1. "Add the portal https://… as `shop`." It asks the questions and writes `portals/shop/portal.yaml`.
2. "Add a guest persona for shop." (or a logged-in one)
3. Logged in only: store each credential yourself, in your own terminal (hidden prompt):
   `pnpm --dir apps/crawler vault set shop SHOP_PASSWORD --env production`
4. "Map shop as guest." or "Trace 'buy a ticket' on shop as client, goal: reach the summary page."
5. "Document shop."
6. "Export the documentation of shop." The SRS folder lands in `data/exports/`.
7. Review records: `pnpm --dir apps/crawler docs:review --portal shop --key REQ-001 --rev 1 --action confirm --reviewer <you>`.

Every agent also works on its own: `kiro-cli chat --agent crawler` (then "map shop as guest"),
`kiro-cli chat --agent ba`, `kiro-cli chat --agent reporter`.

## Environment

`BEETLE_ENV` in `.kiro/settings/mcp.json` (default `production`) picks the store file
`data/db/<env>.sqlite`. Pass the same `--env` to the commands, or `export BEETLE_ENV=production`
in your shell.

## Issues

Say "report this: …" to the `beetle` agent (or run the `reporter` agent). It writes one file in
`issues/` in the shape of `issues/TEMPLATE.md`. Hand the `issues/` folder upstream; nothing else is
needed.

## Commands

All under `pnpm --dir apps/crawler`:

| Command | What it does |
| --- | --- |
| `portal:check <portal> [<persona>] [--env e]` | validate a portal (and persona) file |
| `vault set\|list\|delete\|check …` | store credentials by reference (run `vault` for help) |
| `docs:export <portal> [--env e] [--confirmed-only]` | write the SRS folder |
| `docs:audit [<portal>]` | integrity check of the documentation records |
| `docs:review …` | record a review decision |
| `portal:export <portal>` / `portal:delete <portal> --env e --operator <name>` | copy out / remove a portal's recorded data |
| `wireframes:build <portal>` | redraw the wireframes of recorded screens |
| `audit:pii` | look for unmasked personal data in the store |
