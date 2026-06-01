# Claude Code skills (APIHub backend)

Project skills are **canonical** in [`.cursor/skills/`](../../.cursor/skills/). This directory contains copies for [Claude Code](https://docs.anthropic.com/en/docs/claude-code/skills) so skills work without extra setup.

## Available skills

| Skill | Purpose |
|-------|---------|
| `apihub-backend-developer` | Implement backend features, migrations, OpenAPI, Go conventions |
| `apihub-self-review` | Post-implementation review of a diff (invoke explicitly) |
| `github-ticket-implementation-planner` | Plan work from a GitHub issue before coding |

## Cross-platform scripts

Migration validation:

- Linux / WSL / Git Bash: `bash .cursor/skills/apihub-backend-developer/scripts/check_migration_numbers.sh`
- Windows PowerShell: `powershell -File .cursor/skills/apihub-backend-developer/scripts/check_migration_numbers.ps1`

## Keeping in sync

When you add or change a skill under `.cursor/skills/`, refresh Claude copies:

```powershell
# From repository root (Windows)
$skills = @("apihub-backend-developer", "apihub-self-review", "github-ticket-implementation-planner")
foreach ($name in $skills) {
  Remove-Item -Recurse -Force ".claude\skills\$name" -ErrorAction SilentlyContinue
  Copy-Item -Recurse -Force ".cursor\skills\$name" ".claude\skills\$name"
}
```

On Linux/macOS you may symlink instead: `ln -sf ../../.cursor/skills/<name> .claude/skills/<name>`.

## Session context

Claude Code loads [`CLAUDE.md`](../../CLAUDE.md) which imports [`AGENTS.md`](../../AGENTS.md). Path-scoped rules live in [`.claude/rules/`](../rules/).
