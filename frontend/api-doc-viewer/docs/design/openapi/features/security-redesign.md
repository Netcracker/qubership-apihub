# Security section redesign — understanding of the requirements (draft)

Status: **approved and implemented** (2026-10-13) for OpenAPI; AsyncAPI server security is a
later step (§5). The normative rules now live in [../entities/security.md](../entities/security.md);
this file keeps the approved sketches. Interpretations Q-S1–Q-S9 below were approved as written.

The templates below are text sketches, not pixel layouts:

- `[ … ]` is a selector button;
- `‹` / `›` are the arrow buttons;
- `*` is the red required asterisk;
- `(gray …)` is secondary gray text;
- `{link}` is an anchor;
- `▾` / `▸` are the expanded / collapsed expander;
- `░` is a gray (absent-side) area;
- `▒R` / `▒G` / `▒Y` are red / green / yellow row backgrounds;
- `⟦…⟧` is a text highlighter.

Side-by-side diff sketches put the origin side on the left and the changed side on the right,
separated by `│`.

---

## 1. Section and `security toolbar` (plain)

```text
Security                                                        h2 (OpenAPI); h3-sized when reused in AsyncAPI servers
‹  [oauth_main]  [api_key + request_signature]  [very-long-scheme-na…]  ›
┌──────────────────────────────────────────────────────────────┐
│ …cards of the selected alternative (AND)…                     │
└──────────────────────────────────────────────────────────────┘
```

- **Layout.** The toolbar is one row: the left arrow, a horizontally scrollable single-line strip
  of options, and the right arrow. The options strip does not wrap.
- **Arrow states:**

  | State | When | Look and behaviour |
  | --- | --- | --- |
  | Disabled | the strip is at its left edge (‹) or right edge (›) | gray, no hover, no pointer cursor, not clickable |
  | Enabled | otherwise | blue, hover state, pointer cursor; one click scrolls the strip by exactly one option |

- **Long option titles** are cropped with an ellipsis. Each button has a minimum width that keeps
  at least one character plus `…` visible: `[v…]` is the narrowest allowed rendering.
- **Arrows when everything fits.** Interpretation: both arrows are still shown, both disabled, so
  the row does not jump when options change.

## 2. Security props grid (shared by every card)

```text
┌──────────────────────────────────────────────────────────────────────┐
│ api_key                   (gray API key)                              │  title row: name + gray type text
│ Key issued in the developer portal.                                   │  description row (markdown)
│                                                                       │
│ Header parameter name     X-API-Key                                   │  security prop
│ ◄── label column ──►◄gap►◄── value column ──►                          │
└──────────────────────────────────────────────────────────────────────┘
```

- **Type text.** The title row's subheader is plain gray text, not a badge. It uses the same font
  size and color as the type label in JSON Schema property rows / DDL index columns.
- **Description** is the row right after the title.
- **Security props** are rows of one CSS grid per card: `grid-template-columns: max-content 1fr`
  with a large fixed `column-gap`, so values align across all props of the card.
  - Labels use the JSON Schema node-title font (size and weight); values use the regular value
    font.
  - Interpretation of "big fixed gap between all such rows": a **fixed column gap** between label
    and value, about 40px, the same in every card.

## 3. Cards per scheme type (plain)

### apiKey

```text
api_key                   (gray API key)
<description>
Header parameter name     X-API-Key          ← label from `in`: Header / Query / Cookie
```

The former `In` and `Name` rows merge into this single prop. The label prefix follows `in`
(`Header`, `Query`, `Cookie`; `Path` only if a document ever uses it); the value is `name`.

### http basic / http bearer (JWT, PAT, …)

```text
basic_auth                (gray HTTP)
<description>
HTTP Authorization Scheme basic               ← value from `scheme`, never hard-coded

bearer_jwt                (gray HTTP)
<description>
HTTP Authorization Scheme bearer
Bearer Format             JWT                 ← only when `bearerFormat` exists ("PAT" for a PAT scheme)
```

### openIdConnect / mutualTLS (simple cards, as for basic / bearer)

```text
oidc                      (gray OpenID Connect)
<description>
OpenID Connect URL        {https://auth.example.com/.well-known/openid-configuration}
Scopes ▾                                         own list (final 2026-10-14), no Required scopes prop
    openid *

mtls                      (gray Mutual TLS)
<description>                                 ← no security props
```

### oauth2: one part per flow

```text
oauth_main                (gray OAuth 2.0)
<description>
┌────────────────────────────────────────────────────────────┐   flow header: background #EDF1F5, small paddings
│ Flow type **Authorization Code**                            │
└────────────────────────────────────────────────────────────┘
Authorization URL         {https://auth.example.com/authorize}
Token URL                 {https://auth.example.com/token}
Refresh URL               {https://auth.example.com/refresh}
Scopes ▾                                                         expandable row: label + expander, no value; expanded by default
    read:orders *         (gray Read orders)                      2nd-level props: 20px left indent
    write:orders          (gray Modify orders)
                                                                   ← fixed gap between flow parts
┌────────────────────────────────────────────────────────────┐
│ Flow type **Client Credentials**                            │
└────────────────────────────────────────────────────────────┘
Token URL                 {https://auth.example.com/token}
Scopes ▸                                                         collapsed: scope rows hidden
```

- **Flow names:** `Implicit`, `Password`, `Client Credentials`, `Authorization Code`, shown at
  `font-weight: 500` after the plain text `Flow type`.
- **URL props** (Authorization / Token / Refresh / OpenID Connect URL) render as links.
- **2nd-level scope rows:** `<20px indent> scope-name <* if required> <grid gap> <gray description>`,
  plus in diffs mode a `required` badge after the description (§4.5). These rows use their own
  nested grid, so their gap and indent do not change the alignment of the 1st-level props.
- **Which scopes are "required":** a scope is required when the selected security requirement
  lists it (today's `Required scopes` row). The separate `Required scopes` row disappears for
  oauth2; required scopes are marked with `*` in every flow that defines them.

## 4. Diffs

### 4.1 Nothing changed

Both sides show the same card content.

### 4.2 Whole alternative (toolbar option) added or removed

```text
▒Y ‹  [oauth_main]  [api_key]       ›  │ ▒Y ‹  [oauth_main]  [api_key]  [(green border) basic]  ›
                                        │
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ ▒G basic_auth           (gray HTTP)         ← selected added option:
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ ▒G HTTP Authorization Scheme  basic             content on the changed side only
```

- The whole toolbar row gets the `diff replace` background (yellow), on both sides.
- The added or removed option button keeps its usual green or red border shadow.
- When that option is selected, its content renders on one side only (changed for added, origin
  for removed); the other side is empty and gray.

### 4.3 Some rows of a card changed

```text
api_key        (gray API key)              │ api_key        (gray API key)
▒Y Header parameter name  ⟦X-API-Key⟧      │ ▒Y Header parameter name  ⟦X-Orders-Key⟧    ← replace: yellow row + value highlighter
▒Y ⟦Header⟧ parameter name  X-API-Key      │ ▒Y ⟦Query⟧ parameter name   X-API-Key       ← `in` replace: yellow row + highlighter on the place word only
░░                                          │ ▒G Bearer Format          JWT               ← add: green row, no highlighter
▒R Refresh URL  {https://…/refresh}         │ ░░                                          ← remove: red row, no highlighter
```

- Only the changed row is colored: yellow for `replace`, green for `add`, red for `remove`.
- A value highlighter is used for `replace` only; added and removed values are not highlighted
 (requirement Diffs-4).
- An apiKey location (`in`) replace highlights only the place word of the label (`Header`,
  `Query`, `Cookie`, `Path`); the `parameter name` part and the value stay unhighlighted.

### 4.5 A scope's "required" changed (OAuth2)

```text
    read:orders *  (gray Read orders) [required ▒R]   │     read:orders    (gray Read orders)              ← no longer required
    write:orders   (gray Modify orders)                │     write:orders * (gray Modify orders) [required ▒G]   ← became required
```

- The `*` shows on the origin side when removed and on the changed side when added (the existing
  `RequiredStar` side rule).
- The diff-colored `required` badge goes **after** the scope description, the gray second-column
  value, as agreed for consistency.

### 4.6 Whole block added or removed (flow part, or a whole card while its alternative stays)

```text
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ ▒G ┌ Flow type **Authorization Code** ┐
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ ▒G Authorization URL  {…}
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ ▒G Scopes ▾
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ ▒G     read:orders   (gray Read orders)
```

Every row of the block is painted green (added, changed side) or red (removed, origin side); the
opposite side is empty gray. This applies to a whole flow part, and to a whole card added to or
removed from an alternative that exists on both sides.

### 4.7 Spacing inside a card

- Vertical spacing between card rows is **padding inside each row**, never margins or gaps between
  rows. Neighbouring highlighted rows then form one continuous colored block without white seams.
- The same rule covers the flow-header row and the 2nd-level scope rows.
- Flow parts are sub-blocks: a 12px separator row between them, coloured by the rows around it.
- **Superseded 2026-10-15:** the card's top / bottom edges are content-less frame rows with the
  border in the middle, coloured by the whole-card diff ([block-separators.md](block-separators.md)).

## 5. Reuse in AsyncAPI servers

```text
Servers
  production  [mqtt]  mqtt://broker.example.com
  Security                                                   h3-sized header (smaller than OpenAPI's h2)
  ‹ [user_password] [x509] ›
  ┌ user_password  (gray User/Password) ┐  …same cards, same diffs rules…
```

- **Shared components.** The toolbar, the cards, the props grid, the flow parts and the scope rows
  move to `shared-components/Security/`. They take the header level as a prop.
- **Data-layer adapters.** The cards read a common view model, produced by a per-spec data-layer
  adapter (OpenAPI now, AsyncAPI later).
- **AsyncAPI data model gap.** next-data-model has **no** security support for AsyncAPI servers
  today. Reuse needs the data layer first: an AsyncAPI security transformer, nodes and diffs.
- **AsyncAPI-only scheme types** (`userPassword`, `X509`, `symmetricEncryption`,
  `asymmetricEncryption`, `plain`, `scramSha256`, `scramSha512`, `gssapi`, plus `httpApiKey` with
  `in: query | header | cookie`) need labels and props of their own. `httpApiKey` maps to the same
  `<Place> parameter name` prop.

## 6. Interpretations and open questions

| Id | Point | My interpretation (used above) — confirm or correct |
| --- | --- | --- |
| Q-S1 | "Big fixed gap between all such rows" | A fixed **column** gap between label and value in one grid per card (about 40px), so values align; rows themselves have no vertical gaps (§4.7). |
| Q-S2 | Required scopes for oauth2 | Shown as `*` on the scope rows of every flow, replacing the separate `Required scopes` row. A required scope that no flow defines is still listed, in a trailing `Scopes` part. **Final (2026-10-14):** required scopes show only as `*` on scope rows; openIdConnect and OAS 3.1 roles get their own `Scopes ▾` / `Roles ▾` list (rows with `*`) instead of a `Required scopes` / `Required roles` prop. |
| Q-S3 | Required scopes for openIdConnect, and OAS 3.1 roles on other types | A plain security prop `Required scopes` / `Required roles` with a comma-separated value; diffs colour the row, with per-item highlighting as today. **Final (2026-10-14):** required scopes show only as `*` on scope rows; openIdConnect and OAS 3.1 roles get their own `Scopes ▾` / `Roles ▾` list (rows with `*`) instead of a `Required scopes` / `Required roles` prop. |
| Q-S4 | Display mode `simple` | Unchanged rule: title and type text always; description, security props, flow parts and scopes in `detailed` only. **Superseded (2026-10-31):** `simple` hides annotations only — scheme and scope descriptions ([../../shared/features/display-mode-annotations.md](../../shared/features/display-mode-annotations.md)). |
| Q-S5 | Toolbar arrows when all options fit | Arrows shown and disabled (no layout jump). Alternative: hide both arrows. |
| Q-S6 | Card frame | Kept (per-row frame segments); the new rows keep drawing their segment. |
| Q-S7 | Unresolved scheme (no definition in `components`) | Title + muted text row as today, no props. |
| Q-S8 | Scheme type changed (e.g. apiKey → http) | The gray type text gets a value highlighter on both sides, the props follow the per-row rules (old ones removed, new ones added); the title row is not painted. |
| Q-S9 | AsyncAPI reuse | Shared components now, AsyncAPI data layer and wiring as a separate later step (§5). |
