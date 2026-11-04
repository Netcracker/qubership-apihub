// Runs in a zone far from UTC, so a return to UTC dates would fail: there, the local day and the UTC day differ.
// The imports below run before this line, but Node reads TZ when a date is used, so it still applies; the first
// assertion checks that.
process.env.TZ = 'Pacific/Auckland';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isCurrentSprint } from '../../src/model/derive.ts';

test('TABLE-28: a sprint is current from its start date to its last day, in the local calendar of the viewer', () => {
  const sprint = { title: 'S', startDate: '2026-10-28', duration: 14 };
  // 12:00 UTC on October 27 is already October 28 in Auckland (UTC+13).
  assert.equal(new Date(Date.parse('2026-10-27T12:00:00Z')).getDate(), 28, 'the zone is in effect');
  assert.equal(isCurrentSprint(sprint, Date.parse('2026-10-27T12:00:00Z')), true);
  assert.equal(isCurrentSprint(sprint, new Date(2026, 9, 28, 0, 1).getTime()), true);
  assert.equal(isCurrentSprint(sprint, new Date(2026, 10, 10, 23, 59).getTime()), true);
  assert.equal(isCurrentSprint(sprint, new Date(2026, 10, 11, 0, 1).getTime()), false);
  assert.equal(isCurrentSprint(sprint, new Date(2026, 9, 27, 23, 59).getTime()), false);
  assert.equal(isCurrentSprint({ ...sprint, startDate: '2026-12-25' }, new Date(2027, 0, 7, 12).getTime()), true, 'across a year');
  assert.equal(isCurrentSprint(null, Date.now()), false);
});
