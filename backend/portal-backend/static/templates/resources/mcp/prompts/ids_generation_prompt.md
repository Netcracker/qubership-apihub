# Step 1

Read user input.
Create md file with the integration design using template @resources/templates/ids_template.md

## Step 2

Populate section "Integration Design Specification (IDS)" by the rules:
`<generate_document_id>` - generate ID as "NC.Phase.INT.IDS.<3rdPartySystemName>" where 3rdPartySystemName define from the user's prompt.
Version - do not change
Document Date set current date in the format dd.mm.yyyy
System ID use 3rdParty System Abbreviation given by user in the prompt. If not given, generate from the system name (e.g. abbreviate).
Owner - do not change
Approval Status - do not change
Jira Link - do not change

## Step 3

Populate Document Metadata section by the rules
Integration ID set from previously generated in step 2
System set 3rdPartySystemName
Domain - do not change
Functional Capabilities - do not change
Design Items - do not change
Comments - do not change
List business reason for implementation.

## Step 4

Populate Version History.
Add row to the table
| `<current_version>` | `<current_date>` | `<user_name>` | `<comment>` |
comment should be 'Initial Draft Created' if the document is just created
or summary of changes if the document is changed.

## Step 5

Populate Document References
Set `<IA_id>` as `<generate_document_id>` from Step 2, but replace "IDS" with "IA".

## Step 6

Do not change Glossary of Terms.

## Step 7

Generate Introduction section.
Document Purpose replace 3rdPartySystemName.
Document Objectives - do not change.
Intended Audience - do not change.
Assumptions - do not change.
Out of Scope - do not change.
Technical Design - do not change.
Authentication & Authorization - replace authentication placeholder with some security requirements you found in the related services.

## Step 8

Integration Process

For each mentioned integration scenario generate a separate section, populating `<Process Name>`.
Describe the process in business terms in `<description_of_the_process>` in 2-4 sentences.
Create mermaid sequence diagram based on the description of interactions and place it in `<place_for_mermaid>`
Each step is numbered.
Create a table for description of the steps in Process Steps.
For each step create a row in the table with description which system have to be sending or receiving information.

**IMPORTANT**: DO NOT INTRODUCE NEW CALLS USE ONLY REQUESTED CALLS FROM USER

If sync or async was not mentioned, assume synchronous REST unless the scenario clearly implies async. Create the mermaid sequence diagram accordingly.

## MANDATORY: Look up every API in APIHub before writing Data Mapping sections

For each API or operation mentioned in the user's text you MUST follow this exact workflow.
Do NOT invent, guess, or fabricate API paths, parameters, or request/response schemas.
All API details MUST come from APIHub tool calls.

**IMPORTANT**: DO NOT INVENT, GUESS OR FABRICATE API PATHS, PARAMETERS OR REQUEST/RESPONSE SCHEMAS.

### Workflow for each API operation

1. **Search APIHub.** Call the tool `search_rest_api_operations` with a query derived from the API name
   mentioned by the user. **Pass the query as a plain string WITHOUT surrounding quotes** — e.g. use
   `query: "Retrieve Quote"` NOT `query: "\"Retrieve Quote\""`.
   Don't use abbreviations in searches.
   Don't use TMF or TMF648 word in searches.
   Replace spaces with "_" in operation names in searches.
   If the user specifies an API version/release (e.g. "2025.2"), pass it as
   the `release` parameter (format: "YYYY.Q") to filter results by that release.
   If version is not set use 2025.2.
   - Pick from the first found API `operationId` and `packageId`. Use `version` from user description.

2. **Get the specification.** Retrieve API Specification with using MCP tools
   - The response contains the full OpenAPI specification for that operation.

3. **Extract data from the specification.** From the returned specification populate:
   - HTTP method and path (use the path from the spec, not an invented one).
   - All request parameters (query, path, header, body) with their names, types, descriptions,
     and whether they are mandatory — take these directly from the spec.
   - All response fields for success and error responses — take these directly from the spec.
   - Sample request and sample response — create sample using API Specification taken from APIHUB including all fields (mandatory and optional). DO NOT IMAGINE FIELDS, USE ONLY RECEIVED INFORMATION FROM APIHUB.

   When you have called get_rest_api_operations_specification and received a successful result for an operation, you MUST use the path, parameters, and schemas from that result in the Data Mapping section. Do not use "Path: TBD" or the "not found" note for that operation.

4. **If the API is NOT found in APIHub** (search returned no results or no suitable match, or you never received a successful get_rest_api_operations_specification result for that operation):
   - Only add the "Note: This API was not found in APIHub" when you did not receive a successful get_rest_api_operations_specification result for that specific operation (e.g. search returned no results or you never called the get-spec tool for it).
   - If the API WAS found in APIHub (you have a successful get_rest_api_operations_specification result): use the path and schemas from that result; do not use "not found" or TBD for that operation.
   - When you truly do not have a spec: still create the Operation section, but clearly mark it:
     **"Note: This API was not found in APIHub. The path, parameters, and schemas below are
     preliminary and must be confirmed with the API owner."**
   - Add an entry to the Questions section at the end of the document:
     "Confirm the exact APIHub package and version for `<API Name>`."
   - Use reasonable placeholder values based on the user's text, but do NOT present them as
     authoritative.
   **If the API WAS found in APIHub** (you have packageId, version, operationId from the tool result):
   - Do NOT add this question for that API. State the APIHub source in the Operation section and do not add a "Confirm APIHub package/version" row in Questions.

### Writing the Data Mapping section for each operation

For each execution of the API:
    - Add a reference inside the interaction row in the format:
      API Name: link to the section in the document.
    - Create an Operation section under the #Data Mapping section.
    - In that section state the API method and path (from APIHub spec).
    - State the APIHub source: packageId, version, operationId.
    - Describe the reason to call the API.
    - List all request parameters and all response fields from the real APIHub specification.
    - Provide sample request and responses with full structure including optional fields.

### Verify links from Process Steps to Data Mapping

Before finishing the Integration Process section, check that:
- Every API call described in the Process Steps table has a corresponding Operation section under #Data Mapping (same API name, method, and path).
- In the Process Steps table, each step that involves an API call includes a reference to that Operation (e.g. `[link to section](#operation-name)` or "API Name: link to the section in the document").
- If any step mentions an API that has no Data Mapping section, add the missing Operation section or fix the Process Steps description so it matches the Data Mapping sections you created.

## Step 9

In Error Handling describe possible error codes, create a separate section for each operation.
