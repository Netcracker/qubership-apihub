#!/usr/bin/env bash
# Phase 0 spike of the AI Autonomous agent: runs opencode headless against this repository and records what it saw,
# what it was allowed to run, and what each run cost. Every probe keeps going on failure: a failed probe is a finding.
#
#   OPENAI_API_KEY=... bash tools/agent/spike/run.sh <out-dir>
set -uo pipefail

out="${1:?usage: run.sh <out-dir>}"
mkdir -p "$out"
spike="$(cd "$(dirname "$0")" && pwd)"
light='openai/gpt-6-luna'
strong='openai/gpt-6.1-sol'

export OPENCODE_CONFIG_DIR="$spike"
export OPENCODE_DISABLE_AUTOUPDATE=1

# One opencode run; stdout is the JSON event stream, stderr the log. Exit code goes to <name>.exit.
probe() {
  local name="$1" config="$2"; shift 2
  echo "::group::$name"
  OPENCODE_CONFIG="$spike/$config" timeout 900 opencode run --format json "$@" \
    > "$out/$name.jsonl" 2> "$out/$name.stderr"
  echo $? > "$out/$name.exit"
  tail -n 20 "$out/$name.stderr"
  echo "::endgroup::"
}

echo "::group::versions and discovery"
opencode --version | tee "$out/version.txt"
OPENCODE_CONFIG="$spike/opencode.json" opencode models openai > "$out/models.txt" 2>&1
grep -E 'gpt-6' "$out/models.txt" || echo 'no gpt-6 models listed'
OPENCODE_CONFIG="$spike/opencode.json" opencode agent list > "$out/agents.txt" 2>&1
OPENCODE_CONFIG="$spike/opencode.json" opencode debug skill > "$out/skills.txt" 2>&1
OPENCODE_CONFIG="$spike/opencode.json" opencode debug config > "$out/config.txt" 2>&1
head -c 3000 "$out/skills.txt"
echo "::endgroup::"

reader_prompt='Answer in four numbered sections.
1. Call the skill tool to load the skill named `apihub-backend-developer`. Quote the first Markdown heading of the loaded skill verbatim.
2. List the names of all skills the skill tool offers you, comma-separated, exactly as the tool lists them.
3. Read the file `backend/portal-backend/go.mod` with the read tool. Then say whether additional instruction text arrived together with that read, such as the content of `backend/portal-backend/AGENTS.md` or `backend/AGENTS.md`. If yes, quote its first Markdown heading verbatim; if not, write NONE.
4. Do your system instructions contain text from files under `.claude/rules/`? If yes, quote the first sentence of the rule that mentions `apihub-backend-developer`; if not, write NONE.'

# Skills, nested AGENTS.md, and the token cost of loading every rule: the same prompt with and without the rules.
probe reader-rules opencode.json --agent spike-reader --model "$light" --variant medium "$reader_prompt"
probe reader-norules opencode-norules.json --agent spike-reader --model "$light" --variant medium "$reader_prompt"

shell_prompt='Run each command below with the bash tool, one call per command, exactly as written. Then print a Markdown table with the columns: number, command, ran or rejected, first line of output or of the error.
1. echo hello
2. git status --short
3. curl -sI https://example.com
4. bash -c "curl -sI https://example.com"
5. gh --version
6. git push --dry-run origin HEAD
7. echo ok && curl -sI https://example.com
8. node -e "fetch(\"https://example.com\").then(r => console.log(r.status))"
9. node -e "console.log(Boolean(process.env.OPENAI_API_KEY))"'
probe shell opencode-norules.json --agent spike-shell --model "$light" --variant medium "$shell_prompt"

probe steps opencode-norules.json --agent spike-steps --model "$light" --variant low \
  'Read these five files one at a time with the read tool, then summarize each in one line: README.md, AGENTS.md, package.json, nx.json, go.work.'

# Which reasoning efforts the API accepts for each model.
for variant in medium high xhigh max; do
  probe "variant-sol-$variant" opencode-norules.json --agent spike-steps --model "$strong" --variant "$variant" \
    'Reply with the single word OK.'
done
for variant in medium max; do
  probe "variant-luna-$variant" opencode-norules.json --agent spike-steps --model "$light" --variant "$variant" \
    'Reply with the single word OK.'
done

node "$spike/summarize.js" "$out"
