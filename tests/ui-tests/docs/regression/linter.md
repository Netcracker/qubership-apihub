# Ruleset Management

## **Test Suite: Initial State and Core UI**

- **P-AQ-RM-UI-1 Verify Ruleset Management tab is hidden when linter is disabled:**
  - **Priority:** Major
  - **Prerequisites:** The API Linter feature is globally disabled in the system configuration.
  - **Steps:** Navigate to the API Quality section.
  - **Expected Result:** The Ruleset Management tab is not visible.

- **P-AQ-RM-UI-2 Verify initial state for admin:**
  - **Priority:** Critical
  - **Prerequisites:** User is logged in as a system administrator; the API Linter feature is enabled.
  - **Steps:** Navigate to the Ruleset Management tab.
  - **Expected Result:** The main header, API type selector (defaulting to OAS 3.0), enabled Add Ruleset button, and the
    ruleset table with correct columns are all visible.

## **Test Suite: Ruleset Creation**

- **P-AQ-RM-CREATE-1 Open, verify title, and close the Create Ruleset dialog:**
  - **Priority:** Normal
  - **Prerequisites:** User is on the Ruleset Management tab.
  - **Steps:** Click Add Ruleset, verify the dialog title, then click Cancel.
  - **Expected Result:** The dialog opens with the correct title (e.g., Create Ruleset for OAS 3.0) and then closes.

- **P-AQ-RM-CREATE-2 Create a new inactive ruleset:**
  - **Priority:** Critical
  - **Prerequisites:** A valid ruleset file is available; the name is unique.
  - **Steps:** Open the dialog, fill in a unique name, upload the file, and click Create.
  - **Expected Result:**
    - A success notification appears, and the new Inactive ruleset is in the table.
    - The `Created At` cell displays the current date in the format `DD MMM, YYYY` (e.g., "15 Jan, 2025").
    - The `Activation History` cell is empty/hidden (the ruleset has never been activated).

- **P-AQ-RM-CREATE-3 Attempt to create a ruleset with a duplicate name:**
  - **Priority:** Major
  - **Prerequisites:** A ruleset with a specific name already exists.
  - **Steps:** Attempt to create another ruleset with the same name as the existing one.
  - **Expected Result:** An error message appears in the dialog indicating the name is taken.

- **P-AQ-RM-CREATE-4 Attempt to create a ruleset without a name:**
  - **Priority:** Normal
  - **Prerequisites:** User is in the Create Ruleset dialog.
  - **Steps:** Upload a file but leave the name field blank.
  - **Expected Result:** The Create button remains disabled.

- **P-AQ-RM-CREATE-5 Attempt to create a ruleset without a file:**
  - **Priority:** Normal
  - **Prerequisites:** User is in the Create Ruleset dialog.
  - **Steps:** Fill in a name but do not upload a file.
  - **Expected Result:** The Create button remains disabled.

- **P-AQ-RM-CREATE-6 Attempt to create a ruleset with an invalid file extension:**
  - **Priority:** Normal
  - **Prerequisites:** A file with a non-YAML extension (e.g., `test.txt`) is available.
  - **Steps:**
    1. Open the dialog.
    2. Fill in a unique name.
    3. Attempt to upload the `test.txt` file.
    4. Click Create.
  - **Expected Result:** An error message is displayed within the dialog, indicating the file type is invalid. The
    dialog remains open.

## **Test Suite: Ruleset Activation**

- **P-AQ-RM-ACTIVATE-1 Activate a new ruleset and verify deactivation of previous active:**
  - **Priority:** Critical
  - **Prerequisites:**
    - One active ruleset exists.
    - One ruleset that has never been activated exists.
  - **Steps:**
    1. Click the Activate button for the inactive ruleset.
    2. Confirm the action in the dialog.
  - **Expected Result:**
    - The status of the target ruleset changes to Active.
    - Its activation history is updated and displays the format `"DD MMM, YYYY - ..."` (e.g., "15 Jan, 2025 - ...") for
      the active ruleset, where the date matches the current date.
    - No history icon is displayed (only one activation record).
    - The status of the previously active ruleset changes to Inactive.

- **P-AQ-RM-ACTIVATE-2 Verify Activate button is disabled for an already active ruleset:**
  - **Priority:** Normal
  - **Prerequisites:** An active ruleset exists.
  - **Steps:** Hover over the active ruleset's row.
  - **Expected Result:** The Activate button is disabled.

- **P-AQ-RM-ACTIVATE-3 Verify activation history tooltip for a ruleset with multiple activations:**
  - **Priority:** Major
  - **Prerequisites:** A ruleset has been activated, deactivated, and then activated again.
  - **Steps:** Hover over the info icon in the Activation History column for that ruleset.
  - **Expected Result:**
    - A tooltip appears, showing at least two activation records.
    - Each activation record displays dates in the format `DD MMM, YYYY` (e.g., "15 Jan, 2025").
    - The dates in the tooltip match the expected activation dates.

## **Test Suite: Ruleset Deletion**

- **P-AQ-RM-DEL-1 Verify deletion is disabled for an active ruleset:**
  - **Priority:** Major
  - **Prerequisites:** An active ruleset exists.
  - **Steps:**
    1. Hover over the active ruleset's row.
    2. Hover over the disabled Delete button.
  - **Expected Result:** The tooltip reads Cannot delete active ruleset.

- **P-AQ-RM-DEL-2 Verify deletion is disabled for a previously activated ruleset:**
  - **Priority:** Major
  - **Prerequisites:** A ruleset that was once active but is now inactive exists.
  - **Steps:**
    1. Hover over the relevant inactive ruleset's row.
    2. Hover over the disabled Delete button.
  - **Expected Result:**
    - The tooltip reads The ruleset cannot be deleted due to existing versions that have been validated against this
      ruleset.
    - The `Activation History` cell displays the format `"DD MMM, YYYY - DD MMM, YYYY"` (e.g., "15 Jan, 2025 - 16 Jan,
      2025") for the inactive ruleset with history, where both dates are in the correct format.

- **P-AQ-RM-DEL-3 Delete a never-activated inactive ruleset:**
  - **Priority:** Normal
  - **Prerequisites:** An inactive ruleset that has never been active exists.
  - **Steps:** Click the Delete button for this ruleset and confirm.
  - **Expected Result:** A success notification appears, and the ruleset is removed from the table.

## **Test Suite: Ruleset Export and Sharing**

- **P-AQ-RM-SHARE-1 Download a ruleset file:**
  - **Priority:** Normal
  - **Prerequisites:** At least one ruleset exists.
  - **Steps:** Click the Download action for a ruleset.
  - **Expected Result:** The browser initiates a download of the correct ruleset file.

- **P-AQ-RM-SHARE-2 Copy a ruleset link and verify URL format:**
  - **Priority:** Low
  - **Prerequisites:** At least one ruleset exists.
  - **Steps:** Click the Copy Link action and inspect the clipboard content.
  - **Expected Result:** The clipboard contains a valid, direct URL to view the ruleset file. The URL format is
    `/api-linter/api/v1/rulesets/{rulesetId}/data`.

## **Test Suite: Filtering and Data Display**

- **P-AQ-RM-FILTER-1 Filter rulesets by API type:**
  - **Priority:** Major
  - **Prerequisites:** Rulesets exist for both OAS 3.0 and OAS 3.1.
  - **Steps:** Switch the API type selector from OAS 3.0 to OAS 3.1.
  - **Expected Result:** The table updates to show only the rulesets for OAS 3.1.
