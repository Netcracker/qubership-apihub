'use strict'
/**
 * The size limit of the AI review. A review of a huge diff costs much and finds little, so `review.js` stops before any
 * model call when the pull request is above `limits.reviewMaxLines` changed lines or `limits.reviewMaxFiles` files.
 * Lock files are generated and not counted. All functions here are pure.
 */

/** Files whose changes nobody reads; matched on the basename. */
const LOCK_FILES = ['pnpm-lock.yaml', 'package-lock.json', 'yarn.lock', 'go.sum', 'go.work.sum']

const basename = (filename) => String(filename).split('/').pop()

/**
 * The size of a diff without the lock files.
 *
 * @param {Array<{ filename: string, additions?: number, deletions?: number }>} files the answer of `listPullFiles`
 * @returns {{ lines: number, files: number }} changed lines (additions plus deletions) and the count of files
 */
function measureDiff(files) {
  const counted = files.filter((file) => !LOCK_FILES.includes(basename(file.filename)))
  const lines = counted.reduce((sum, file) => sum + (file.additions ?? 0) + (file.deletions ?? 0), 0)
  return { lines, files: counted.length }
}

/**
 * Whether the diff is above a limit. A diff exactly at a limit is allowed.
 *
 * @param {{ lines: number, files: number }} size
 * @param {{ reviewMaxLines: number, reviewMaxFiles: number }} limits `config.limits`
 */
const exceedsLimit = (size, limits) => size.lines > limits.reviewMaxLines || size.files > limits.reviewMaxFiles

/**
 * Whether the review must be skipped for the size of the diff. `force` (from `/agent review force`) never skips.
 *
 * @returns {{ size: { lines: number, files: number }, tooBig: boolean, skip: boolean }}
 */
function checkSize(files, limits, force = false) {
  const size = measureDiff(files)
  const tooBig = exceedsLimit(size, limits)
  return { size, tooBig, skip: tooBig && !force }
}

/** The human part of the state comment of a review that was skipped for its size. */
function renderSkip({ headSha, size, limits, runUrl }) {
  return [
    `### AI review of ${headSha.slice(0, 7)} skipped`,
    '',
    `The diff has ${size.lines} changed lines in ${size.files} files (lock files not counted), above the limit of ` +
    `${limits.reviewMaxLines} lines or ${limits.reviewMaxFiles} files (AGENT_REVIEW_MAX_LINES, ` +
    'AGENT_REVIEW_MAX_FILES). An AI review of a diff this large costs much and finds little. ' +
    'Comment `/agent review force` to review it anyway.',
    '',
    `<sub>[Run](${runUrl})</sub>`,
  ].join('\n')
}

module.exports = { LOCK_FILES, measureDiff, exceedsLimit, checkSize, renderSkip }
