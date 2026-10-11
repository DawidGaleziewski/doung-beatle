import type { EvidenceStore, Logger } from '@beetle/core';
import type { PwTraceMode } from '@beetle/trace';
import type { DecisionLog, OpenedDb, BeetleDb, Tracer } from '@beetle/store';
import type { captureVisuals } from '@beetle/crawler';

/**
 * What the BA server's services need: the store and the evidence files, nothing that can reach a
 * portal. A `ServerContext` satisfies it, so tests may pass either.
 */
export interface BaContext {
  db: BeetleDb;
  raw: OpenedDb['raw'];
  evidence: EvidenceStore;
  logger: Logger;
}

/** One running beetle server: written on the runs it drives (spec 010 F-14). */
export interface RunOwner {
  /** UUIDv7, new on every server start. */
  id: string;
  pid: number;
}

/** Everything a service needs. Run-scoped browser state lives elsewhere (session registry). */
export interface ServerContext {
  /** This server, when it shares the store with others; absent means "every running run is mine". */
  owner?: RunOwner;
  db: BeetleDb;
  raw: OpenedDb['raw'];
  evidence: EvidenceStore;
  decisions: DecisionLog;
  logger: Logger;
  /** Observability trace (spec 005); never read by a service to decide anything. */
  tracer: Tracer;
  /** `all` = record Playwright traces even on production portals (`BEETLE_PW_TRACE=1`). */
  pwTrace: PwTraceMode;
  /** Repo root holding `portals/` and `personas/`. */
  root: string;
  /** Environment whose database file this server records into (`data/db/<env>.sqlite`). */
  dbEnvironment: string;
  /** Used only for robots.txt (spec 002 FR-001); injectable so tests never reach the network. */
  fetch?: typeof fetch;
  /** Vault key file (spec 009); default `BEETLE_VAULT_KEY_FILE` or `~/.config/beetle/vault.key`. */
  vaultKeyPath?: string;
  /** Screenshot + layout of a new state (spec 008); injectable so tests can force a failure. */
  captureVisuals?: typeof captureVisuals;
}
