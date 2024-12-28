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

import path from "path"
import fs from "fs"
import os from "os"
import findNodeModules from "find-node-modules"

import colors from "colors";
import type { ChromeArg, JestPuppeteerConfig } from "../index.types"
import { CONSOLE_PREFIX, DEFAULT_CHROME_FLAGS, DEFAULT_PROTOCOL_TIMEOUT } from "./defaults"

const {bgYellow, black, yellow} = colors;

let puppeteerConfig: JestPuppeteerConfig | undefined = undefined

function initJestPuppeteerConfigPath() {
    if (process.env.JEST_PUPPETEER_CONFIG) {
        return;
    }
    const nodeModulePaths = findNodeModules({relative: false});
    const rootJestPuppeteerConfigPath = path.join(nodeModulePaths[0], "../", "jest-puppeteer.config.cjs");
    if (fs.existsSync(rootJestPuppeteerConfigPath)) {
        process.env.JEST_PUPPETEER_CONFIG = rootJestPuppeteerConfigPath;
    } else {
        process.env.JEST_PUPPETEER_CONFIG = path.join(__dirname, "../", "jest-puppeteer.config.cjs");
    }
    console.log(black(bgYellow(`JEST_PUPPETEER_CONFIG was not set. Default value ${process.env.JEST_PUPPETEER_CONFIG} will be used.`)))
}

function setConnectViewport(mergedConfig: JestPuppeteerConfig) {
    const windowSize = mergedConfig.connect.args.find(arg => arg.startsWith("--window-size"))
    const size = windowSize?.split("=")?.[1]?.split(",")?.map(v => Number(v)) ?? [1800, 1000]
    mergedConfig.connect.defaultViewport = {
        width: size[0],
        height: size[1]
    };
    /* 'args' is custom property for BrowserConnectOptions  */
    mergedConfig.connect.args = mergedConfig.connect.args.filter(arg => !arg.startsWith("--window-size"));
}

function setAutoOpenDevtoolsForTabsFromLaunch(mergedConfig: JestPuppeteerConfig) {
    const hasAlready = mergedConfig.connect.args.some(arg => arg.startsWith("--auto-open-devtools-for-tabs"));
    if (!hasAlready && mergedConfig?.launch?.devtools) {
        mergedConfig.connect.args.push("--auto-open-devtools-for-tabs")
    }
}

function setSowMoFromLaunch(mergedConfig: JestPuppeteerConfig) {
    if (mergedConfig?.launch?.slowMo !== undefined) {
        mergedConfig.connect.slowMo = mergedConfig?.launch?.slowMo
    }
}

function setProtocolTimeout(mergedConfig: JestPuppeteerConfig) {
    mergedConfig.connect.protocolTimeout = mergedConfig?.launch?.protocolTimeout ?? DEFAULT_PROTOCOL_TIMEOUT
}

function setChromeArgs(mergedConfig: JestPuppeteerConfig, targetProperty: "connect" | "launch") {
    console.log(black(bgYellow(`${CONSOLE_PREFIX} Default chrome arguments`)))
    console.log(DEFAULT_CHROME_FLAGS, "\n")

    const customFlags = [...(mergedConfig?.launch?.args ?? [])] ?? []
    console.log(black(bgYellow(`${CONSOLE_PREFIX} Custom chrome arguments`)))
    console.log(customFlags, "\n")

    let flags: ChromeArg[] = [...DEFAULT_CHROME_FLAGS]
    const overrides = Object.fromEntries(customFlags.map(f => {
        const split: (string | undefined)[] = f.split(/=(.*)/s);
        if (split.length === 1) {
            split.push(undefined)
        }
        return split;
    }));

    if (mergedConfig?.launch?.headless !== undefined) {
        flags = flags.filter(v => !v.startsWith("--headless")) // remove from flags to be add later according to headless property
        overrides["--headless"] = mergedConfig.launch.headless
    }
    // override values in format --aaa=bbb
    flags = flags.map(f => {
        const [k, v] = f.split(/=(.*)/s)
        if (!(k in overrides)) {
            return f;
        }
        const res = v === undefined ? k : `${k}=${overrides[k]}`;
        delete overrides[k]
        return res as ChromeArg
    })
    // override values in formats --enable-aaa/--disable-aaa
    flags = flags.map(f => {
        const [, k1] = f.split("--disable-")
        if (k1 && (`--enable-${k1}` in overrides)) {
            delete overrides[`--enable-${k1}`]
            return `--enable-${k1}` satisfies ChromeArg
        }
        const [, k2] = f.split("--enable-")
        if (k2 && (`--disable-${k2}` in overrides)) {
            delete overrides[`--disable-${k2}`]
            return `--disable-${k2}` satisfies ChromeArg
        }
        return f
    })
    // todo: if we need to remove some values from default config then support an ability to override entire config (using additional option like 'replace' against of 'merge')
    for (const [k, value] of Object.entries(overrides)) {
        const key = k as ChromeArg;
        flags.push(value === undefined ? key : `${key}=${overrides[k]}`)
    }

    // remove invalid headless flags
    const headlessArg: string[] | undefined = flags.find(f => f.trim().startsWith("--headless"))?.split("=");
    const headless = (["shell", "new", "true"] as any).includes(headlessArg?.[1])
    if (!headless) {
        flags = flags.flatMap(f => f.startsWith("--headless") ? [] : [f]) // remove from flags if not-headless
    }

    let mergedConfigElement = mergedConfig[targetProperty]
    mergedConfig[targetProperty] = mergedConfigElement ?? {}
    mergedConfig[targetProperty].args = flags;
}

function writeJestPuppeteerConfigToFile(path: string, config: JestPuppeteerConfig) {
    fs.writeFileSync(path, "const config = " + JSON.stringify(config, null, 2) + "; module.exports = config;")
}

function saveMergedPuppeteerConfig(mergedConfig: JestPuppeteerConfig) {
    let tempDir = fs.mkdtempSync(fs.realpathSync(os.tmpdir()) + path.sep);
    const mergedConfigPath = path.resolve(tempDir, "merged-jest-puppeteer-config.js")
    writeJestPuppeteerConfigToFile(mergedConfigPath, mergedConfig)
    console.log(yellow(`${CONSOLE_PREFIX} Merged puppeteer config is saved to ${mergedConfigPath}`))
    process.env.JEST_PUPPETEER_CONFIG = mergedConfigPath
}

export async function initPuppeteerWithChromeInDockerConfig(): Promise<JestPuppeteerConfig> {
    if (!puppeteerConfig) {
        initJestPuppeteerConfigPath()
    }
    const mergedConfig: JestPuppeteerConfig = {
        launch: JSON.parse(JSON.stringify( //
            require(path.resolve(process.env.JEST_PUPPETEER_CONFIG!))
        )),
        connect: {
            args: [],
            browserWSEndpoint: "NOT_INITIALIZED_YET_SHOULD_VE_SET_AFTER_CHROME_IS_STARTED"
        }
    }
    setChromeArgs(mergedConfig, "connect")
    setAutoOpenDevtoolsForTabsFromLaunch(mergedConfig)
    setSowMoFromLaunch(mergedConfig)
    setProtocolTimeout(mergedConfig)
    setConnectViewport(mergedConfig);
    // @ts-ignore
    delete mergedConfig["launch"]
    saveMergedPuppeteerConfig(mergedConfig)
    puppeteerConfig = mergedConfig
    return puppeteerConfig
}

export async function initPuppeteerWithLocalChromeConfig() {
    if (!puppeteerConfig) {
        initJestPuppeteerConfigPath()
    }
    const mergedConfig: JestPuppeteerConfig = {
        launch: JSON.parse(JSON.stringify( //
            require(path.resolve(process.env.JEST_PUPPETEER_CONFIG!))
        )),
        connect: {
            args: [],
            browserWSEndpoint: "NOT_INITIALIZED_YET_SHOULD_VE_SET_AFTER_CHROME_IS_STARTED"
        }
    }
    mergedConfig.launch.defaultViewport = mergedConfig.launch?.defaultViewport || null;
    setChromeArgs(mergedConfig, "launch")
    // @ts-ignore
    delete mergedConfig["connect"]
    saveMergedPuppeteerConfig(mergedConfig)
    puppeteerConfig = mergedConfig
    return puppeteerConfig
}

export async function setBrowserWSEndpoint(browserWSEndpoint: string) {
    if (!puppeteerConfig || !process.env.JEST_PUPPETEER_CONFIG) {
        throw new Error(`${CONSOLE_PREFIX} Puppeteer config is not initialized`)
    }
    puppeteerConfig.connect.browserWSEndpoint = browserWSEndpoint
    writeJestPuppeteerConfigToFile(process.env.JEST_PUPPETEER_CONFIG, puppeteerConfig)
}

export function dumpPuppeteerConfig() {
    console.log(black(bgYellow(`${CONSOLE_PREFIX} Final jest puppeteer config`)))
    console.log(require(process.env.JEST_PUPPETEER_CONFIG!))
}