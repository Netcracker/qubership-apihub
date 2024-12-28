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

import os from "os"
import { bgYellow, black, green, red, yellow } from "colors"
import { CHROME_PORT, CONSOLE_PREFIX, DOCKER_CONTAINER_NAME, getConnectToChromeMaxAttempts, getConnectToChromeRetryIntervals, getDockerBinaryCLIPath, getHostCheckPort } from "./defaults"
import { runCommand } from "./run-command"
import { ChromeArg } from "../index.types"
import { dockerContainerIpAddress, getDockerHostIpAddress, getHostnameIpAddress, ping } from "./utils"

const fetch = require("fetch-retry")(global.fetch);

export type DockerUpResult = {containerId: string, ipAddress: string, hostIpAddress: string, webSocketUri: string, headless: boolean}

const CONNECT_TIMEOUT = 3000
const CDP_WEBSOCKET_ENDPOINT_REGEX = /^DevTools listening on (ws:\/\/.*)$/m;

const isWindows = os.platform() === "win32"

const dockerUp = async (flags: ChromeArg[]): Promise<DockerUpResult> => {
    const headlessArg = flags.find(f => f.trim().startsWith("--headless"))?.split("=");
    const headless = headlessArg && ["shell", "new", "true"].includes(headlessArg[1])

    console.log(bgYellow(black(`${CONSOLE_PREFIX} Headless mode is${headless ? " " : " not "}enabled.`)));

    try {
        console.log(green(`${CONSOLE_PREFIX} Starting Docker container...`));

        let chromeContainerId;
        let ipAddress;
        let gateway;
        let webSocketUri;
        // if host OS is windows: docker run ... sh -c "/bin/google-chrome --arg1='a b' '--arg1'"
        // if host OS is linux:   docker run ... sh -c '/bin/google-chrome --arg1="a b" "--arg1"'
        const preparedFlags = flags.map(f => f.trim().replace(/^["']|["']$|(?<==)["']/g, isWindows ? `'` : `"`))
        if (headless) {
            chromeContainerId = (await runCommand(getDockerBinaryCLIPath(), [
                "run",
                "-p", `${CHROME_PORT}:${CHROME_PORT}`,
                "-d",
                "--name", DOCKER_CONTAINER_NAME,
                process.env.DOCKER_IMAGE!,
                "sh",
                "-c",
                `${isWindows ? "\"" : `'`}/bin/google-chrome ${preparedFlags.join(" ")}${isWindows ? "\"" : `'`}`
            ])).out.trim();
            await new Promise((res) => {
                setTimeout(() => {
                    res(null)
                }, 2000);
            })

            ipAddress = await dockerContainerIpAddress(chromeContainerId, CHROME_PORT, CONNECT_TIMEOUT)
            gateway = await getDockerHostIpAddress(chromeContainerId, getHostCheckPort(), CONNECT_TIMEOUT)

            console.log(green(`${CONSOLE_PREFIX} Successfully started Docker container '${chromeContainerId}' with address '${ipAddress}' and gateway '${gateway}'`));

            let maxAttempts = getConnectToChromeMaxAttempts();
            let retryInterval = getConnectToChromeRetryIntervals();

            webSocketUri = (
                await contactChrome(`http://${ipAddress}:${CHROME_PORT}/json/version`, maxAttempts, retryInterval)
            ).webSocketDebuggerUrl;

            return {containerId: chromeContainerId, ipAddress: ipAddress, hostIpAddress: gateway, webSocketUri: webSocketUri, headless: false};
        }
            //  The problem that --remote-debugging-address is ignored i headful mode and we do not know how to forward 127.0.0.1 outside from a container
            //  Links:
            //    * https://serverfault.com/questions/1132636/how-to-forward-inside-a-container-requests-from-0-0-0-0-to-127-0-0-1
            //    * https://stackoverflow.com/questions/40538197/chrome-remote-debugging-from-another-machine
            //    * https://copyprogramming.com/howto/chrome-remote-debugging-from-another-machine WA here is to create proxy - is too difficult and requires to add some script to container.
            //    * https://groups.google.com/a/chromium.org/g/headless-dev/c/WV5-fVfLW0I
            //    * https://stackoverflow.com/questions/30109037/how-can-i-forward-localhost-port-on-my-container-to-localhost-on-my-host
        //    * https://superuser.com/questions/684275/how-to-forward-packets-between-two-interfaces
        else {
            gateway = (await getHostnameIpAddress() || process.env.DISPLAY?.split(":")?.[0]) ?? "127.0.0.1"
            chromeContainerId = (await runCommand(getDockerBinaryCLIPath(), [
                "run",
                "-d",
                "--network=host",
                "-e", `DISPLAY=${process.env.DISPLAY ?? `${gateway}:0`}`,
                "--name", DOCKER_CONTAINER_NAME,
                process.env.DOCKER_IMAGE!,
                "sh",
                "-c",
                `${isWindows ? "\"" : `'`}/bin/google-chrome ${preparedFlags.join(" ")} || exit $?${isWindows ? "\"" : `'`}`
            ])).out.trim();

            await new Promise((res) => {
                setTimeout(() => {
                    res(null)
                }, 2000);
            })

            const startLogs = (await runCommand(getDockerBinaryCLIPath(), [
                "logs",
                DOCKER_CONTAINER_NAME
            ])).err.trim();

            webSocketUri = CDP_WEBSOCKET_ENDPOINT_REGEX.exec(startLogs)?.[1]
            if (!webSocketUri) {
                throw new Error(`${CONSOLE_PREFIX} 'webSocketUri' has not been calculated`);
            }
            ipAddress = "localhost"
            if (!(await ping(ipAddress, CHROME_PORT, CONNECT_TIMEOUT))) {
                throw new Error("Container that is run with '--network=host' is not accessible localhost(127.0.0.1). That means VM does not forward ports to Windows. \n" +
                    "To fix it add `[wsl]\\nlocalhostForwarding = true` to `/etc/wsl.conf` under proper WSL distribution like `rancher-desktop`, `podman-desktop` or `docker-desktop`\n" +
                    "Useful commands: `wsl --list`, `wsl -d {peroper-distribution}`")
            }
            console.log(green(`${CONSOLE_PREFIX} Successfully started Docker container ${chromeContainerId} with the IP address ${ipAddress} and gateway ${gateway}`));
            webSocketUri = webSocketUri.replace("127.0.0.1", ipAddress)
        }
        console.log(green(`${CONSOLE_PREFIX} Connected to WebSocket URL: ${webSocketUri}`));
        return {containerId: chromeContainerId, ipAddress: ipAddress, hostIpAddress: gateway, webSocketUri: webSocketUri, headless: false};
    } catch (error) {
        console.error(error)
        throw new Error(`${CONSOLE_PREFIX} Failed to start Docker container \n\nInternal Error: \n\n${error}`);
    }
}

const killChrome = async () => {
    console.log(green(`${CONSOLE_PREFIX} Killing Chrome in container...`));
    try {
        await runCommand(getDockerBinaryCLIPath(), [
            "exec",
            DOCKER_CONTAINER_NAME,
            "sh",
            "-c",
            `"ps -ef | grep -P 'chrome' | awk ${isWindows ? `'{print $2}'` : `'"'{print $2}'"'`} | xargs -r kill &> /dev/null || :"`
        ]);
    } catch (e: any) {
        if (e.code !== 143 /* SIGTERM Linux Graceful Termination */ && !e.stderr?.includes("No such container")) {
            console.error(e)
            const message = green(`${CONSOLE_PREFIX} Failed to kill Docker container \n\nInternal Error: \n\n${e}`)
            console.error(message)
            return;
        }
    }
    console.log(green(`${CONSOLE_PREFIX} Chrome is killed successfully.`));
}

const dockerDown = async () => {
    try {
        console.log(green(`${CONSOLE_PREFIX} Shutting down and removing Docker container...`));
        let containerId;
        try {
            containerId = (await runCommand(getDockerBinaryCLIPath(), [
                "ps",
                "-a",
                "-q",
                "-f",
                `name=${DOCKER_CONTAINER_NAME}`
            ])).out.trim();
        } catch (e: any) {
            console.warn(yellow(`${CONSOLE_PREFIX} ${e.message}`));
        }
        if (containerId) {
            try {
                await runCommand(getDockerBinaryCLIPath(), ["stop", DOCKER_CONTAINER_NAME]);
            } catch (e) {
                console.error(e)
            }
            try {
                await runCommand(getDockerBinaryCLIPath(), ["rm", DOCKER_CONTAINER_NAME]);
            } catch (e) {
                console.error(e)
            }
        }
        console.log(green(`${CONSOLE_PREFIX} Docker container is successfully shut down and removed.`));
    } catch (error) {
        const message = `${CONSOLE_PREFIX} Failed to shut down Docker container \n\nInternal Error: \n\n${error}`
        console.warn(yellow(`${message}`))
    }
};

const contactChrome = async (uri: string, maxAttempts: number, retryDelay: number) => {
        console.log(green(`${CONSOLE_PREFIX} Contacting Chromium in container to ${uri}...`));
        return fetch(uri, {
            retryDelay: retryDelay,
            retryOn: function (attempt: number, error: unknown, response: Response) {
                if (attempt >= maxAttempts) {
                    console.log(red(`${CONSOLE_PREFIX} Max number of attempts exceeded. I'm giving up!`));
                    return false
                }
                if (error !== null || response.status >= 400) {
                    console.log(yellow(`${CONSOLE_PREFIX} Attempt #${attempt} of ${maxAttempts}`));
                    return true;
                }
                return false
            }
        }).then(function (response: Response) {
            return response.json();
        })
    }
;

export async function dockerShutdownChrome() {
    await killChrome();
    await dockerDown();
}

export async function dockerRunChrome({flags}: {flags: ChromeArg[]}) {
    await dockerDown();
    const {/*ipAddress, */hostIpAddress, webSocketUri, headless} = await dockerUp(flags);
    return {webSocketUri: webSocketUri, hostIpAddress: hostIpAddress, headless: headless};
};

