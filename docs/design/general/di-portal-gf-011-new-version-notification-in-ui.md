# DI-Portal-GF-011 New version notification in UI

**Design Item ID**: DI-Portal-GF-011  
**Design Item Name**: New version notification in UI  
**Related Design Items**:

- [Activity History](../package-version/di-portal-pkgver-012-activity-history.md)

**Related API**:

- Get activity history for the package (GET /api/v4/packages/{packageId}/activity)
- Get package version content (GET /api/v3/packages/{packageId}/versions/{version})

**Revision History:**

| Date       | Description      |
| ---------- | ---------------- |
| 17.11.2026 | Initial version. |

***

## Description

While a user works inside a **package** or **dashboard**, they do not see when someone else publishes a **new version**
or **new revision** in that same entity. The Portal shows an **info** toast at the **bottom center** for such publishes
only when the event belongs to the **entity the user is in now**. Toast header and body follow Activity history wording,
with an extra header line for publication toasts. Version and revision names in the body are **inline links**, same
targets as Activity history.

This design also changes **dismiss behaviour for all Portal toasts** (success, error, info, warning): a toast stays until
the user closes it with **X** or, for publication toasts, follows a version/revision link. Clicks outside the toast, tab
switches, navigation, and elapsed time do **not** dismiss it.

**Note:** Publication toasts do **not** appear on the Main page without an open package/dashboard context. Publishes
in another accessible package while the user stays elsewhere do **not** produce these toasts (Activity history still
lists them).

## Flow 1 — Global toast dismiss behaviour

### Start Point

1. User navigates to APIHUB Portal (any page where a toast can appear).

### Execution

1. The system shows a toast at the **bottom center** (success, error, info, or warning).
2. The toast stays visible while the user continues work (clicks controls, switches tabs, opens an operation, navigates
   to Workspaces or another route).
3. The toast does **not** close after a timeout.
4. The toast does **not** close when the user clicks outside the toast (**click-away** is ignored).
5. User closes the toast with **X** on the toast, unless a specific toast defines another explicit dismiss (Flow 2,
   step 8, for publication links).

## Flow 2 — Publication toast in the current package or dashboard

### Start Point

1. User navigates to APIHUB Portal → workspace → group → **package** (or **dashboard**) → any sub-route of that entity
   (version tabs, operation view, settings, and so on).

### Execution

1. While the user stays in entity **N**, the UI watches for new `publish_new_version` and `publish_new_revision` events
   for **N** only.
   - API to read package activity — GET /api/v4/packages/{packageId}/activity:
     - packageId = \<current entity id from URL>
     - types = new_version, package_version (filter as today for publish events)
   - If another entity **M** is published while the user is in **N**, the system does **not** show a publication toast.
2. When a new version is published in **N**, the system enqueues one publication toast:
   - **Header:** **New version published**
   - **Body:** Published **{version}** version in {status} status in the {packageName} {kind} (same template as
     Activity history; {version} is a link to that version Summary).
   - UI (Mockup): [New version published](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=7846-556078)
3. When a new revision is published in **N**, the system enqueues one publication toast:
   - **Header:** **New revision published**
   - **Body:** Published **{@revision}** revision of **{versionKey}** version in {status} status in the {packageName}
     {kind} (same links as Activity history for `{@revision}` and `{versionKey}`).
   - UI (Mockup): [New revision published](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=7846-556962)
4. Each toast uses the **info** icon (blue).
5. If several publishes occur in **N**, the system shows at most **three** toasts at once, stacked (**newest on top**).
   Further events wait in a queue. When the user dismisses one visible toast, the next queued event appears so up to three
   remain visible.
   - UI (Mockup): [Stack of publication toasts](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=7937-568550)
6. User may keep working on the version/revision they already opened; the toast does not switch context automatically.
7. User closes one publication toast with **X**; only that toast is removed; others stay (Flow 1, step 5).
8. User clicks a **version** or **revision** link in the toast body. The system navigates to the linked Summary (same
   routes as Activity history) and **removes that toast** from the stack; other toasts remain.

## Mockups

Figma task page: [13705 — New version notification in UI](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=7846-556077)

- [New version published](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=7846-556078)
- [New revision published](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=7846-556962)
- [Stack of publication toasts](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=7937-568550)