# Functional design templates (APIHUB Portal)

Canonical **T1**, **T2**, and **T3** skeletons for the `apihub-functional-design` skill. They are deployed with the
skill under `.agents/skills/apihub-functional-design/templates/`.

| Template | File | Use when |
| -------- | ---- | -------- |
| **T1 — Single flow** | [T1-single-flow.md](T1-single-flow.md) | One screen or popup, one linear workflow; backend fits under Execution API sub-bullets (~50–150 lines). |
| **T2 — Multi-zone** | [T2-multi-zone.md](T2-multi-zone.md) | Several UI areas (tabs, dialogs) **or** dedicated Backend section; Use Cases as Description \| UI \| API tables. |
| **T3 — Platform** | [T3-platform.md](T3-platform.md) | New API type/domain or 4+ tabs; mandatory **Scope** table; Data Collection, Build Result, Extensions. |

**Examples in the repository (prose and depth):** `docs/design/contract-types/asyncapi-publishing.md` and
`docs/design/contract-types/asyncapi.md` (both T3).

Before publishing: remove HTML comments from the template, replace placeholders, keep section headings exactly as in
the template file.
