const { TEST_TIMEOUT, HEADLESS_MODE, DEVTOOLS, SCREEN_WIDTH, SCREEN_HEIGHT } = require('./constants.cjs')

module.exports = {
  headless: HEADLESS_MODE,
  // slowMo: 500,
  devtools: DEVTOOLS,
  args: [
    `--window-size=${SCREEN_WIDTH},${SCREEN_HEIGHT}`,
    '--max-active-webgl-contexts=100',
  ],
  protocolTimeout: Math.round(1.1 * TEST_TIMEOUT), /* connection is longer than test timeout */
}
