# Dashboard

Read-only view of what the crawler recorded and what the BA documented: portals, runs, screens
(states), actions and their safety class, the frontier and what was refused, forms, network call
shapes, decisions, evidence and screenshots, and the documentation records with review actions.

```sh
cd apps/dashboard
uv sync
uv run beetle-dashboard          # http://127.0.0.1:8765
```

It reads `data/` of this repository and never writes the store. Pick the environment in the header
(the store files under `data/db/`). Review buttons in Docs need a reviewer name:
`BEETLE_REVIEWER="<your name>" uv run beetle-dashboard`.
