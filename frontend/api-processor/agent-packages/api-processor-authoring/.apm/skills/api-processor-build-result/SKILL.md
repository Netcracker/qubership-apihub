---
name: api-processor-build-result
description: Use when adding or changing anything that lands in an api-processor package version build result, so every list it contains comes out in a deterministic order.
---

# Ordering the api-processor build result

Every list serialized into a package version must come out in an order that depends only on content — never on
`Map` iteration, on which async task finished first, or on the host runtime. A migration rebuilds an
already-published version and diffs it against the stored one, so a list that merely reordered reads as a
changed build: a false regression on every rebuild.

`src/components/build-result-index.ts` is where that happens. Each ZIP entry's payload is shaped **and** sorted
by a `build*` function there, called from `createVersionPackage` (`src/components/package.ts`). Add a list the
same way, sorting it with that file's own `sortByKey` / `tupleKey` helpers — `buildNotifications` and
`buildComparisonsIndex` are the examples to copy. Do not sort at the site that produces the data or inside a
build strategy; one place to sort is one place to audit.

What a call site does not show:

- Sort on a key that is stable across rebuilds — an id, or `tupleKey` over ids and a revision. Never an array
  index, an insertion counter, a hash of mutable state, or a timestamp.
- Never `localeCompare`. Locale and ICU data differ between Node builds and browsers, which is exactly the
  cross-runtime nondeterminism this code exists to remove.
- `encodeKeyPart` throws on a number it cannot zero-pad. Let it throw — a defensive branch would turn a bad key
  into a silently wrong order.
- A new MCP or DDL entity kind is sorted automatically, provided it is registered both in `KIND_TO_FIELD` and
  in the grouping literal of `groupMcpEntitiesByKind` / `groupDdlEntitiesByKind`. Missing from the literal,
  `grouped[kind]` is undefined and the sort throws.

## What must stay unsorted

Sort only lists whose order came from `Map` iteration or async completion. These already follow spec parse
order and must be left alone: `operation.tags`, `operation.models`, `operation.deprecatedItems`,
`document.operationIds`, and `operation.deprecatedInPreviousVersions` — where a lexicographic sort would be
wrong anyway, putting `v10` before `v2` before `v9`. `config.refs` too: `createInfoFile` spreads the whole
config into `info.json`, so that list reaches the ZIP in the caller's order, already stable for a given input.
A sort was written for it once and then removed; do not restore it.

Sorting an already-deterministic field emits a one-time false "changed" diff on the next rebuild, the exact
false positive this ordering work exists to eliminate. Only `deprecatedInPreviousVersions` has a guard test, so
for the rest this rule is the whole net.
