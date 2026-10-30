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
const log = require('./log')

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

const LOG_LEVELS = new Set(['DEBUG', 'INFO', 'WARN', 'ERROR'])

/** opencode's own log flags: `AGENT_LOG_LEVEL` (default INFO) goes to stderr, which the job log shows. */
function logArgs(env) {
  const level = String(env.AGENT_LOG_LEVEL ?? '').trim().toUpperCase() || 'INFO'
  return LOG_LEVELS.has(level) ? ['--print-logs', '--log-level', level] : []
}

/**
 * The argument list of `opencode run` for one agent call. The message comes first and `--file` last: `--file` takes
 * several values, so a message after it would be read as one more file.
 */
function runArgs({ agent, model, message, files = [], title }) {
  const args = ['run', message, '--format', 'json', '--agent', agent, '--model', model.id]
  if (model.variant) args.push('--variant', model.variant)
  if (title) args.push('--title', title)
  for (const f of files) args.push('--file', f)
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
    const args = [...logArgs(env), ...runArgs({ agent, model, message, files, title })]
    log.info(`${agent} starts`, { model: model.id, variant: model.variant, files, cwd })
    const started = Date.now()
    const child = spawn(bin, args, { cwd, env: runEnv(env), stdio: ['ignore', 'pipe', 'pipe'] })
    let stderr = ''
    let pending = ''
    // Every complete line of the stream is one event: log it as it arrives, so a long run shows its progress.
    child.stdout.on('data', (d) => {
      out.write(d)
      pending += d
      const lines = pending.split('\n')
      pending = lines.pop()
      for (const line of lines) logLine(agent, line)
    })
    child.stderr.on('data', (d) => {
      process.stderr.write(d)
      stderr = (stderr + d).slice(-4000)
    })
    child.on('error', reject)
    child.on('close', (code) => {
      logLine(agent, pending)
      log.info(`${agent} exits`, { code, seconds: ((Date.now() - started) / 1000).toFixed(1) })
      out.end(() =>
        resolve({ exitCode: code ?? 1, eventsText: fs.readFileSync(eventsFile, 'utf8'), stderrTail: stderr }),
      )
    })
  })
}

function logLine(agent, line) {
  const trimmed = line.trim()
  if (!trimmed.startsWith('{')) return
  try {
    log.modelEvent(agent, JSON.parse(trimmed))
  } catch {
    // A partial or non-JSON line; the events file keeps it for the record.
  }
}

module.exports = { CONFIG_DIR, SECRET_ENV, runEnv, runArgs, logArgs, runAgent }
