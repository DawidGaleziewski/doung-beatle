#!/usr/bin/env bash
# One isolated Claude judge call from the CLI, on a subscription login (no API key).
# Usage: judge-call.sh <system-prompt-file> <user-message-file>
# Login: JUDGE_TOKEN_FILE (default ~/.config/judge/judge-token, one line from `claude setup-token`,
# mode 600, no quotes), else your Claude login, linked. The token reaches this child process only.
set -euo pipefail

system=$(cat "$1")
user=$(cat "$2")
token_file=${JUDGE_TOKEN_FILE:-$HOME/.config/judge/judge-token}

cfg=$(mktemp -d -t judge-cfg-XXXX)   # fresh config: none of your CLAUDE.md, rules, memory, skills, agents, hooks, plugins
cwd=$(mktemp -d -t judge-cwd-XXXX)   # fresh cwd: no project CLAUDE.md, .mcp.json or settings
trap 'rm -rf "$cfg" "$cwd"' EXIT

token=""
if [[ -f "$token_file" ]]; then
  token=$(tr -d '[:space:]' < "$token_file")
  [[ "$token" =~ ^sk-ant-[A-Za-z0-9_-]+$ ]] || { echo "token in $token_file is malformed (quotes? clipped?)" >&2; exit 2; }
else
  ln -s "$HOME/.claude/.credentials.json" "$cfg/.credentials.json"
fi

schema='{"type":"object","properties":{"reason":{"type":"string"},"verdict":{"enum":["pass","fail","unknown"]}},"required":["reason","verdict"]}'

cd "$cwd"
env -u ANTHROPIC_API_KEY -u ANTHROPIC_AUTH_TOKEN -u CLAUDE_CODE_OAUTH_TOKEN \
  CLAUDE_CONFIG_DIR="$cfg" ${token:+CLAUDE_CODE_OAUTH_TOKEN="$token"} \
  claude -p "$user" \
    --model sonnet \
    --system-prompt "$system" \
    --tools "" \
    --strict-mcp-config \
    --no-session-persistence \
    --output-format stream-json --verbose \
    --json-schema "$schema"
# Output: one JSON event per line. The "system"/"init" event lists model, tools (expect only
# StructuredOutput), MCP servers (expect none), plugins, skills, agents: check isolation there.
# The "result" event holds structured_output = {reason, verdict} and usage (expect < 2000 input
# tokens). A 401 / "Invalid bearer token" in it is a setup error, not a fail verdict.
