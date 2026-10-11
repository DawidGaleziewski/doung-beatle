---
name: create-persona
description: Builds a persona file (a way of visiting a portal, anonymous or logged in) with the user through plain questions and writes it to personas/<portal>/<id>.yaml. Use when the user wants a new persona or a persona file is refused.
---

# Create a persona

A persona says who visits the portal and how far they may go. Ask one question at a time, in the
user's words, and wait for the answer.

## Questions, in order

1. **Which portal?** `portals/<portal>/portal.yaml` must exist; if not, use `create-portal` first.
2. **Logged in or anonymous?**
   - Anonymous: `extends: ["../_mixins/anonymous-base.yaml"]`. No credentials.
   - Logged in: the portal file needs a `login:` section (see `create-portal`). Ask what the portal
     calls each login field, then pick a reference name per field: `ref:NAME`, letters, digits and
     underscore only (`ref:SHOP_LOGIN`, `ref:SHOP_PASSWORD`). The persona holds only these names:
     `auth: { login: ref:SHOP_LOGIN, password: ref:SHOP_PASSWORD }`.
     Never ask for, repeat or accept a password, token or key in chat.
3. **How far may this persona go?** (`max_action_class`, lowest to highest)
   - `read`: only look at pages.
   - `mutating`: also change things (fill and save forms, edit own data).
   - `destructive`: also delete or cancel things.
   - `external-side-effect`: also do things that reach outside the portal (send, pay, submit).
   Default `read`. It can only narrow the portal's own limit, never widen it.
4. **Locale or viewport?** Optional; the mixin gives `pl-PL` and 1366x768.
5. **Trace inputs?** Optional, for tracing forms: `trace_inputs:` maps a field label, verbatim as
   the portal shows it, to a synthetic value (`Kod pocztowy: 00-950`). Never real personal data;
   e-mails only on `.test`, `.example` or `.invalid`.
6. **Short id**: lowercase slug (`guest`, `client`), unique within the portal.

## Write and check

Write `personas/<portal>/<id>.yaml`:

```yaml
id: client
extends: ["../_mixins/anonymous-base.yaml"]   # anonymous only
auth: { login: ref:SHOP_LOGIN, password: ref:SHOP_PASSWORD }   # logged in only
max_action_class: read
```

Run `pnpm --dir apps/crawler portal:check <portal> <id>` and fix what it names.

For a logged-in persona, tell the user to store each reference in their own terminal (hidden
prompt): `pnpm --dir apps/crawler vault set <portal> <REF> --env <environment>`, then check with
`pnpm --dir apps/crawler vault check <portal> <id> --env <environment>`.
