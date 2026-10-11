# Personas

One file per way of visiting a portal: `personas/<portal>/<id>.yaml`, sharing pieces from
`_mixins/`. Create one with the `create-persona` skill and check it with
`pnpm --dir apps/crawler portal:check <portal> <id>`. Credentials are references (`ref:NAME`)
whose values live in the local vault, never in these files.
