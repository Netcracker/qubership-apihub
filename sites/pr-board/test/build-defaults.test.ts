import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBuildGroups, resolveBuildDefaults } from '../src/build-defaults.ts';
import { MAX_BOTS, parseBuildBots } from '../src/board/bots.ts';
import { OFFICIAL_REPO_GROUPS } from '../src/defaults.ts';

test('DATA-28: absent build variables use official defaults; explicit empty values clear them', () => {
  assert.deepEqual(resolveBuildDefaults({}), { groups: OFFICIAL_REPO_GROUPS, bots: [] });
  assert.deepEqual(resolveBuildDefaults({ PR_BOARD_GROUPS: '', PR_BOARD_BOTS: '' }), { groups: [], bots: [] });
  assert.deepEqual(resolveBuildDefaults({ PR_BOARD_GROUPS: '*Core: acme/widgets\nTools: acme/tools',
    PR_BOARD_BOTS: 'ci-bot, Deploy-Bot ci-bot' }), {
    groups: [{ name: 'Core', repos: ['acme/widgets'], isDefault: true }, { name: 'Tools', repos: ['acme/tools'] }],
    bots: ['ci-bot', 'Deploy-Bot'],
  });
});

test('DATA-28: malformed build values fail with their variable name, and oversized bot lists are rejected', () => {
  assert.throws(() => parseBuildGroups('Core: widgets'), /PR_BOARD_GROUPS: Line 1: "widgets" is not owner\/name/);
  assert.throws(() => resolveBuildDefaults({ PR_BOARD_GROUPS: 'not a group' }), /PR_BOARD_GROUPS:/);
  assert.throws(() => parseBuildBots('ci bot!'), /PR_BOARD_BOTS: "bot!" is not a GitHub login/);
  const limit = Array.from({ length: MAX_BOTS }, (_, index) => 'bot-' + index);
  assert.equal(parseBuildBots(limit.join(',')).length, MAX_BOTS);
  assert.throws(() => resolveBuildDefaults({ PR_BOARD_BOTS: [...limit, 'one-more'].join(',') }), /PR_BOARD_BOTS: at most 50/);
  assert.deepEqual(parseBuildGroups(' \n '), []);
  assert.deepEqual(parseBuildBots(' \n '), []);
});

test('DATA-2 DATA-28: mock development ignores team variables, including malformed ones', () => {
  assert.deepEqual(resolveBuildDefaults({ PR_BOARD_GROUPS: 'invalid', PR_BOARD_BOTS: 'invalid!' }, true), { groups: [], bots: [] });
});
