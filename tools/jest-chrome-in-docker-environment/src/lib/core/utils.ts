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

import { runCommand } from "./run-command"
import { CONSOLE_PREFIX, getDockerBinaryCLIPath, getNodeBinaryCLIPath } from "./defaults"
import os from "os"
import { bgGreen, black, yellow } from "colors"

const net = require("net");

const isWindows = os.platform() === "win32"

export async function getDockerHostIpAddress(containerId: string, portToPing: number, pingTimeout: number) {
    let address = ""
    address = (await runCommand(getDockerBinaryCLIPath(), [
        "exec",
        containerId,
        "sh",
        "-c",
        `"(cat /etc/resolv.conf | grep nameserver | awk ${isWindows ? `'{print $2; exit;}'` : `'"'{print $2; exit;}'"'`}) 2> /dev/null || :"`
    ])).out.trim()
    address = await validateHostAddress(address, portToPing, pingTimeout, containerId, true)
    if (address) {
        return address
    }

    address = await getHostnameIpAddress()
    address = await validateHostAddress(address, portToPing, pingTimeout, containerId, true)
    if (address) {
        return address
    }

    address = (await runCommand(getDockerBinaryCLIPath(), [
        "exec",
        containerId,
        "sh",
        "-c",
        `"(getent hosts host.docker.internal | awk ${isWindows ? `'{print $1}'` : `'"'{print $1}'"'`}) 2> /dev/null || :"`
    ])).out.trim()
    address = await validateHostAddress(address, portToPing, pingTimeout, containerId, true)
    if (address) {
        return address
    }

    address = (await runCommand(getDockerBinaryCLIPath(), [
        "exec",
        containerId,
        "node",
        "-e",
        `"require('dns').lookup('host.docker.internal', function (err, add, fam) { if(add){ console.log(add); } })"`
    ])).out.trim()
    address = await validateHostAddress(address, portToPing, pingTimeout, containerId, true)
    if (address) {
        return address
    }

    // sometimes it is not accessible directly, e. g. in rancher-desktop
    address = (await runCommand(getDockerBinaryCLIPath(), [
        "inspect",
        "-f",
        "'{{range.NetworkSettings.Networks}}{{.Gateway}}{{end}}'",
        containerId
    ])).out.trim()
    address = await validateHostAddress(address, portToPing, pingTimeout, containerId, true)
    if (address) {
        return address
    }

    address = await validateHostAddress(address, portToPing, pingTimeout, containerId, false)
    if (address) {
        return address
    }

    throw new Error("Could not resolve IP address of host machine")
}

export async function dockerContainerIpAddress(containerId: string, portToPing: number, pingTimeout: number) {
    let address

    address = (await runCommand(getDockerBinaryCLIPath(), [
        "inspect",
        "-f",
        `"{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}"`,
        containerId
    ])).out.trim()
    address = await validateContainerAddress(address, portToPing, pingTimeout, true)
    if (address) {
        return address
    }

    address = await getFirstIpAccessibleContainerIpAddress(containerId, portToPing, pingTimeout)
    address = await validateContainerAddress(address, portToPing, pingTimeout, true)
    if (address) {
        return address
    }

    address = await validateContainerAddress("localhost", portToPing, pingTimeout, false)
    if (address) {
        return address
    }
    throw new Error("Could not resolve IP address of container")
}

async function validateContainerAddress(address: string, portToPing: number, pingTimeout: number, skipLocalhost: boolean): Promise<string> {
    const checkIpMessage = (ip: string) => yellow(`${CONSOLE_PREFIX} Check container address ${ip}:${portToPing} is accessible from host:`)
    if (!address) {
        return ""
    }
    if ((address === "127.0.0.1" || address === "localhost") && skipLocalhost) {
        return ""
    }
    if (await ping(address, portToPing, pingTimeout)) {
        console.log(checkIpMessage(address), black(bgGreen("available")), "\n")
        return address;
    }
    console.log(checkIpMessage(address), yellow("not available"), "\n")
    return "";
}

async function validateHostAddress(address: string, portToPing: number, pingTimeout: number, containerId: string, skipLocalhost: boolean): Promise<string> {
    const checkIpMessage = (ip: string) => yellow(`${CONSOLE_PREFIX} Check host address ${ip}:${portToPing} is accessible from container:`)
    if (!address) {
        return ""
    }
    if ((address === "127.0.0.1" || address === "localhost") && skipLocalhost) {
        return ""
    }
    const result = (await runCommand(getDockerBinaryCLIPath(), [
        "exec",
        containerId,
        "sh",
        "-c",
        `"timeout ${Math.round(pingTimeout / 1000)} curl 'http://${address}:${portToPing}' &> /dev/null && echo 1 || :"`
    ])).out.trim()

    if (result) {
        console.log(checkIpMessage(address), black(bgGreen("available")), "\n")
        return address;
    }
    console.log(checkIpMessage(address), yellow("not available"), "\n")
    return "";
}

export async function getFirstIpAccessibleContainerIpAddress(containerId: string, portToPing: number, pingTimeout: number): Promise<string> {
    const ipsResult = (await runCommand(getDockerBinaryCLIPath(), [
        "exec",
        containerId,
        "node",
        "-e",
        `"console.log(Array.from(Object.values(require('os').networkInterfaces())).flatMap(c => c).filter(c => c.family==='IPv4' && c.address !== '127.0.0.1' ).map(c => c.address).join(' '))"`
    ]))
    if (ipsResult.err.trim()) {
        return ""
    }
    const ips = ipsResult.out.trim().split(" ").map(s => s.trim())
    for (const ip of ips) {
        const validatedIp = await validateContainerAddress(ip, portToPing, pingTimeout, true)
        if (validatedIp) {
            return validatedIp;
        }
    }
    return ""
}

export async function getHostnameIpAddress(): Promise<string> {
    return (await runCommand(getNodeBinaryCLIPath(), [
        "-e",
        `"require('dns').lookup(require('os').hostname(), function (err, add, fam) { if(add){ console.log(add); } })"`
    ])).out.trim()
}

export async function ping(ipAddress: string, port: number, timeout: number) {
    return new Promise((resolve) => {
        const socket = net.createConnection(port, ipAddress);
        socket.setTimeout(timeout);
        socket.on("connect", () => {
            socket.end();
            resolve(true);
        });
        socket.on("timeout", () => {
            socket.destroy();
            resolve(false);
        });
        socket.on("error", () => {
            socket.destroy();
            resolve(false);
        });
    });
}

