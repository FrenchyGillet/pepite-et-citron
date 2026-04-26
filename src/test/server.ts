import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * MSW server shared across all test files.
 *
 * Base handlers (handlers.ts) are loaded as persistent defaults.
 * Tests override specific endpoints with server.use() for isolated
 * scenarios; server.resetHandlers() in afterEach() restores the defaults.
 */
export const server = setupServer(...handlers);
