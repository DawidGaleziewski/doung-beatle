import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import type { PwTraceMode, TraceLevel } from '@beetle/trace';

const LEVELS: readonly TraceLevel[] = ['off', 'standard', 'verbose'];

/** `BEETLE_TRACE_LEVEL` (default `standard`) and `BEETLE_PW_TRACE=1` (research §10, §13). */
export function traceConfigFromEnv(env: NodeJS.ProcessEnv): {
  level: TraceLevel;
  pwTrace: PwTraceMode;
  invalidLevel?: string;
} {
  const raw = env.BEETLE_TRACE_LEVEL?.trim().toLowerCase();
  const valid = LEVELS.find((l) => l === raw);
  return {
    level: valid ?? 'standard',
    pwTrace: env.BEETLE_PW_TRACE === '1' ? 'all' : 'non_production',
    ...(raw && !valid ? { invalidLevel: raw } : {}),
  };
}

/** `@beetle/mcp-server` version plus the git short SHA when the repo is available. */
export function serverVersion(root: string): string {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
    version: string;
  };
  try {
    const sha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 2000,
    }).trim();
    return sha ? `${pkg.version}+${sha}` : pkg.version;
  } catch {
    return pkg.version;
  }
}
