// The shape of prs.json and of the rows the board derives from it.

// The login GitHub shows for a deleted account.
export const GHOST_LOGIN = 'ghost';

export const CI_STATES = ['passing', 'failing', 'running', 'none'] as const;
export type CiState = typeof CI_STATES[number];
export const REVIEW_STATES = ['approved', 'changes_requested', 'none'] as const;
export type ReviewState = typeof REVIEW_STATES[number];
export const MERGE_STATES = ['clean', 'conflicts', 'unknown'] as const;
export type MergeState = typeof MERGE_STATES[number];
export type AreaId = 'be' | 'fe';

export interface Actor {
  login: string;
  avatarUrl: string | null;
  bot: boolean;
}

export interface Reviewer extends Actor {
  // A latestOpinionatedReviews state: APPROVED, CHANGES_REQUESTED, or DISMISSED.
  state: string;
  at: string | null;
}

export interface RequestedReviewer extends Actor {
  team: boolean;
}

export interface Label {
  name: string;
  // Six hex digits without #, or null when GitHub sent something else.
  color: string | null;
  description: string;
}

export interface FailedCheck {
  name: string;
  workflow: string | null;
  // Lowercased CheckRun conclusion or StatusContext state, such as failure or timed_out.
  conclusion: string;
  url: string | null;
  description: string;
}

export interface Checks {
  failed: FailedCheck[];
  total: number;
  // False when only the first page of checks was read.
  complete: boolean;
}

// GitHub's color names for issue types and project options, lowercased; the page maps each to a theme token.
export const NAMED_COLORS = ['gray', 'blue', 'green', 'yellow', 'orange', 'red', 'pink', 'purple'] as const;
export type NamedColor = typeof NAMED_COLORS[number];

export interface Issue {
  number: number | null;
  title: string;
  url: string;
  // Null where the organization has no issue types, or in a prs.json written before they were collected.
  type: { name: string; color: NamedColor | null } | null;
  labels: Label[];
  // The GitHub Projects fields (DATA-25); null when no project sets them or the token cannot read projects.
  priority: { name: string; color: NamedColor | null } | null;
  estimate: number | null;
  sprint: Sprint | null;
}

export interface Sprint {
  title: string;
  // YYYY-MM-DD.
  startDate: string;
  // In days.
  duration: number;
}

export interface Comment {
  at: string;
  body: string;
  url: string | null;
  author: Actor | null;
  truncated: boolean;
}

export interface PullRequest {
  // owner/name; empty only when a broken prs.json left it unknown.
  repo: string;
  number: number;
  title: string;
  url: string;
  draft: boolean;
  base: string;
  author: Actor | null;
  assignees: Actor[];
  createdAt: string;
  updatedAt: string;
  ci: CiState;
  // Null unless CI is failing, or when the rollup had no check details.
  checks: Checks | null;
  review: ReviewState;
  reviewers: Reviewer[];
  requestedReviewers: RequestedReviewer[];
  labels: Label[];
  mergeable: MergeState;
  issues: Issue[];
  // Null when the token cannot read project membership.
  projects: string[] | null;
  // Newest first.
  comments: Comment[];
  // Set only on dev corner cases.
  example?: boolean;
  // What the corner case shows, under the title (TABLE-6).
  exampleNote?: string;
}

export interface Report {
  // The token owner, on live loads only (DATA-26).
  viewer?: Actor;
  // owner/name of every repository the report covers.
  repos: string[];
  generatedAt: string;
  runUrl?: string | null;
  warnings: string[];
  prs: PullRequest[];
}

export interface DerivedPullRequest extends PullRequest {
  latestComment: Comment | null;
  areas: AreaId[];
  authorKey: string;
  bot: boolean;
  ageDays: number;
  // Open longer than the stale limit in the viewer's rules.
  stale: boolean;
  // A linked issue is in the sprint that runs now (TABLE-28).
  inCurrentSprint: boolean;
  // The viewer's review is requested, or requested again after an earlier one (RULE-12).
  myReview: 'requested' | 'again' | null;
  attention: string[];
  commentText: string;
  searchText: string;
  // The viewer's note, lowercased, for note: (NOTE-7); absent without a note.
  noteText?: string;
}

// The dev server injects this as window.PR_BOARD_DEV to point the page at its GraphQL and REST mocks.
export interface DevConfig {
  graphqlUrl: string;
  restUrl: string;
}

declare global {
  interface Window {
    PR_BOARD_DEV?: DevConfig;
  }
}
