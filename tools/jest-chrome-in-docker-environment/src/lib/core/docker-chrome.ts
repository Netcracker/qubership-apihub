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
import { CHROME_PORT, CONSOLE_PREFIX, DOCKER_CONTAINER_NAME, getConnectToChromeMaxAttempts, getConnectToChromeRetryIntervals, getDockerBinaryCLIPath, getHostCheckPort, workerExternalPort, workerInternalPort } from "./defaults"
import { runCommand } from "./run-command"
import { ChromeArg } from "../index.types"
import { dockerContainerIpAddress, getDockerHostIpAddress, getHostnameIpAddress, ping } from "./utils"

const fetch = require("fetch-retry")(global.fetch);

export type DockerUpResult = {
  containerId: string
  ipAddress: string
  hostIpAddress: string
  webSocketUris: string[]
  headless: boolean
}

const CONNECT_TIMEOUT = 3000
const CONTAINER_READY_POLL_MS = 300
const CONTAINER_READY_MAX_ATTEMPTS = 10
const CDP_WEBSOCKET_ENDPOINT_REGEX = /^DevTools listening on (ws:\/\/.*)$/m;

const isWindows = os.platform() === "win32"

async function waitForContainerRunning(containerId: string): Promise<void> {
  for (let i = 0; i < CONTAINER_READY_MAX_ATTEMPTS; i++) {
    const { out } = await runCommand(getDockerBinaryCLIPath(), [
      "inspect", "-f", `"{{.State.Status}}"`, containerId
    ])
    if (out.trim().replace(/"/g, "") === "running") return
    await new Promise(r => setTimeout(r, CONTAINER_READY_POLL_MS))
  }
  throw new Error(`${CONSOLE_PREFIX} Container ${containerId} did not reach 'running' state`)
}

const dockerUp = async (flags: ChromeArg[], workersCount: number): Promise<DockerUpResult> => {
  const headlessArg = flags.find(f => f.trim().startsWith("--headless"))?.split("=");
  const headless = headlessArg && ["shell", "new", "true"].includes(headlessArg[1])

  console.log(bgYellow(black(`${CONSOLE_PREFIX} Headless mode is${headless ? " " : " not "}enabled.`)));

  try {
    console.log(green(`${CONSOLE_PREFIX} Starting Docker container with ${workersCount} Chrome instance(s)...`));

    let chromeContainerId: string;
    let ipAddress: string;
    let gateway: string;
    let webSocketUris: string[];
    // if host OS is windows: docker run ... sh -c "/bin/google-chrome --arg1='a b' '--arg1'"
    // if host OS is linux:   docker run ... sh -c '/bin/google-chrome --arg1="a b" "--arg1"'
    const preparedFlags = flags.map(f => f.trim().replace(/^["']|["']$|(?<==)["']/g, isWindows ? `'` : `"`))
    if (headless) {
      // Chrome 113+ ignores --remote-debugging-address=0.0.0.0 and always binds to 127.0.0.1
      // for security reasons (https://issues.chromium.org/issues/40261787).
      // Workaround: Chrome listens on 127.0.0.1:internalPort, socat forwards
      // 0.0.0.0:externalPort → 127.0.0.1:internalPort so that the port is
      // accessible from outside the container via Podman/Docker port mapping.
      const chromeCmds: string[] = []
      const socatCmds: string[] = []
      const portMappings: string[] = []
      for (let i = 0; i < workersCount; i++) {
        const externalPort = workerExternalPort(i)
        const internalPort = workerInternalPort(i)
        const workerFlags = preparedFlags
          .map(f => f.startsWith("--remote-debugging-port=") ? `--remote-debugging-port=${internalPort}` : f)
          .filter(f => !f.startsWith("--user-data-dir="))
        workerFlags.push(`--user-data-dir=/tmp/chrome-profile-${i}`)
        chromeCmds.push(`/bin/google-chrome ${workerFlags.join(" ")}`)
        socatCmds.push(`socat TCP-LISTEN:${externalPort},fork,reuseaddr,bind=0.0.0.0 TCP:127.0.0.1:${internalPort}`)
        portMappings.push("-p", `${externalPort}:${externalPort}`)
      }
      // All socats in background, all chromes except last in background, last in foreground
      const bgCmds = [...socatCmds, ...chromeCmds.slice(0, -1)].map(c => `${c} &`).join(" ")
      const containerCmd = `${bgCmds} ${chromeCmds[chromeCmds.length - 1]}`

      chromeContainerId = (await runCommand(getDockerBinaryCLIPath(), [
        "run",
        ...portMappings,
        "-d",
        "--name", DOCKER_CONTAINER_NAME,
        process.env.DOCKER_IMAGE!,
        "sh",
        "-c",
        `${isWindows ? "\"" : `'`}${containerCmd}${isWindows ? "\"" : `'`}`
      ])).out.trim();

      await waitForContainerRunning(chromeContainerId)
      ipAddress = await dockerContainerIpAddress(chromeContainerId, CHROME_PORT, CONNECT_TIMEOUT)
      gateway = await getDockerHostIpAddress(chromeContainerId, getHostCheckPort(), CONNECT_TIMEOUT)

      console.log(green(`${CONSOLE_PREFIX} Successfully started Docker container '${chromeContainerId}' with address '${ipAddress}' and gateway '${gateway}'`));

      let maxAttempts = getConnectToChromeMaxAttempts();
      let retryInterval = getConnectToChromeRetryIntervals();

      webSocketUris = await Promise.all(
        Array.from({ length: workersCount }, (_, i) => {
          return contactChrome(`http://${ipAddress}:${workerExternalPort(i)}/json/version`, maxAttempts, retryInterval)
            .then(r => r.webSocketDebuggerUrl as string)
        })
      )

      return { containerId: chromeContainerId, ipAddress: ipAddress, hostIpAddress: gateway, webSocketUris, headless: true };
    } else {
      if (workersCount > 1) {
        throw new Error(`${CONSOLE_PREFIX} Headful mode does not support multiple workers (requested ${workersCount}). Use headless mode for parallel execution.`)
      }
      // The problem that --remote-debugging-address is ignored in headful mode and we do not know how to forward 127.0.0.1 outside from a container
      // Links:
      //  * https://serverfault.com/questions/1132636/how-to-forward-inside-a-container-requests-from-0-0-0-0-to-127-0-0-1
      //  * https://stackoverflow.com/questions/40538197/chrome-remote-debugging-from-another-machine
      //  * https://copyprogramming.com/howto/chrome-remote-debugging-from-another-machine WA here is to create proxy - is too difficult and requires to add some script to container.
      //  * https://groups.google.com/a/chromium.org/g/headless-dev/c/WV5-fVfLW0I
      //  * https://stackoverflow.com/questions/30109037/how-can-i-forward-localhost-port-on-my-container-to-localhost-on-my-host
      //  * https://superuser.com/questions/684275/how-to-forward-packets-between-two-interfaces
      gateway = (await getHostnameIpAddress() || process.env.DISPLAY?.split(":")?.[0]) ?? "127.0.0.1"
      /**
       * ATTENTION!
       * Strongly recommended to define env var DISPLAY on your WSL (e.g. Ubuntu).
       * Step 1. vi ~/.bashrc
       * Step 2. Append line "export DISPLAY=<YOUR-HOST>:0.0" and save
       * Step 3. source ~/.bashrc
       * 
       * If don't want to define DISPLAY, gateway will be calculated with "getHostnameIpAddress" utility.
       * It may produce errors when there are more than 1 network adapter, e.g. when you have installed
       * any VM with its own network adapters.
       */
      const envVarDisplay = process.env.DISPLAY && process.env.DISPLAY !== 'needs-to-be-defined'
        ? process.env.DISPLAY
        : `${gateway}:0.0`
      chromeContainerId = (await runCommand(getDockerBinaryCLIPath(), [
        "run",
        "-d",
        "--network=host",
        "-e", `DISPLAY=${envVarDisplay}`,
        "--name", DOCKER_CONTAINER_NAME,
        process.env.DOCKER_IMAGE!,
        "sh",
        "-c",
        `${isWindows ? "\"" : `'`}/bin/google-chrome ${preparedFlags.join(" ")} || exit $?${isWindows ? "\"" : `'`}`
      ])).out.trim();

      await waitForContainerRunning(chromeContainerId)
      const startLogs = (await runCommand(getDockerBinaryCLIPath(), [
        "logs",
        DOCKER_CONTAINER_NAME
      ])).err.trim();

      const webSocketUri = CDP_WEBSOCKET_ENDPOINT_REGEX.exec(startLogs)?.[1]
      if (!webSocketUri) {
        throw new Error(`${CONSOLE_PREFIX} 'webSocketUri' has not been calculated`);
      }
      ipAddress = "localhost"

      const chromeAddress = `http://${ipAddress}:${CHROME_PORT}/`
      const chromePingResult =
        await fetch(chromeAddress)
          .then(() => true)
          .catch((error: Error) => {
            console.error(`Can't ping Google Chrome by address: ${chromeAddress}. See for more details:`, error);
            return false;
          })
      if (!chromePingResult) {
        throw new Error(
          "Container that is run with '--network=host' is not accessible localhost(127.0.0.1). That means VM does not forward ports to Windows. \n" +
          "To fix it add `[wsl]\\nlocalhostForwarding = true` to `/etc/wsl.conf` under proper WSL distribution like `rancher-desktop`, `podman-desktop` or `docker-desktop`\n" +
          "Useful commands: `wsl --list`, `wsl -d {proper-distribution}`"
        )
      }

      console.log(green(`${CONSOLE_PREFIX} Successfully started Docker container ${chromeContainerId} with the IP address ${ipAddress} and gateway ${gateway}`));
      const resolvedUri = webSocketUri.replace("127.0.0.1", ipAddress)
      console.log(green(`${CONSOLE_PREFIX} Connected to WebSocket URL: ${resolvedUri}`));
      return { containerId: chromeContainerId, ipAddress: ipAddress, hostIpAddress: gateway, webSocketUris: [resolvedUri], headless: false };
    }
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

export async function dockerShutdownChrome() {
  await killChrome();
  await dockerDown();
}

export async function dockerRunChrome({ flags, workersCount = 1 }: { flags: ChromeArg[], workersCount?: number }) {
  await dockerDown();
  const { hostIpAddress, webSocketUris, headless } = await dockerUp(flags, workersCount);
  return { webSocketUris, hostIpAddress, headless };
};

