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

import { Config } from "@jest/types"
import { CONSOLE_PREFIX } from "../core/defaults"
import { dockerRunChrome } from "../core/docker-chrome"
import { dumpPuppeteerConfig, initPuppeteerWithChromeInDockerConfig, initPuppeteerWithLocalChromeConfig, setBrowserWSEndpoint } from "../core/read-jest-puppeteer-config"

import colors from 'colors';
const { bgYellow, black } = colors;

// @ts-ignore
import setupPuppeteer from "jest-environment-puppeteer/setup"
import { enableRunInDockerTeardownOnSignals } from "./teardown"

export default async function (jestConfig: Config.ProjectConfig & Config.Argv) {
    if (process.env.RUN_IN_DOCKER === "true") {
        console.log(bgYellow(black(`\n${CONSOLE_PREFIX} Run in docker\n`)));

        await enableRunInDockerTeardownOnSignals()

        const puppeteerConfig = await initPuppeteerWithChromeInDockerConfig()
        const {webSocketUri, hostIpAddress/*, headless*/} = await dockerRunChrome({flags: puppeteerConfig.connect.args});
        await setBrowserWSEndpoint(webSocketUri)
        // fixme: https://github.com/argos-ci/jest-puppeteer/discussions/577
        process.env.WORKERS_COUNT = `${jestConfig.maxWorkers ?? 2}`;
        process.env.HOST_ADDRESS = hostIpAddress;
        console.log(bgYellow(black(`\n${CONSOLE_PREFIX} Local server address is ${process.env.HOST_ADDRESS}\n`)));
        process.env.PUPPETEER_SKIP_DOWNLOAD = process.env.PUPPETEER_SKIP_DOWNLOAD ?? "false";
        dumpPuppeteerConfig()
    } else {
        console.log(bgYellow(black(`\n${CONSOLE_PREFIX} Run on host\n`)));
        await initPuppeteerWithLocalChromeConfig()
        dumpPuppeteerConfig()

    }
    await setupPuppeteer(jestConfig);
};
