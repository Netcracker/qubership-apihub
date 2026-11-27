import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanCommentText } from '../../src/model/comments.ts';

test('HTML comment markers are dropped from previews', () => {
  assert.equal(cleanCommentText('<!-- marker -->\n### AI review\n\nok'), '### AI review ok');
});
