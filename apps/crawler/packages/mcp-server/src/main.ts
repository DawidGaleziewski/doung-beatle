import { fileURLToPath } from 'node:url';
import { createBrowserRuntime } from './runtime/index.js';
import { main } from './server.js';

// packages/mcp-server/src -> repo root is five levels up.
const root =
  process.env.BEETLE_ROOT ?? fileURLToPath(new URL('../../../../..', import.meta.url));

main({
  root,
  environment: process.env.BEETLE_ENV ?? 'production',
  runtime: createBrowserRuntime(),
}).catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
