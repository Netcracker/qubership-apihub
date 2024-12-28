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
import { CONSOLE_PREFIX } from "../core/defaults"
import colors, { bgRed, white } from "colors";
const { bgYellow, black } = colors;


export const globalSetup = path.join(__dirname, "setup.js")
export const globalTeardown = path.join(__dirname, "teardown.js")
export const testEnvironment = "jest-environment-puppeteer"

export async function prepareJestConfig(baseJestConfigPath: string, basePuppeteerLaunchOptionsPath: string, options?: {
    dockerImage?: string,
    dockerBinary?:string,
    nodeBinary?:string
}): Promise<void> {
    options = options ?? {}

    process.env.JEST_PUPPETEER_CONFIG = basePuppeteerLaunchOptionsPath;
    const runInDocker = !!options.dockerImage
    process.env.RUN_IN_DOCKER = `${runInDocker}`;
    if(runInDocker){
        process.env.DOCKER_IMAGE = options.dockerImage ?? process.env.DOCKER_IMAGE;
        if(!process.env.DOCKER_IMAGE){
            const message = `'dockerImage' options must be specified because 'runInDocker' is 'true'`
            console.log(white(bgRed(`${CONSOLE_PREFIX} ${message}`)))
            throw new Error(message)
        }
    }
    if (options.dockerBinary) {
        process.env.DOCKER_BINARY = options.dockerBinary ?? process.env.DOCKER_BINARY;
        if(process.env.DOCKER_BINARY){
            console.log(bgYellow(black(`\n${CONSOLE_PREFIX} External Docker binary is ${process.env.DOCKER_BINARY}\n`)));    
        }
        
    }
    if (options.nodeBinary) {
        process.env.NODE_BINARY = options.nodeBinary ?? process.env.NODE_BINARY;
        if(process.env.NODE_BINARY){
            console.log(bgYellow(black(`\n${CONSOLE_PREFIX} External Node.js binary is ${process.env.NODE_BINARY}\n`)));
        }

    }
    const baseConfig = {...require(baseJestConfigPath)};
    baseConfig.globalSetup = globalSetup;
    baseConfig.globalTeardown = globalTeardown;
    baseConfig.testEnvironment = testEnvironment;

    const preparedConfig = Object.assign({
            preset: "jest-puppeteer",
            testRunner: "jest-circus/runner",
            reporters: ["default"],
            moduleFileExtensions: ["ts", "js", "json", "node"],
        },
        baseConfig
    );
    console.log(black(bgYellow(`${CONSOLE_PREFIX} Prepared Jest config`)))
    console.log(preparedConfig, "\n")
    return preparedConfig
}
