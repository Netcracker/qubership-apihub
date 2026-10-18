#!/usr/bin/env node
/**
 * Render the plan job's decision as a GitHub job summary.
 *
 * WHAT THIS DELIBERATELY DOES NOT DRAW
 *
 * The first version of this script drew the job graph — plan -> js -> screenshot-tests /
 * images -> ci-ok, coloured by run/skip. That was useless: GitHub already renders exactly
 * that in the run view, out of the box, with the same skip states. A summary that repeats
 * the surrounding UI costs a scroll and returns nothing.
 *
 * WHAT IS ACTUALLY INVISIBLE
 *
 * The Nx project graph. GitHub shows five jobs; it cannot show that `js` scheduled 15 tasks,
 * that 1 of them rebuilt and 14 were served from cache, or which upstreams those were. That
 * is where the run's cost comes from and none of it appears anywhere else:
 *
 *   - which projects changed, versus which were only pulled in by `dependsOn: ["^build"]`
 *   - therefore why an incremental push is ~4.5 minutes rather than ~20
 *   - what the skip actually saved, in tests rather than in the word "skipped"
 *
 * A skipped job also looks identical whether the skip was correct or a bug in the affected
 * computation, and job selection has no equivalent of Nx's `Cache: N/N hit` line to read —
 * which is how a .dockerignore change once shipped unvalidated. So the reasoning is rendered
 * rather than left to be inferred from an absence.
 *
 * Usage:
 *   node tools/ci/plan-summary.js <graph.json> <affected.json> <shots.json> <images.json> \
 *        <forced-reason-or-empty> <go.json> >> "$GITHUB_STEP_SUMMARY"
 */
const fs = require('fs')
const path = require('path')

const [graphPath, affectedRaw, shotsRaw, imagesRaw, forcedRaw, goRaw] = process.argv.slice(2)
const graph = JSON.parse(fs.readFileSync(path.resolve(graphPath), 'utf8')).graph
const affected = new Set(JSON.parse(affectedRaw))
const shots = JSON.parse(shotsRaw)
const images = JSON.parse(imagesRaw)
const forced = (forcedRaw || '').trim()
// Optional: a caller that predates the go job passes five arguments and still renders.
const go = goRaw ? JSON.parse(goRaw) : []

const out = []
const say = (s = '') => out.push(s)
const id = (n) => 'p_' + n.replace(/[^A-Za-z0-9_]/g, '_')
const gid = (c) => 'g_' + c.replace(/[^A-Za-z0-9_]/g, '_')

/** Everything a project transitively depends on — the tasks `^build` drags into the graph. */
function upstreamsOf(root) {
  const seen = new Set()
  ;(function visit(n) {
    for (const d of graph.dependencies[n] || []) {
      if (seen.has(d.target)) continue
      seen.add(d.target)
      visit(d.target)
    }
  })(root)
  return seen
}

say('## What this run builds, and what it reuses')
say()

if (!affected.size) {
  say('**Nothing affected** — no project changed, so `js` scheduled no tasks at all and there')
  say('is no build graph to draw.')
  say()
  if (images.length) {
    // The image jobs run while nothing is affected, and that is now the NORMAL case rather
    // than a forcing rule firing. They are not selected by `affected` at all: whether
    // :dev / :next / :feature-x points at the right image is a fact about the REGISTRY, and
    // `affected` only knows what changed between two commits. Expect a retag of about a
    // second unless the content hash is genuinely new.
    //
    // The wording here has been wrong in both directions and both are worth remembering. It
    // first asserted flatly that "the two matrix jobs are skipped", and run 33894555872
    // printed exactly that while both image jobs were running and retagging — contradicted
    // three lines later by this script's own table. It was then rewritten to explain the
    // images by the forcing rule, which has since stopped being why they run. A summary that
    // states a skip which did not happen, or a reason which is no longer the reason, is the
    // same defect as a step reporting a success it did not achieve — and worse here, because
    // this file exists to be the thing you can believe about job selection.
    say('The screenshot jobs are skipped. The image jobs are **not**: they always run, so this')
    say("ref's floating tag cannot go stale. Expect a retag rather than a build.")
  } else {
    say('Every matrix job is skipped. Images are **not** gated on `affected`, so an empty image')
    say('list here means the plan job computed one wrongly — read it as a defect, not a saving.')
  }
  say()
} else {
  // The build closure: what changed, plus everything dragged in by dependsOn ["^build"].
  const changed = [...affected].sort()
  const upstream = new Set()
  for (const p of changed) for (const u of upstreamsOf(p)) if (!affected.has(u)) upstream.add(u)

  const total = changed.length + upstream.size
  say(
    `\`js\` schedules **${total} build task${total === 1 ? '' : 's'}**: ` +
      `**${changed.length} rebuilt** because ${changed.length === 1 ? 'it' : 'they'} changed, and ` +
      `**${upstream.size} expected from cache** — pulled in by \`dependsOn: ["^build"]\` ` +
      'because a consumer needs their `dist`, not because anything about them moved.',
  )
  say()
  say('This is the whole of why an incremental push costs minutes rather than tens of minutes,')
  say('and it is the one thing the job graph above cannot show.')
  say()

  // NODES: the changed projects plus their DIRECT dependencies. Drawing the transitive
  // closure produced 20 nodes and 80 edges for a one-project change — a hairball that says
  // less than the sentence above it. The readable question is "what does the thing I changed
  // consume", and the transitive rest is a count, not a picture.
  //
  // EDGES: every dependency edge whose consumer is a changed project and whose dependency is
  // drawn — which INCLUDES changed-to-changed edges. Filtering edges on `direct` alone is
  // indistinguishable from this while ONE project changes, because a single changed project
  // has no changed dependencies, and it is decisive once many do. Measured on the affected
  // set of run 33889988315: 30 of 33 projects affected, so `direct` held exactly one node and
  // **99 of the graph's 100 edges ran between changed projects**. A `direct`-only edge filter
  // draws that run as 31 boxes and one arrow.
  //
  // There is NO node cap. There was one, at 18, and it fired on precisely the runs where the
  // picture is worth the most: a push to `.gitignore`, the lockfile or any root config makes
  // everything affected, and what the cap printed instead was a comma-separated list of 30
  // project names — the same data in its least legible form, with the structure removed. The
  // whole workspace is 33 nodes and 100 edges, about 5 KB of Mermaid, which is nowhere near
  // GitHub's limits on either the diagram or the summary.
  const direct = new Set()
  for (const p of changed) for (const d of graph.dependencies[p] || []) if (!affected.has(d.target)) direct.add(d.target)
  const transitiveOnly = upstream.size - direct.size
  const drawn = new Set([...changed, ...direct])

  // SUBGRAPHS: one box per component, where a component is the first two segments of the
  // project root — `frontend/apispec-view/packages/elements` belongs to `apispec-view`. Nx
  // names do not carry that reliably (`apispec-view` is the elements package, `ui-root` the
  // ui workspace root), the directory does. A box is drawn only around TWO or more drawn
  // nodes: a box around one project repeats its name and adds a border.
  //
  // Subgraph ids take a `g_` prefix because a component and a project can share a name —
  // `apispec-view` is both, and Mermaid resolves a duplicate id to one element.
  const componentOf = (p) => {
    const root = graph.nodes[p] && graph.nodes[p].data && graph.nodes[p].data.root
    return root ? root.split('/').slice(0, 2).join('/') : p
  }
  const byComponent = new Map()
  for (const p of [...changed, ...[...direct].sort()]) {
    const c = componentOf(p)
    if (!byComponent.has(c)) byComponent.set(c, [])
    byComponent.get(c).push(p)
  }
  const node = (p, indent) => say(`${indent}${id(p)}["${p}"]:::${affected.has(p) ? 'changed' : 'cached'}`)
  const boxes = [...byComponent].filter(([, ps]) => ps.length > 1).sort(([a], [b]) => a.localeCompare(b))

  say('```mermaid')
  say('flowchart BT')
  for (const [c, ps] of boxes) {
    say(`  subgraph ${gid(c)}["${c.split('/').pop()}"]`)
    for (const p of ps) node(p, '    ')
    say('  end')
  }
  for (const [, ps] of byComponent) if (ps.length === 1) node(ps[0], '  ')
  for (const p of changed) {
    for (const d of graph.dependencies[p] || []) {
      if (drawn.has(d.target)) say(`  ${id(d.target)} --> ${id(p)}`)
    }
  }
  // Colours borrow the Actions job graph's own semantics, so the two diagrams on one page
  // do not disagree about what a colour means: ATTENTION amber for a task that will actually
  // run, NEUTRAL grey for one that will not. Grey is the job graph's skipped, and a cache hit
  // is a skipped task; green is deliberately unused, because at plan time nothing has
  // succeeded and green would read as a passing job rather than an expensive one.
  //
  // The values are Primer's, read off a rendered Actions page rather than guessed, and each
  // is ONE value that has to serve BOTH themes — a classDef is static, and the summary is
  // rendered in whichever theme the reader uses:
  //
  //             light                dark                 chosen
  //   amber     #9a6700 / #fff8c5    #d29922 / #bb800926   stroke #bf8700, fill #bb800933
  //   grey      #59636e / #818b981f  #9198a1 / #656c7633   stroke #818b98, fill #818b9826
  //
  // The fills are alpha over the page background, which is how Primer itself builds its dark
  // "muted" backgrounds, so one value composites correctly on #fff and on #0d1117. The
  // strokes sit between each theme's pair. `color` is deliberately NOT set: the previous
  // classDefs hardcoded #fff and #adbac7, which is a bet that every reader is in dark mode.
  // Leaving it unset lets Mermaid's own theme supply the text colour, which is the only part
  // that must track the background exactly.
  say('  classDef changed fill:#bb800933,stroke:#bf8700,stroke-width:2px')
  say('  classDef cached fill:#818b9826,stroke:#818b98,stroke-width:1px')
  // The component box must not read as a third task state, so it takes no amber and almost
  // no fill — a dashed grey outline over a fill faint enough to stay behind both node fills
  // in either theme. Without it Mermaid's default cluster fill is a pale yellow in the light
  // theme, which sits next to amber and looks like a weaker "changed".
  if (boxes.length) {
    say('  classDef component fill:#818b980d,stroke:#818b98,stroke-width:1px,stroke-dasharray:4 3')
    say(`  class ${boxes.map(([c]) => gid(c)).join(',')} component`)
  }
  say('```')
  say()
  say('Amber is work this run will actually do; grey is a cache restore — the same amber and')
  say('grey the Actions job graph uses for running and skipped. Arrows run dependency →')
  say('consumer, which is the order the tasks execute in.')
  if (boxes.length) say('Dashed boxes group the projects of one component directory; they are not tasks.')
  say()
  if (transitiveOnly) {
    say('Nodes are the changed projects and their **direct** dependencies. The other')
    say(`**${transitiveOnly}** in the closure are reached through these and are cache restores`)
    say('for the same reason.')
  } else {
    say('Nodes are the changed projects and their **direct** dependencies; nothing else in the')
    say('workspace is upstream of them.')
  }
  say()
}

// ---- what the skips actually saved, in units that mean something ------------------------
const SUITE_SIZE = { 'api-doc-viewer': 947, 'apispec-view': 883, 'class-view': 58 }
const allShots = Object.keys(SUITE_SIZE)
const skippedShots = allShots.filter((s) => !shots.includes(s))
const skippedTests = skippedShots.reduce((n, s) => n + SUITE_SIZE[s], 0)

say('| | Selected | Not run |')
say('|---|---|---|')
say(
  `| screenshot suites | ${shots.length ? shots.map((s) => `\`${s}\` (${SUITE_SIZE[s]})`).join(', ') : '_none_'} | ` +
    (skippedTests ? `**${skippedTests.toLocaleString("en-US")} screenshot tests**, ~20 min of container time` : '_none_') +
    ' |',
)
say(
  `| go modules | ${go.length ? go.map((s) => `\`${s}\``).join(', ') : '_none_'} | ` +
    (go.length ? 'built and unit tested in the `go` job' : 'the `go` job is skipped — not passed with nothing to do') +
    ' |',
)
say(
  `| images | ${images.length ? images.map((s) => `\`${s}\``).join(', ') : '_none_'} | ` +
    (images.length ? 'built if the content hash is new, else retagged in ~1s' : '_none — this should not happen; images are not gated on affected_') +
    ' |',
)

// Images are no longer SELECTED by `affected` — both always run, because whether a floating
// tag points at the right image is a fact about the registry and `affected` only knows about
// commits. So this block no longer explains a forcing rule; it just names the inputs that
// changed outside every Nx project, which is still worth seeing because they are the ones a
// reader is most likely to think could not affect an image.
if (forced) {
  say()
  say('**Image inputs changed outside every Nx project** — `nx affected` cannot see these, and')
  say('before images ran unconditionally they were the case that shipped unvalidated:')
  say()
  say('```text')
  say(forced)
  say('```')
}

process.stdout.write(out.join('\n') + '\n')
