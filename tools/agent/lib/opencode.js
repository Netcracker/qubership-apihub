/**
 * Runs one opencode agent headless and returns its JSON event stream.
 *
 * Every role of the AI Autonomous agent is an opencode agent under tools/agent/opencode/agents/. The model and the
 * reasoning effort come from the repository variables (lib/config.js), never from the agent file, so a model change
 * needs no commit. The run gets the OpenAI key and nothing else of value: no GitHub token is passed on, because the
 * scripts, not the model, write to GitHub.
 */
'use strict'

const { spawn } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const CONFIG_DIR = path.join(__dirname, '..', 'opencode')

// Variables a run must not see. GITHUB_TOKEN and AGENT_PAT can write to the repository; ACTIONS_* can reach the
// runner's cache and artifact services.
const SECRET_ENV = /^(GITHUB_TOKEN|GH_TOKEN|AGENT_PAT|ACTIONS_.*|INPUT_.*)$/

/** The environment of an opencode run: the parent's, minus the secrets, plus the opencode settings. */
function runEnv(parentEnv) {
  const env = {}
  for (const [k, v] of Object.entries(parentEnv)) if (!SECRET_ENV.test(k)) env[k] = v
  env.OPENCODE_CONFIG = path.join(CONFIG_DIR, 'opencode.json')
  env.OPENCODE_CONFIG_DIR = CONFIG_DIR
  env.OPENCODE_DISABLE_AUTOUPDATE = '1'
  return env
}

/** The argument list of `opencode run` for one agent call. */
function runArgs({ agent, model, message, files = [], title }) {
  const args = ['run', '--format', 'json', '--agent', agent, '--model', model.id]
  if (model.variant) args.push('--variant', model.variant)
  if (title) args.push('--title', title)
  for (const f of files) args.push('--file', f)
  args.push(message)
  return args
}

/**
 * Runs `opencode run` in `cwd` and writes the event stream to `eventsFile`.
 * Resolves `{ exitCode, eventsText, stderrTail }`; never rejects on a non-zero exit, because a failed run still has
 * events (and cost) the caller must record.
 */
function runAgent({ agent, model, message, files, title, cwd, eventsFile, env = process.env, bin = 'opencode' }) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(eventsFile), { recursive: true })
    const out = fs.createWriteStream(eventsFile)
    const child = spawn(bin, runArgs({ agent, model, message, files, title }), {
      cwd,
      env: runEnv(env),
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stderr = ''
    child.stdout.pipe(out)
    child.stderr.on('data', (d) => {
      process.stderr.write(d)
      stderr = (stderr + d).slice(-4000)
    })
    child.on('error', reject)
    child.on('close', (code) => {
      out.end(() =>
        resolve({ exitCode: code ?? 1, eventsText: fs.readFileSync(eventsFile, 'utf8'), stderrTail: stderr }),
      )
    })
  })
}

module.exports = { CONFIG_DIR, runEnv, runArgs, runAgent }
