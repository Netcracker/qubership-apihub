// Vite plugin for the dev server: mocked /prs.json, GraphQL, REST, and avatars from scenarios, or live GitHub data in
// --mode live. It also injects the DEV panel. None of this runs in `vite build`.

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import type { Repository } from '../src/repository.ts';
import type { DevConfig } from '../src/types.ts';
import { AVATAR_PATH, avatarSvg } from './avatars.ts';
import { mockClock } from './clock.ts';
import { JSON_TYPE, readBody, respondMock, send } from './http.ts';
import { REFRESH_SCENARIOS } from './scenarios/refresh.ts';
import { REPORT_SCENARIOS } from './scenarios/report.ts';
import { restComments } from './scenarios/rest.ts';
import type { GraphqlVariables } from './scenarios/types.ts';

export const LIVE_MODE = 'live';

const REST_PREFIX = '/__dev/rest';

// The two REST lists the comments panel reads, as GitHub names them.
const REST_ROUTE = /^\/repos\/([^/]+\/[^/]+)\/(?:issues\/(\d+)\/comments|pulls\/(\d+)\/reviews)$/;

// live comes from the same mode check as the repositories in vite.config.ts, so the two never disagree.
export function devMocks({ live }: { repositories: Repository[]; live: boolean }): Plugin {
  const state = { report: REPORT_SCENARIOS[0].id, refresh: REFRESH_SCENARIOS[0].id };
  // Mock answers use a fixed clock in browser tests.
  const now = mockClock();

  async function serveReport(res: ServerResponse) {
    if (!live) {
      const scenario = REPORT_SCENARIOS.find((s) => s.id === state.report) || REPORT_SCENARIOS[0];
      await respondMock(res, scenario.respond(now()));
      return;
    }
    send(res, 404, 'Live mode uses the personal token entered on the page.');
  }

  async function serveGraphql(req: IncomingMessage, res: ServerResponse) {
    const request: { variables: GraphqlVariables } = JSON.parse(await readBody(req));
    const scenario = REFRESH_SCENARIOS.find((s) => s.id === state.refresh) || REFRESH_SCENARIOS[0];
    await respondMock(res, scenario.respond(request.variables, now()));
  }

  function serveRest(res: ServerResponse, pathname: string) {
    const match = REST_ROUTE.exec(pathname.slice(REST_PREFIX.length));
    const comments = !!match && match[2] !== undefined;
    const found = match ? restComments(match[1], Number(comments ? match[2] : match[3]), now()) : null;
    if (!match || !found) return send(res, 404, JSON.stringify({ message: 'Not Found' }), JSON_TYPE);
    return send(res, 200, JSON.stringify(comments ? found.comments : found.reviews), JSON_TYPE);
  }

  // Generated avatars for the fictional cast; anything under missing/ is a broken image on purpose.
  function serveAvatar(res: ServerResponse, pathname: string) {
    const file = decodeURIComponent(pathname.slice(AVATAR_PATH.length));
    if (file.startsWith('missing/') || !file.endsWith('.svg')) return send(res, 404, 'Not found');
    return send(res, 200, avatarSvg(file.slice(0, -'.svg'.length)), 'image/svg+xml');
  }

  function devState() {
    return JSON.stringify({
      live,
      report: state.report,
      refresh: state.refresh,
      reportScenarios: REPORT_SCENARIOS.map(({ id, label }) => ({ id, label })),
      refreshScenarios: REFRESH_SCENARIOS.map(({ id, label }) => ({ id, label })),
    });
  }

  async function route(req: IncomingMessage, res: ServerResponse, next: () => void) {
    const { pathname } = new URL(req.url || '/', 'http://localhost');
    if (pathname === '/prs.json') return serveReport(res);
    if (pathname === '/__dev/graphql' && req.method === 'POST') return serveGraphql(req, res);
    if (pathname.startsWith(REST_PREFIX + '/') && req.method === 'GET') return serveRest(res, pathname);
    if (pathname.startsWith(AVATAR_PATH)) return serveAvatar(res, pathname);
    if (pathname === '/__dev/state' && req.method === 'GET') return send(res, 200, devState(), JSON_TYPE);
    if (pathname === '/__dev/state' && req.method === 'POST') {
      const update: { report?: string; refresh?: string } = JSON.parse(await readBody(req));
      if (REPORT_SCENARIOS.some((s) => s.id === update.report)) state.report = update.report!;
      if (REFRESH_SCENARIOS.some((s) => s.id === update.refresh)) state.refresh = update.refresh!;
      console.log('Scenario: report=' + state.report + ', refresh=' + state.refresh);
      return send(res, 200, devState(), JSON_TYPE);
    }
    return next();
  }

  return {
    name: 'apihub-pr-board-dev-mocks',
    apply: 'serve',
    configResolved() {
      console.log(live ? 'Data: live GitHub API; enter your personal token on the page' : 'Data: mock scenarios (switch them in the DEV panel)');
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        route(req, res, next).catch((error: Error) => {
          console.error(error);
          if (!res.headersSent) send(res, 500, 'Dev server error: ' + error.message);
        });
      });
    },
    transformIndexHtml() {
      if (live) return [];
      const config: DevConfig = { graphqlUrl: '/__dev/graphql', restUrl: REST_PREFIX };
      return [
        { tag: 'script', children: 'window.PR_BOARD_DEV = ' + JSON.stringify(config) + ';', injectTo: 'head' as const },
        { tag: 'script', attrs: { type: 'module', src: '/dev/panel.ts' }, injectTo: 'body' as const },
      ];
    },
  };
}
