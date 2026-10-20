# Document Shareability - Design Document

## Summary

Package owners and admins need a way to mark individual documents within a package version as Shareable or Non-Shareable so that tech writers can independently determine which documents are safe to export and share with third parties \- without having to ask the package owner every time.

## Shareability Status

Each document in a package version has a shareabilityStatus property with one of three values:

| Value | Description |
| :---- | :---- |
| unknown | Default value. The owner has not yet reviewed this document's shareability. |
| shareable | The owner has confirmed this document can be shared with third parties. |
| non-shareable | The owner has confirmed this document must NOT be shared with third parties. |

### Default Behavior

High-level rules (detailed algorithm is under **Backend → Propagation Logic**):

* The **first published revision** of a **new package version** behaves as follows: if previousVersion is not set in the build config, all documents get unknown; if previousVersion is set, shareability is copied from that other version (matched by fileId), and new documents get unknown.  
* **Subsequent revisions** of the **same** package version continue shareability from the **previous published revision** of that version by default, so republish does not wipe manually set statuses.

UI \- Documents Tab

### Document List (All Users)

In the Documents tab of a package version, each document in the list displays a shareability icon to the right of the document name:

* Green share icon \- Shareable  
* Red share icon \- Non-Shareable  
* Grey share icon \- Unknown

All users (regardless of role) can see these icons.

**Tooltip**: Hovering over the shareability icon shows a tooltip with the current status label:

| Status | Tooltip Text |
| :---- | :---- |
| Shareable | Shareable |
| Non-Shareable | Non-Shareable |
| Unknown | Unknown shareability |

### Document Overview \- Read-Only (Viewer / Editor Roles)

When a user with a regular role selects a document, the document's overview page displays the shareability icon next to the document title. The icon is read-only \- no interaction is possible.

Tooltip: Hovering over the icon shows the same tooltip as in the document list.

### Document Overview \- Editable (Admin / Owner Roles)

When a user with admin or package owner role selects a document, the shareability icon next to the document title becomes a dropdown control. Clicking the dropdown reveals three options:

* Non-Shareable (red icon)  
* Shareable (green icon)  
* Unknown (grey icon)

Selecting a value updates the document's shareability status immediately.

Tooltip: Hovering over the icon (before clicking the dropdown) shows a tooltip with the current status, same as for read-only users.

## UI \- Export Dialog

APIHUB supports two types of export:

1. Package version export \- exports all documents from the selected package version.  
2. Single document export \- exports only the selected document.

The export dialog is updated to include shareability-aware behavior.

### Single Document Export

When exporting a single document, an alert banner is displayed at the top of the export popup reflecting the document's shareability status. No additional selection is needed since the user already chose a specific document.

| Document Status | Alert Style | Message |
| :---- | :---- | :---- |
| Shareable | Green (success) | Shareable document \- This document is marked as shareable by the package owner. |
| Unknown | Yellow (warning) | Unknown shareability \- The shareability status of this document is unknown. Contact the package owner to clarify. |
| Non-shareable | Red (danger) | Non-shareable document \- This document is marked as non-shareable by the package owner. |

The export button remains enabled in all cases \- the alert serves as an informational warning, and the user decides whether to proceed.

### Package Version Export

When exporting an entire package version, a new section called "Scope" is added at the top of the export popup, above all existing settings. It contains a radio-button group with two options:

* Only Shareable (default)  
* All Documents

#### **"Only Shareable"** Selected

| Condition | Alert Style | Message | Export Button |
| :---- | :---- | :---- | :---- |
| At least one shareable document exists | Green (success) | Shareable documents only \- {N} shareable documents out of {total} will be exported. | Enabled |
| No shareable documents; at least one unknown | Yellow (warning) | No shareable documents found \- No documents are confirmed as shareable in this version. Some documents have unknown shareability status. Contact the package owner to clarify. | Disabled |
| All documents are non-shareable | Yellow (warning) | No shareable documents found \- All documents in this version are marked as non-shareable by the package owner. | Disabled |

#### **"All Documents"** Selected

| Condition | Alert Style | Message | Export Button |
| :---- | :---- | :---- | :---- |
| All documents are shareable | Green (success) | All shareable \- All {total} documents will be exported. All are marked as shareable by the package owner. | Enabled |
| Has non-shareable and/or unknown documents | Red (danger) | Includes restricted documents \- All {total} documents will be exported, including {X} marked as non-shareable and {Y} with unknown shareability status. | Enabled |
| Has only unknown (no non-shareable) | Yellow (warning) | Unknown shareability \- {Y} documents have unknown shareability status. Contact the package owner to clarify.  | Enabled |

Note: If either X or Y is zero in the danger alert, that part of the sentence is omitted. For example, if there are 2 non-shareable and 0 unknown, the message reads: "All 9 documents will be exported, including 2 marked as non-shareable."

## 

## Backend

### **Database**

Add a shareability\_status column to the document table:

* Type: enum (unknown, shareable, non-shareable)  
* Default: unknown

### **Shareability Status API**

A new endpoint to update a document's shareability status:

* PATCH /api/v2/packages/{packageId}/versions/{versionId}/documents/{documentSlug}/shareability  
* Request body: { "status": "shareable" | "non-shareable" | "unknown" }  
* Required role: Package Owner or Admin

The existing GET /api/v2/packages/{packageId}/versions/{version}/documents endpoint must be extended to include shareabilityStatus in the response for each document. This field is needed by both the frontend (to display icons and compute alert messages) and the API Processor (to filter documents during export).

### **Propagation Logic (Version Creation)**

**Terms**

* **Package version** — the version string of a package (for example 1.0). It can have many **revisions** (successive publications).  
* **First revision** of a given package version — there is no prior **published** revision of that same version yet.  
* **Next revision** — at least one revision of that package version was already published.

Document matching for copying shareability uses the same identity rule as elsewhere in the product (for example **fileId**), unless the implementation uses another stable id documented for this flow.

**Goal**

Shareability must not be reset or overwritten on **republish** when owners or admins have already set statuses in an earlier revision (see related issue: Editor can republish without permission to edit shareability). The source of truth for “what to carry forward” depends on whether the publication is the **first** revision of a **new** version or a **later** revision of an **existing** version.

**A. Next revision of the same package version (not the first revision)**

1. By default, for each document in the new revision, copy **shareabilityStatus** from the **matching document in the immediately previous published revision** of the **same** package version.  
2. \*\*previousVersion in build config must not replace this line of revisions\*\* for shareability: do not re-apply “copy from the other package version” logic as if this were a brand-new version, when a prior revision already contains meaningful shareability data (see **C** for the narrow exception).  
3. **No mixing sources per document:** When **A** applies (next revision, and **C** does **not** apply because at least one document in the previous revision is not **unknown**), shareability is taken **only** from the previous revision — **per document**, from the matching row there. Do **not** merge or “enrich” a status by looking up previousVersion for the same **fileId** when the previous revision already supplies a value (including **unknown**).  
   **Example:** It is a next revision; previousVersion is present in the build config. For document D, the previous revision has **unknown**, but in the referenced previousVersion the same document is **shareable** (or any non-**unknown**). The new revision must keep D as **unknown** — values from previousVersion are **not** mixed in for that document. Exception **C** (use previousVersion) applies only when **every** document in the previous revision is **unknown**.

**B. First revision of a new package version**

When previousVersion **is** specified in the build config:

1. Backend loads documents in that referenced version and their **shareabilityStatus**.  
2. For each document in the new version, if a matching document exists in previousVersion (matched by **fileId**), copy **shareabilityStatus** to the new document.  
3. Documents with no match in previousVersion receive **unknown**.

When previousVersion is **not** specified, all documents receive **unknown**.

**C. Exception — “all unknown” in the previous revision \+ previousVersion appears later**

If the publication is a **next** revision (not the first), **and** in the **immediately previous published revision** every document has **shareabilityStatus \= unknown** (nothing was consciously set yet), **and** the current build config specifies \*\*previousVersion**, then shareability should be computed from \*\*previousVersion** using the same rules as in **B** (match by **fileId**, unmatched → **unknown**).

This covers the realistic case: revision 1 was published **without** previousVersion (everything defaulted to **unknown**), then revision 2 is published **with** previousVersion corrected — the system can populate from that other version without permanently locking “all unknown” from revision 1\.

If **any** document in the previous revision has a non-**unknown** status, **do not** use this exception: apply **A** (inherit from the previous revision only). Manual changes must not be overwritten by previousVersion.

**D. Unmatched or new documents**

If a document in the new revision cannot be matched to a source document in the chosen lineage (for example new file with no counterpart), use **unknown** unless product agrees on another explicit rule.

**Summary**

| Situation | Shareability source |
| :---- | ----- |
| First revision, previousVersion set | Other version (previousVersion), **fileId** match; else **unknown** |
| First revision, no previousVersion | All **unknown**  |
| Next revision; at least one document in previous revision is not **unknown** | Previous revision only (**A**). Do not overwrite with previousVersion |
| Next revision; every document in previous revision is **unknown**; current build has previousVersion | PreviousVersion (**C**), same rules as **B** |
| Next revision; every document in previous revision is **unknown**; current build has no previousVersion | Previous revision (still all **unknown**) |
| Next revision (**A**); for a given document: **unknown** in previous revision, but non-**unknown** in previousVersion | **unknown** in the new revision (copy from previous revision only; do **not** take the value from previousVersion for that document) |

### 

### **Export Flow**

The export flow works as follows:

1. **Frontend** sends an export request to the backend with allowedShareabilityStatuses — an array of shareability statuses to include in the export (e.g. \["shareable"\] for shareable-only, or \["shareable", "unknown", "non-shareable"\] for all documents).  
2. **Backend** creates a build and puts allowedShareabilityStatuses into the BuildConfig.  
3. **API Processor** receives the BuildConfig, reads the allowedShareabilityStatuses array.  
4. **API Processor** fetches the document list via GET /api/v2/packages/{packageId}/versions/{version}/documents — the response includes shareabilityStatus for each document (see Shareability Status API above).  
5. API Processor filters the list, keeping only documents whose shareabilityStatus is included in allowedShareabilityStatuses.  
6. API Processor then fetches content only for the filtered documents via GET /api/v2/packages/{packageId}/versions/{version}/files/{slug}/raw.

**ExportVersionReq \- new field:**

| Field | Type | Required | Default | Description |
| :---- | :---- | :---- | :---- | :---- |
| allowedShareabilityStatuses | string\[\] | No | \["shareable", "unknown", "non-shareable"\] | Array of shareability statuses to include in the export. Allowed values: shareable, non-shareable, unknown. Example: \["shareable"\] for shareable-only export. If not provided, all documents are included (backward-compatible behavior). |

**Context:** existing fields in ExportVersionReq are packageId, version, format, removeOasExtensions. The new field allowedShareabilityStatuses follows the same array-based pattern as allowedOasExtensions in BuildConfig for consistency.

**BuildConfig \- new field:**

| Field | Type | Required | Default | Description |
| :---- | :---- | :---- | :---- | :---- |
| allowedShareabilityStatuses | string\[\] | No | \["shareable", "unknown", "non-shareable"\] | Passed through from ExportVersionReq. Used by API Processor to filter documents during export by shareability status. If not provided, all documents are included. |

**Context:** existing fields in BuildConfig include packageId, version, buildType, format, allowedOasExtensions, documentId, operationsSpecTransformation, etc. The new field follows the same array-based naming convention as allowedOasExtensions.

The ExportOASDocumentReq (single document export) does not need this field since it already targets a specific document by documentId.

API Processor

During export, the API Processor reads the allowedShareabilityStatuses array from the BuildConfig. It filters the document list (fetched from the backend) to include only documents whose shareabilityStatus is present in the allowedShareabilityStatuses array, and then fetches content only for the remaining documents.

Permissions 

| Action | Required Role |
| :---- | :---- |
| View shareability icon on document list | Any role |
| View shareability icon on document overview | Any role |
| Change shareability status of a document | Package Owner or Admin |

## Mockups
<img src="https://github.com/user-attachments/assets/0a993454-aa5c-4d6d-b7cb-80a0a410b8c9" width="100%">