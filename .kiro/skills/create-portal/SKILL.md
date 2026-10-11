---
name: create-portal
description: Builds a portal file (where to crawl, which environment, scope, limits, safety) with the user through plain questions and writes it to portals/<id>/portal.yaml. Use when the user wants to document a new site or a portal file is refused.
---

# Create a portal

Ask one question at a time and wait for the answer. Never guess an answer about safety or
compliance; leave it `null` and say so.

## Questions, in order

1. **Address**: the start URL (`base_url`). **Id**: a lowercase slug (`shop`, `client-portal`).
2. **Environment**: `production`, `staging` or `sandbox`. Production needs a `rate_limit`, and
   runs are refused until the compliance dates below are filled by a person.
3. **Compliance**: when did the user check robots.txt, and review the site's terms, and who
   reviewed them? (`compliance.robots_checked_on`, `terms_reviewed_on` as `YYYY-MM-DD`,
   `terms_reviewed_by`). Unknown → `null`.
4. **How far may a run go?** `max_action_class`: `read` (only look), `mutating`, `destructive`,
   `external-side-effect`. Default `read` on production. Personas can only narrow it.
5. **Scope**: which domains (`allowed_domains`, without `https://`), which paths (`allowed_paths`,
   globs, `"/*"` for all), and budgets: depth, states, actions per state, minutes, steps.
6. **Never touch**: `denylist` entries, each a rule id (`logout`, `delete`, `payment`, `purchase`,
   `contact_or_message`, `reveal_contact`, `submit_request`), `path:/glob/*` or `url:/glob?x=*`.
7. **robots.txt**: `respect` (default) or `ignore` (only for a site the user works on; checking its
   terms is then the user's responsibility).
8. **Login** (only if a persona will log in): the login page URL, how to find the user-name field,
   the password field and the submit button (by visible `label`, `placeholder`, or `css`; the button
   also by `role` + `name`), and how to recognise success (`url_not_matching` or a `text`).

## Template

```yaml
id: shop
base_url: https://shop.example.com/
environment: production
max_action_class: read
compliance:
  robots_checked_on: null     # YYYY-MM-DD, filled by a person
  terms_reviewed_on: null
  terms_reviewed_by: null
scope:
  allowed_domains: [shop.example.com]
  allowed_paths: ["/*"]
  external_link_policy: record   # links leaving the scope are recorded, not followed
  max_depth: 5
  max_states: 200
  max_actions_per_state: 30
  max_run_time_minutes: 60
  max_steps: 1000
denylist:
  - logout
  - delete
  - payment
  - path:/checkout/*
rate_limit:                      # required on production
  requests_per_second: 1
  max_concurrency: 1
  user_agent: "Beetle-Crawler/0.1 (contact: <the user's e-mail or team>)"
robots: respect
# login:                         # only for logged-in personas
#   url: /login
#   username: { label: "E-mail" }
#   password: { label: "Password" }
#   submit: { role: button, name: "Sign in" }
#   success: { url_not_matching: "/login" }
#   failure: { text: "Invalid" }
#   fields: { username: login, password: password }   # persona auth keys
```

## Check

Write `portals/<id>/portal.yaml`, then run `pnpm --dir apps/crawler portal:check <id>` and fix
every problem it names. The compliance dates stay `null` until the user fills them; tell them a
production run is refused until then.
