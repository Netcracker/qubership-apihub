// The mock server's notion of "now". Browser and screenshot tests pin it with PR_BOARD_MOCK_NOW (an ISO time), so
// every scenario returns the same ages and dates on every run.

const MOCK_NOW_VARIABLE = 'PR_BOARD_MOCK_NOW';
const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

export function mockClock(env: Record<string, string | undefined> = process.env): () => number {
  const value = env[MOCK_NOW_VARIABLE];
  if (!value) return Date.now;
  const fixed = Date.parse(value);
  if (!ISO_TIME.test(value) || Number.isNaN(fixed)) {
    throw new Error(MOCK_NOW_VARIABLE + ' must be an ISO time such as 2026-10-28T12:00:00Z, not "' + value + '".');
  }
  return () => fixed;
}
