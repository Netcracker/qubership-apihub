/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { ChromeArg } from "../index.types"
import os from "os"

export const DOCKER_CONTAINER_NAME = "jest-chrome-container"
export const CHROME_PORT = 9222

const isWindows = os.platform() === "win32"

export function getHostCheckPort(){
    return process.env.HOST_CHECK_PORT ? Number(process.env.HOST_CHECK_PORT) : 9009
}
export function getConnectToChromeMaxAttempts(){
    return process.env.CONNECT_TO_CHROME_MAX_ATTEMPTS ? Number(process.env.CONNECT_TO_CHROME_MAX_ATTEMPTS) : 10
}
export function getConnectToChromeRetryIntervals(){
    return process.env.CONNECT_TO_CHROME_RETRY_INTERVAL ? Number(process.env.CONNECT_TO_CHROME_RETRY_INTERVAL) : 2000
}

export function getDockerBinary(){
    return process.env.DOCKER_BINARY ? process.env.DOCKER_BINARY : "podman"
}

export function getDockerBinaryCLIPath() {
    return `${isWindows ? "\"" : `'`}${getDockerBinary()}${isWindows ? "\"" : `'`}`
}

export function getNodeBinary(){
    return process.env.NODE_BINARY ? process.env.NODE_BINARY : "node"
}

export function getNodeBinaryCLIPath() {
    return `${isWindows ? "\"" : `'`}${getNodeBinary()}${isWindows ? "\"" : `'`}`
}

const isHostMachine = os.platform() === "win32"
const userDirectory = isHostMachine ? os.tmpdir() + "-" + Math.random() : "" // to avoid getting system browser

/**
 * https://www.browserless.io/docs/chrome-flags
 * https://www.chromium.org/developers/how-tos/run-chromium-with-flags/
 */
export const DEFAULT_CHROME_FLAGS: ChromeArg[] = [
    // Defaults from jest-environment-puppeteer: /node_modules/jest-environment-puppeteer/lib/env.js
    // (see also defaultArgs in /node_modules/puppeteer-core/lib/cjs/puppeteer/node/ChromeLauncher.js):
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "--enable-software-rasterizer",
    // Additional:
    "--disable-gpu",
    "--disable-gpu-compositing",
    "--disable-gpu-rasterization",
    "--remote-debugging-address=0.0.0.0",
    `--remote-debugging-port=${CHROME_PORT}`,
    "--disable-resize-lock=true",
    "--disable-background-networking",
    "--disable-client-side-phishing-detection",
    "--disable-default-apps",
    "--disable-extensions",
    "--disable-hang-monitor",
    "--disable-popup-blocking",
    "--disable-prompt-on-repost",
    "--disable-sync",
    "--disable-translate",
    "--enable-font-antialiasing",
    "--force-device-scale-factor=1",
    "--disable-accelerated-2d-canvas",
    "--font-render-hinting=none",
    "--no-first-run",
    "--safebrowsing-disable-auto-update",
    "--enable-automation",
    "--hide-scrollbars",
    "--mute-audio",
    "--force-color-profile=srgb",
    "--disable-dev-shm-usage",
    "--disable-component-update",
    "--no-default-browser-check",
    "--disable-search-engine-choice-screen",
    "--simulate-outdated-no-au=\"Tue, 31 Dec 2099 23:59:59 GMT\"",
    "--start-maximized",
    ...(userDirectory ? [`--user-data-dir=${userDirectory}` satisfies ChromeArg] : []),
    // Candidates for overriding:
    "--headless=true",
    "--window-size=1800,1000",
    // Under question:
    "--disable-ipc-flooding-protection",
    "--disable-gpu-sandbox",
    // "--js-flags=\"--max_old_space_size=4000 --max_semi_space_size=4000\"",
]
export const DEFAULT_PROTOCOL_TIMEOUT = 180_000

export const CONSOLE_PREFIX = "[Jest Chrome Environment]"

