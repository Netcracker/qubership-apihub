# Review brief — JSO

Shared rules: [../SKILL.md](../SKILL.md).

## Scope

| Layer | Paths |
| --- | --- |
| Viewers | `packages/api-doc-viewer/src/components/JsoViewer/` (`JsoViewer`, `JsoDiffsViewer`, `JsoValue/`, `embedding/`) |
| Data model | `packages/next-data-model/src/{model,building-service,shared}/jso/` |

Out of scope: `stories/`, `it/`, `samples/`.

## Design

- Diffs specification: `docs/design/jso/features/diffs.md` (acceptance criteria and open questions)
- Shared: `docs/design/shared/`

## Focus

- **Acceptance criteria 1–9** of the diffs specification hold in code.
- **Parallel stacks.** JSO keeps plain and with-diffs builders side by side
  (`JsoTreeWithDiffsBuilder extends TreeWithDiffsBuilder`); look for duplication between the two
  stacks that the default plain → with-diffs inheritance would remove.
- **Reserved `value` diff key.** Read defensively, never written — resolve open question 2.
- **Large inline metadata literals** in `node-diffs/kind-any.ts` (per transition style blocks):
  extract into named builders without changing behaviour.
- **Missing with-diffs unit tests** in `packages/next-data-model/tests/`.
- **Context overriding** when embedded in AsyncAPI and JSON Schema (open question 3).
