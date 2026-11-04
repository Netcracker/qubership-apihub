// How mock scenarios answer the dev server.

import type { QueryVariables } from '../../src/github/query.ts';

// How the mock answers: an HTTP status and body, optionally after a delay, or a dropped connection.
export type MockResponse =
  | { status: number; body: string; delayMs?: number; destroy?: false }
  | { destroy: true; delayMs?: number };

// What the client sends; tests may leave out the switches, which then count as on.
export type GraphqlVariables = Pick<QueryVariables, 'owner' | 'repo' | 'first' | 'after'> & Partial<QueryVariables>;

export interface ReportScenario {
  id: string;
  label: string;
  respond: (now: number) => MockResponse;
}

export interface RefreshScenario {
  id: string;
  label: string;
  respond: (variables: GraphqlVariables, now: number) => MockResponse;
}
