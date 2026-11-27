---
name: apihub-release-announce
description: >-
  Use when the user invokes apihub-release-announce, or pastes a GitHub release URL of
  Netcracker/qubership-apihub and asks to announce that product release.
---

# Announce a published product release

The only input is the GitHub release URL. Do not ask for a slogan, a date, a file list, or whether to push.
Invoking this skill is the request to update the landing, commit and push that to `develop`, write the Mattermost
post, and generate the poster.

The product repository is `Netcracker/qubership-apihub`. A product tag is `X.Y.Z` with no component prefix. A URL
whose tag looks like `portal-backend/1.24.0` is a module release. Stop and ask for the product tag.

Read and follow `apihub-landing-refresh` for the release card. This skill adds the commit target, the post, and
the poster. Also follow `english-developer-style` and `markdown-line-length-120` for the card and the commit
message.

## 1. Read the release

Parse the tag from the URL. Fetch the notes with:

```bash
gh release view <tag> --repo Netcracker/qubership-apihub
```

Take the version, the published date, the sprint, the breaking changes, the feature groups, the fix themes, the
Helm chart version, and the agent image version from those notes. Do not invent a date or a version. Write the
card date as `Month D, YYYY`, from the release's published timestamp, in English.

Read the newest card in `sites/landing/src/content/releases/` and match its voice. Copy its shape, not its topics.

## 2. Edit origin/develop, not the current branch

The Pages site publishes from `develop`. The announcement commit goes there, not through a pull request. The
release-process step "Add the landing release card" is the pull request into `release` before the tag exists. This
skill runs after the tag is published.

Always edit in a detached worktree of `origin/develop`, so the user's current branch and dirty files stay put.
Put the worktree next to the clone, not inside it.

```bash
git fetch origin develop
git worktree add --detach ../qubership-apihub-release-announce origin/develop
```

If `sites/landing/src/content/releases/v<X>-<Y>-<Z>.md` already exists and `latest: true` is already on it, and
`README.md` and `docs/README.md` already name this version, do not rewrite them. Still write the post and the
poster.

Otherwise edit only:

- the new card `sites/landing/src/content/releases/v<X>-<Y>-<Z>.md`
- the previous card, and only to set `latest: false`
- the "latest product release" sentence in `README.md`
- the "current product release" sentence in `docs/README.md`

Card rules from `apihub-landing-refresh`: three to five highlights, in the voice of the existing cards, about what
a user can now do. Body sections follow the newest card: a short intro, the feature groups, install (Helm chart
and agent image, with the versions from the notes), and a short fixes list. Set `latest: true` on the new card.
Do not type the version into `src/pages/*.astro` or `src/data/content.ts`. The hero badge and the Latest Release
stat come from `src/lib/latest-release.ts`.

Do not edit historical cards, ADRs, `Chart.yaml` `appVersion`, release-process examples, or lockfiles.

Add a sentence to the user guide or the architecture docs only when this release changes a control that page
already documents and the sentence is missing. When `develop` already describes the behavior, leave the page.

## 3. Verify the landing

From the worktree root:

```bash
pnpm exec nx run landing:build
```

A fresh worktree has no `node_modules`. Junction the main clone's root `node_modules` and
`sites/landing/node_modules` into the worktree. On Windows, `cmd /c mklink /J`. On Linux and macOS, `ln -s`.

Before you delete the worktree, remove those junctions with `rmdir` (Windows) or by unlinking the symlink. Never
`Remove-Item -Recurse` a directory that still contains a junction. That command follows the junction and deletes
the main clone's `node_modules`.

The build must succeed. Confirm the built `sites/landing/dist/index.html` contains the new version.

## 4. Commit and push

Stage only the announcement files. Do not commit the poster.

```text
docs: record product release X.Y.Z on the landing and in the guides

The public site publishes from develop, and X.Y.Z was still missing from the release timeline and the docs home.
```

Do not change git config. Do not skip hooks. Do not force-push. Fetch `origin develop` again. Push with
`git push origin HEAD:develop` only when the commit is a fast-forward. If `develop` moved, rebase onto the new
`origin/develop` and push the fast-forward. If the push is rejected, stop and report the commit. Do not open a
pull request.

If the local `develop` branch is not checked out and it is an ancestor of the new `origin/develop`, fast-forward
it with `git branch -f develop origin/develop`.

Leave the worktree only after the junctions are gone, and run `git worktree remove` from a directory outside it.

## 5. Mattermost post

Write the post in English. Bravura and motivational, with many emojis. Do not list every work item. Group the
notes into a headline, four to six "also aboard" lines, one sentence of fixes, the breaking majors, the Helm
chart and the agent, the release URL, and a closer.

Mattermost drops empty lines, so a blank line glues paragraphs together. Separate paragraphs with a line that
contains one space. A chat transcript also drops a space-only line, so in the reply write each separator as a
line whose only character is `·`. Tell the user to replace each `·` line with a single space before pasting.

Deliver the post in one fenced `text` block, in this shape:

```text
🎉🚀 **APIHUB <version> is out. Production today.** 🚀🎉
·
<one paragraph: sprint, one tag, the whole product>
·
👀 **The big one**
<the headline capability, two or three sentences, with the major version that came with it>
·
🧭 **Also aboard**
✅ <theme>
✅ <theme>
✅ <theme>
✅ <theme>
·
🐛 <one sentence that groups the fixes>
·
⚠️ <the breaking majors, and a pointer to the breaking-changes block>
·
⎈ Chart `qubership-apihub` **<version>**, images pinned. Agent **<agent version>**.
·
🔗 <release url>
·
Ship it. 🏆☕
```

When the notes have no single headline, title that section "What landed" and do not invent one. Do not post the
message to Mattermost. The text is the deliverable.

## 6. Poster

Generate one square image with the harness image tool. If the user attached earlier posters, pass the two closest
"production today" posters as references. The style does not depend on them:

- Bold outlines, flat saturated colors, blue sky, clouds, yellow stars, golden sun.
- Title `APIHUB` in navy with a white outline, then the version in orange.
- A beige ribbon with three short beats taken from this release, such as
  "New viewer. Major version. Ship today."
- A truck or a train packed with crates, driving toward a golden arch labeled `PROD` and a sign `TODAY`.
- A Shiba Inu in a blue cap drives. A small white robot wears a cap `AGENT <agent version>`.
- Four to eight crate labels, short, ALL CAPS, each spelled once in the prompt, taken from this release.
- A navy bottom ribbon that reads `Production today!`, plus a coffee cup.

Use `Production today!` unless the user said the ship is delayed. Then match the banner to what they said.

The title, the version, the ribbon, `PROD`, `TODAY`, and the bottom banner must be spelled correctly. A misspelled
crate label can stay. If a headline is wrong, regenerate once. Do not show a second poster that is worse.

Do not commit the image. In the final reply, give its absolute path and embed it as a Markdown image. The user
reads the reply, not the tool log. A path mentioned only in passing is a missed deliverable.

## 7. Reply

Lead with the `develop` commit URL. Then the Mattermost post. Then the poster path and the image. Say that the
user's previous branch was left as it was.
