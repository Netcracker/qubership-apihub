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
import { bgMagenta, green, yellow } from "colors"
import { Config } from "@jest/types"
import { dockerShutdownChrome } from "../core/docker-chrome"

// @ts-ignore
import teardownPuppeteer from "jest-environment-puppeteer/teardown"
import { CONSOLE_PREFIX } from "../core/defaults"

export default async function globalTeardown(jestConfig: Config.ProjectConfig) {
    await stopAsyncOperations();
    await teardownPuppeteer(jestConfig);
    await deleteTempFiles();
    if(process.env.RUN_IN_DOCKER === "true"){
        await shutdownChromeAndDocker();
    }
}

function stopAsyncOperations() {
    if (process.env.PAGE_SWITCHER_INTERVAL_ID) {
        clearInterval(Number(process.env.PAGE_SWITCHER_INTERVAL_ID))
    }
}

async function deleteTempFiles() {
    const tempConfigPath: string | undefined = process.env.JEST_PUPPETEER_CONFIG;
    if (!tempConfigPath) {
        return
    }
    let dirToRemove = path.dirname(tempConfigPath);
    try {
        const tempDir = fs.realpathSync(os.tmpdir());
        if (!tempConfigPath.startsWith(tempDir)) {
            return
        }
        dirToRemove = path.dirname(tempConfigPath)
        try {
            fs.rmSync(dirToRemove, {recursive: true})
            console.log(green(`${CONSOLE_PREFIX} Temporary directory '${dirToRemove}' is removed `))
        } catch (e: any) {
            // https://nodejs.org/api/errors.html#common-system-errors
            if (e.code === "ENOENT") {
                console.log(green(`${CONSOLE_PREFIX} Temporary directory '${dirToRemove}' is already removed `))
            } else {
                console.error(e);
            }
        }
    } catch (e) {
        console.error(`${CONSOLE_PREFIX} Error on removing directory ${dirToRemove}`, e)
    }
}

export async function enableRunInDockerTeardownOnSignals() {
    process.on("SIGINT", async () => onInterruption(129, "SIGINT"));   // CTRL+C
    process.on("SIGQUIT", async () => onInterruption(130, "SIGQUIT")); // Keyboard quit
    process.on("SIGTERM", async () => onInterruption(131, "SIGTERM")); // `kill` command but not 'kill -9'
}

let shutdownIsInProgress = false;
async function shutdownChromeAndDocker() {
    if (shutdownIsInProgress/* has already interrupted maybe */) {
        return
    }
    shutdownIsInProgress = true
    await dockerShutdownChrome()
}

// https://nodejs.org/api/process.html#event-exit
// https://nodejs.org/api/process.html#exit-codes
// https://www.baeldung.com/linux/status-codes
// https://en.wikipedia.org/wiki/Signal_(IPC)
async function onInterruption(codeToBeExit: number, interruptionType: string) {
    console.log(yellow(bgMagenta(`${CONSOLE_PREFIX} Interruption ${interruptionType}`)))
    await stopAsyncOperations();
    await deleteTempFiles();
    await shutdownChromeAndDocker();
    const statusCode = process.exitCode || (codeToBeExit < 128 ? codeToBeExit : codeToBeExit - 128);
    console.log(yellow(bgMagenta(`${CONSOLE_PREFIX} Status code is ${statusCode}`)))
    process.exit(statusCode)
}
