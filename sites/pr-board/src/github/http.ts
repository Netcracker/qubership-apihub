// Shared by the GitHub clients. Everything under src/github/ runs in the scheduled build (Node) and in the page, so it
// must not use Node APIs.

export class GitHubError extends Error {
  // The HTTP status, 200 for a GraphQL error, or 0 when GitHub was not reached.
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'GitHubError';
    this.status = status;
  }
}

export type Fetch = (input: string, init: RequestInit) => Promise<Response>;
