<!--
TEMPLATE: T1 — Single-Flow Design
USE WHEN:
  - Feature = one screen / one popup / one user workflow
  - No significant backend logic (everything fits under "API to ..." sub-bullets)
  - No multiple independent UI zones
  - Target length: 50-150 lines

EXAMPLES IN WIKI:
  - DI-Portal-PKGVER-017 Copy Package Version
  - DI-Portal-PKGVER-018 Export Package Version
  - DI-Portal-COE-001 API Audience (x-api-audience)

HOW TO USE:
  1. Delete every HTML comment (lines starting with <!--) before publishing.
  2. Replace every <PLACEHOLDER> with real content.
  3. Keep section names exactly as written — automation relies on them.
  4. If a section truly does not apply, delete it, don't leave empty.
-->

|                          |   |
| ------------------------ | - |
| **Design Item ID**       | <DI-Portal-PKGVER-XXX> |
| **Design Item Name**     | <Short feature name, Title Case> |
| **Related Design Items** | <[Related Item Name](https://github.com/Netcracker/qubership-apihub/wiki/...)><br><[Related Item Name](https://github.com/Netcracker/qubership-apihub/wiki/...)> |
| **Related API**          | • <Human name of endpoint> (HTTP METHOD /path)<br>• <Human name of endpoint> (HTTP METHOD /path) |
| **Revision History**     | • DD.MM.YYYY — Initial version.<br>• DD.MM.YYYY — <What changed and why>. |

***

# Description

<2-5 sentences describing what the feature does and why it exists. Mention the user persona that benefits (tech writer, package owner, QA, etc.) if relevant.>

<!-- Optional 1-line note about scope boundary, e.g.:
**Note:** The functionality is not supported for dashboards (neither via UI nor API). -->

# Start Point

1. User navigates to <APIHUB Portal → workspace → group → package → version → ... tab>.

# Execution

1. <First user action — e.g. "User clicks **Copy** button.">
   <!-- Add a "Note:" sub-bullet here if there's a non-obvious rule about this step,
        e.g. when the button is disabled, or when a field is auto-filled. -->
2. <System response / what user sees next. Describe fields, defaults, validation, tooltips.>
   - <Sub-bullet: field 1 — required/optional, default value, where values come from>
     - API to get list — <HTTP METHOD /path>:
       - <param> = <value or source>
       - <param> = <value or source>
   - <Sub-bullet: field 2 — ...>
3. <Next user action — e.g. "User fills required fields and clicks **Save**.">
4. <System action — e.g. "The system <does X>.">
   - API to <do X> — <HTTP METHOD /path>:
     - <param> = <value or source>
     - <param> = <value or source>
   - <Optional polling/async endpoint:>
   - API to get status — <HTTP METHOD /path>:
     - <param> = <value or source>
5. <Success/failure notification and post-action state.>

<!-- If there are branching cases (e.g. "if the version has no OpenAPI document, skip step X"),
     write them inline at the relevant step, not as a separate section.
     Example from Export Package Version wiki page:
     "2. The system checks if current version has at least one OpenAPI document;
      if so, go to step 3. If there is no OpenAPI document, the system immediately
      exports version, i.e. go directly to step 8." -->

# Security

<One line, e.g.: "User must have 'read' permission for the package to export package version.">
<!-- Remove this section if there are no special permission requirements beyond default package access. -->

# Mockups

<Paste a Figma link or an image reference to the mockup.>
![<alt text>](<Figma link or GitHub asset URL>)
