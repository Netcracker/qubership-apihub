// The fictional cast of the mocks. Fixtures, tests, and docs use only these names.

// The mock repository, used whenever PR_BOARD_REPO is not set in development.
export const DEV_REPOSITORY = 'acme/widgets';
export const REPO_URL = 'https://github.com/' + DEV_REPOSITORY;
// The second mock repository, served only by the scenarios with several repositories.
export const GADGETS_REPOSITORY = 'acme/gadgets';
// A repository whose organization blocks the token, as SAML enforcement does.
export const FORBIDDEN_REPOSITORY = 'acme/private';

export const PEOPLE = [
  'anna-dev', 'boris-k', 'chen-li', 'dara-ops', 'emil-qa', 'farah-ui', 'gleb-be', 'hana-docs',
  // Edge cases: a login too long for its column, and one whose avatar fails to load.
  'a-very-long-github-login-that-keeps-going', 'new-contributor-42',
];

// GitHub marks dependabot as a bot; acme-release-bot is a service account that GitHub treats as a regular user.
export const BOTS = ['dependabot', 'acme-release-bot'];

// The token owner the GraphQL mock reports on Refresh (DATA-26).
export const DEV_VIEWER = 'boris-k';

export const TEAMS = ['widgets-backend', 'widgets-maintainers'];
