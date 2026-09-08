const ENABLED = true;

export const diag = {
  log: (...args: unknown[]) => {
    if (ENABLED) console.log('[AUTH-DIAG]', ...args);
  },
  error: (...args: unknown[]) => {
    if (ENABLED) console.warn('[AUTH-DIAG]', ...args);
  },
};