# Backlog retest

Every open or closed issue about what the change touches is retested on the new code: a fix in the old code is not
a fix in the new one. The repository lives on GitHub and GitLab; collect from both when the user names both.

## Tools

| Tracker | Needs | Read with |
| --- | --- | --- |
| GitHub | `gh` signed in (`! gh auth login`); `gh auth refresh -s read:project` for boards | `gh issue list`, `gh project item-list`, `gh issue view` |
| GitLab | A token with `read_api` in the environment variable the config names (`GITLAB_TOKEN` by default) | The REST API (`/projects/:id/issues`, `/notes`, `/uploads`), through `fetch`. Written for this skill but not yet run against a GitLab instance: check the first run's output by hand |

`gh search issues` returns at most 1000 results per query; list each repository instead. Issues of the pre-monorepo
repositories were migrated into the monorepo, and a board (GitHub Project) holds issues the repository lists no longer
return, so collect the boards too.

## Config

`qa-<feature>/config/backlog.config.json` (template: `templates/backlog.config.json`):

| Field | Meaning |
| --- | --- |
| `github.owner`, `github.repos`, `github.projects` | The organization, its repositories, and board numbers |
| `gitlab.host`, `gitlab.projects`, `gitlab.tokenEnv` | The GitLab URL, project paths (`group/project`), the token variable |
| `shortNamePrefix` | Removed from repository names in issue IDs: `qubership-` makes `apihub#627`; GitLab IDs start with `gl-` |
| `keywords.strong`, `keywords.domain`, `keywords.exclude` | Regular-expression fragments: words of the changed components, of the content they show, and of unrelated areas |
| `minScore`, `unrelatedTeam` | The candidate threshold (4), and a board team whose issues lose 2 unless the title names the components |

A strong word scores 3 in the title, a domain word 2; each kind scores 1 more anywhere in the title or body; an
excluded word in the title subtracts 3.

## Procedure

With `S=.agents/skills/api-doc-viewer-feature-test-plan/scripts/backlog`, `C` the config, and `$WORK` a folder
outside the repository (it holds the text of every issue):

```bash
node $S/collect-issues.js "$WORK" --config $C
node $S/merge-issues.js "$WORK" --config $C > "$WORK/candidates.txt"
node $S/fetch-comments.js "$WORK" --config $C apihub#88 gl-apihub#12
node $S/dump-issues.js "$WORK" 3000 --config $C --comments apihub#88
node $S/list-attachments.js "$WORK" --config $C apihub#88 > "$WORK/attachments.tsv"
node $S/download-attachments.js "$WORK/attachments.tsv" qa-<feature>/samples/backlog --config $C
node $S/tidy-backlog.js qa-<feature>/samples/backlog
```

1. Read the candidates, and skim the titles of the issues below the threshold of the affected team.
2. Read the likely ones in full, with comments for the open ones: comments often hold the reproducing document.
3. Select. Leave out, with a reason in a "Not selected" table: classification-only issues (the change does not touch
   `api-diff`), out-of-scope views, publication failures, epics, features not built.
4. Samples: attachments of the selected issues, renamed when the name has spaces, `$`, or lookalike letters (a
   Cyrillic letter that looks like a Latin "c"); text pasted in an issue becomes a minimal document marked "rebuilt";
   an issue that needs a new sample gets one written for the retest, checked with `apiDiff` before its expected result
   is written.
5. Write `test-plan/backlog-retest.md`: one row per issue with ID `ISS-NN`, the issue link, state, the package, steps,
   expected result, cells, and the plan case it overlaps ("Covered by").
6. Package the samples: one `QA-ISS-<NN>` per case with a sample, with `copiedPackage` in the plan's config, versions
   as the row's "Publish A, then B" says. Prefix each row's Sample cell with its package.
7. Record in `samples/backlog/README.md` where each file came from (attachment, comment, linked file, rebuilt,
   written for the retest).

Run download and tidy from outside the samples folder: Windows cannot remove a folder that a shell has as its
current directory.
