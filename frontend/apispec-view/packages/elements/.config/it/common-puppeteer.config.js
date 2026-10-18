const { TEST_TIMEOUT, HEADLESS_MODE, DEVTOOLS, SCREEN_WIDTH, SCREEN_HEIGHT } = require('./constants')

/**
 * @type {{args?: string[], headless?: boolean, protocolTimeout?: number, defaultViewport?: Viewport, slowMo?: boolean, devtools?: boolean, and_other }}
 *
 * @see qubership-apihub-jest-chrome-in-docker-environment readme
 * @see https://pptr.dev/api/puppeteer.browserlaunchargumentoptions/
 * @see https://pptr.dev/api/puppeteer.browserconnectoptions
 */
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
