// Summarizes the spike probes from their opencode JSON event streams as Markdown for the job summary.
// The event shapes are what the spike verifies, so every field is read defensively and the first raw
// step_finish event is printed as well.
'use strict'

const fs = require('node:fs')
const path = require('node:path')

const dir = process.argv[2]
const lines = []
const say = (s = '') => lines.push(s)

function events(file) {
  const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''
  return text
    .split('\n')
    .filter((l) => l.trim().startsWith('{'))
    .map((l) => {
      try {
        return JSON.parse(l)
      } catch {
        return { type: 'unparsable', raw: l.slice(0, 200) }
      }
    })
}

const num = (v) => (typeof v === 'number' ? v : 0)
const clip = (s, n = 300) => String(s ?? '').replace(/\s+/g, ' ').slice(0, n)

const probes = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.jsonl'))
  .map((f) => f.replace(/\.jsonl$/, ''))
  .sort()

say('## Probes')
say()
say('| probe | exit | steps | input | cache read | output | reasoning | cost USD | tools | errors |')
say('|---|---|---|---|---|---|---|---|---|---|')
let firstStepFinish
for (const name of probes) {
  const ev = events(path.join(dir, `${name}.jsonl`))
  const exit = fs.existsSync(path.join(dir, `${name}.exit`))
    ? fs.readFileSync(path.join(dir, `${name}.exit`), 'utf8').trim()
    : '?'
  const steps = ev.filter((e) => e.type === 'step_finish')
  if (!firstStepFinish && steps.length) firstStepFinish = steps[0]
  const t = { input: 0, cache: 0, output: 0, reasoning: 0, cost: 0 }
  for (const s of steps) {
    const p = s.part ?? {}
    t.input += num(p.tokens?.input)
    t.cache += num(p.tokens?.cache?.read)
    t.output += num(p.tokens?.output)
    t.reasoning += num(p.tokens?.reasoning)
    t.cost += num(p.cost)
  }
  const tools = ev.filter((e) => e.type === 'tool_use').length
  const errors = ev.filter((e) => e.type === 'error').map((e) => clip(JSON.stringify(e.error), 120))
  say(
    `| ${name} | ${exit} | ${steps.length} | ${t.input} | ${t.cache} | ${t.output} | ${t.reasoning} | ` +
      `${t.cost.toFixed(4)} | ${tools} | ${errors.join('; ') || ''} |`,
  )
}

say()
say('## Tool calls of the shell probe')
say()
say('| tool | input | status | output or error |')
say('|---|---|---|---|')
for (const e of events(path.join(dir, 'shell.jsonl')).filter((x) => x.type === 'tool_use')) {
  const st = e.part?.state ?? {}
  const input = clip(st.input?.command ?? JSON.stringify(st.input), 120).replace(/\|/g, '\\|')
  const result = clip(st.error ?? st.output, 160).replace(/\|/g, '\\|')
  say(`| ${e.part?.tool} | \`${input}\` | ${st.status} | ${result} |`)
}

for (const name of ['reader-rules', 'reader-norules', 'shell', 'steps']) {
  say()
  say(`## Final text of ${name}`)
  say()
  const texts = events(path.join(dir, `${name}.jsonl`))
    .filter((e) => e.type === 'text')
    .map((e) => e.part?.text ?? '')
  say('```text')
  say((texts.at(-1) ?? '(no text event)').slice(0, 4000))
  say('```')
}

say()
say('## First raw step_finish event')
say()
say('```json')
say(JSON.stringify(firstStepFinish ?? null, null, 2).slice(0, 3000))
say('```')

process.stdout.write(lines.join('\n') + '\n')
