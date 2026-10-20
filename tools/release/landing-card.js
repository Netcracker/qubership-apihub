/**
 * The landing shows a release card per product version: sites/landing/src/content/releases/v<X>-<Y>-<Z>.md.
 * The Release finish dry run calls landingCardCheck() so that a missing card is noticed while it can still
 * be added to `release`. The check only reports; it never fails the run.
 */
const fs = require('node:fs')
const path = require('node:path')

const CARDS_DIR = 'sites/landing/src/content/releases'

/** The repository-relative path of the card for a product version such as "2.15.1". */
const landingCardPath = (version) => `${CARDS_DIR}/v${version.replaceAll('.', '-')}.md`

/**
 * Looks for the card of `version` under `root`. Returns `{ exists, file, warning, summary }`;
 * `warning` and `summary` are null when the card exists.
 */
function landingCardCheck(version, root = process.cwd()) {
  const file = landingCardPath(version)
  if (fs.existsSync(path.join(root, file))) return { exists: true, file, warning: null, summary: null }
  return {
    exists: false,
    file,
    warning:
      `The landing release card ${file} is missing for product version ${version}. ` +
      'Add it with a pull request into release before Release finish runs for real.',
    summary: `**Warning:** the landing release card \`${file}\` is missing. Add it with a pull request into \`release\`.`,
  }
}

module.exports = { CARDS_DIR, landingCardCheck, landingCardPath }
