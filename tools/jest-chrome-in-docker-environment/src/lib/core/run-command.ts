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

import { promisify } from "util";
import { cyan, yellow } from "colors";
import { exec as exec0 } from "child_process";

const exec = promisify(exec0);

export async function runCommand(command: string, args: string[]) {
    const cmd = `${command} ${args.join(' ')}`;
    console.log(`> ${cmd}`.cyan);
    const {stdout, stderr} = await exec(`${command} ${args.join(' ')}`);

    if (stdout) {
        console.log(cyan(stdout));
    }
    if (stderr) {
        console.error(yellow(stderr));
    }
    return {out: stdout, err: stderr};
}
