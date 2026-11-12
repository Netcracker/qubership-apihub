import { promisify } from "util";
import { cyan, yellow } from "colors";
import { exec as exec0 } from "child_process";

const exec = promisify(exec0);

export async function runCommand(command: string, args: string[], {printStdout = true}: {printStdout?: boolean} = {}) {
    const cmd = `${command} ${args.join(' ')}`;
    console.log(`> ${cmd}`.cyan);
    const {stdout, stderr} = await exec(`${command} ${args.join(' ')}`);

    if (stdout && printStdout) {
        console.log(cyan(stdout));
    }
    if (stderr) {
        console.error(yellow(stderr));
    }
    return {out: stdout, err: stderr};
}
