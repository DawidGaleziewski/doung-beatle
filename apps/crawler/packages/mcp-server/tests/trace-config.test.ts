import { describe, expect, it } from 'vitest';
import { serverVersion, traceConfigFromEnv } from '../src/trace-config.js';

describe('traceConfigFromEnv', () => {
  it('defaults to standard and non_production', () => {
    expect(traceConfigFromEnv({})).toEqual({ level: 'standard', pwTrace: 'non_production' });
  });
  it('reads BEETLE_TRACE_LEVEL and BEETLE_PW_TRACE=1', () => {
    expect(
      traceConfigFromEnv({ BEETLE_TRACE_LEVEL: 'Verbose', BEETLE_PW_TRACE: '1' }),
    ).toEqual({
      level: 'verbose',
      pwTrace: 'all',
    });
    expect(
      traceConfigFromEnv({ BEETLE_TRACE_LEVEL: 'off', BEETLE_PW_TRACE: 'true' }),
    ).toEqual({
      level: 'off',
      pwTrace: 'non_production',
    });
  });
  it('falls back to standard on an unknown level and reports it', () => {
    expect(traceConfigFromEnv({ BEETLE_TRACE_LEVEL: 'debug' })).toEqual({
      level: 'standard',
      pwTrace: 'non_production',
      invalidLevel: 'debug',
    });
  });
});

describe('serverVersion', () => {
  it('is the package version, with a git SHA when available', () => {
    expect(serverVersion(process.cwd())).toMatch(/^0\.0\.0(\+[0-9a-f]{4,})?$/);
    expect(serverVersion('/nonexistent-dir-for-test')).toBe('0.0.0');
  });
});
