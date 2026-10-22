# Test Cases for Playground Improvements (Story #127)

## Point 1: Add Custom Server Popup Split into Two Flows

## [TC-P1-01] Add Custom Server via "Add Custom Server URL" Flow (Positive, with Description)

| Step | ER |
|------|----|
| 1. Log in to APIHUB as a user and navigate to a package version with an API operation. | The system displays the Playground sidebar for the selected operation. |
| 2. Click the server field dropdown and select "Add Custom Server". | The "Add Custom Server" popup opens with "Add Custom Server URL" as the default flow. |
| 3. Enter a valid absolute URL (e.g., "<https://example.com/API>") and description (e.g., "Test Server"). | The fields accept the input; "Add" button is enabled. |
| 4. Click "Add". | The popup closes, a notification shows "Server has been added", the server appears at the end of the dropdown with caption "Test Server", and the server field shows the full URL with operation path (e.g., "<https://example.com/api/v1/resource>"). The server is saved in local storage. |

## [TC-P1-02] Add Custom Server via "Add Custom Server URL" Flow (Positive, No Description)

| Step | ER |
|------|----|
| 1. Log in to APIHUB and navigate to a package version with an API operation. | The system displays the Playground sidebar. |
| 2. Click the server field dropdown and select "Add Custom Server". | The "Add Custom Server" popup opens with "Add Custom Server URL" selected. |
| 3. Enter a valid absolute URL (e.g., "<https://example.com/API>") and leave description empty. | The fields accept the input; "Add" button is enabled. |
| 4. Click "Add". | The popup closes, a notification shows "Server has been added", the server appears in the dropdown with caption "-", and the server field shows the full URL with operation path. The server is saved in local storage. |

## [TC-P1-03] Add Custom Server via "Use Agent Proxy" Flow (Positive, with Additional Path and Description)

| Step | ER |
|------|----|
| 1. Log in to APIHUB and navigate to a package version with a service name (e.g., "my-service"). | The system displays the Playground sidebar. |
| 2. Click the server field dropdown and select "Add Custom Server". | The "Add Custom Server" popup opens with both flows available. |
| 3. Select "Use Agent Proxy", choose a Cloud agent, a valid namespace, enter additional path (e.g., "/extra"), and description (e.g., "Proxy Server"). | The service field is pre-filled with "my-service", fields accept input, and "Add" button is enabled. |
| 4. Click "Add". | The popup closes, a notification shows "Server has been added", the server appears in the dropdown with caption "Proxy Server", and the server field shows the generated URL (e.g., "<https://apihub.example.com/apihub-nc/agents/\>\<agentId>/namespaces/\<namespace>/services/my-service/proxy/extra/v1/resource"). The server is saved in local storage. |

## [TC-P1-04] Validation: Empty Server URL in "Add Custom Server URL" Flow

| Step | ER |
|------|----|
| 1. Log in to APIHUB and navigate to a package version with an API operation. | The system displays the Playground sidebar. |
| 2. Click the server field dropdown and select "Add Custom Server". | The "Add Custom Server" popup opens. |
| 3. Leave Server URL empty and click "Add". | An error message appears: "The field must be filled." The popup remains open. |

## [TC-P1-05] Validation: Relative URL in "Add Custom Server URL" Flow

| Step | ER |
|------|----|
| 1. Log in to APIHUB and navigate to a package version with an API operation. | The system displays the Playground sidebar. |
| 2. Click the server field dropdown and select "Add Custom Server". | The "Add Custom Server" popup opens. |
| 3. Enter a relative URL (e.g., "/API") and click "Add". | An error message appears: "The value must be an absolute URL." The popup remains open. |

## [TC-P1-06] Validation: Service Not Found in Namespace in "Use Agent Proxy" Flow

| Step | ER |
|------|----|
| 1. Log in to APIHUB and navigate to a package version with a service name. | The system displays the Playground sidebar. |
| 2. Click the server field dropdown and select "Add Custom Server". | The "Add Custom Server" popup opens. |
| 3. Select "Use Agent Proxy", choose a Cloud agent, select a namespace where the service does not exist, and click "Add". | An error message appears: "Service \<service name> not found in selected namespace." The popup remains open. |

## [TC-P1-07] "Use Agent Proxy" Unavailable if No Service Name

| Step | ER |
|------|----|
| 1. Log in to APIHUB and navigate to a package version without a service name. | The system displays the Playground sidebar. |
| 2. Click the server field dropdown and select "Add Custom Server". | The popup opens with only "Add Custom Server URL" available. An info icon tooltip shows: "Only adding a custom server is available. To use the Agent proxy, specify the service name for the current \<package type>." |

## Point 3: Server Caption in Dropdown

## [TC-P3-01] Caption from Description (Spec Server)

| Step | ER |
|------|----|
| 1. Log in to APIHUB and navigate to a package version with a spec server including a description (e.g., "Prod Server"). | The system displays the Playground sidebar. |
| 2. Click the server field dropdown. | The server appears in the dropdown with caption "Prod Server". |

## [TC-P3-02] Dash Caption if No Description (Spec Server)

| Step | ER |
|------|----|
| 1. Log in to APIHUB and navigate to a package version with a spec server lacking a description. | The system displays the Playground sidebar. |
| 2. Click the server field dropdown. | The server appears in the dropdown with caption "-". |

## [TC-P3-03] Caption from Description (Custom Server)

| Step | ER |
|------|----|
| 1. Log in to APIHUB and add a custom server with a description (e.g., "Custom Test") via TC-P1-01. | The server is added successfully. |
| 2. Click the server field dropdown. | The custom server appears with caption "Custom Test". |

## [TC-P3-04] Dash Caption if No Description (Custom Server)

| Step | ER |
|------|----|
| 1. Log in to APIHUB and add a custom server without a description via TC-P1-02. | The server is added successfully. |
| 2. Click the server field dropdown. | The custom server appears with caption "-". |

## Point 4: Full Absolute URL in Server Field

## [TC-P4-01] Display Full Absolute URL with Path (Spec Server)

| Step | ER |
|------|----|
| 1. Log in to APIHUB and navigate to a package version with an absolute spec server (e.g., "<https://example.com/base>"). | The system displays the Playground sidebar. |
| 2. Select the server from the dropdown. | The server field shows the full URL with operation path (e.g., "<https://example.com/base/v1/resource>"). |

## [TC-P4-02] Display Full Absolute URL with Path (Custom Server)

| Step | ER |
|------|----|
| 1. Log in to APIHUB and add a custom server (e.g., "`https://test.com`") via TC-P1-01. | The server is added successfully. |
| 2. Select the custom server from the dropdown. | The server field shows the full URL with operation path (e.g., "`https://test.com/v1/resource`"). |

## [TC-P4-03] Skip Relative URLs from Spec

| Step | ER |
|------|----|
| 1. Log in to APIHUB and navigate to a package version with a relative spec server (e.g., "/relative"). | The system displays the Playground sidebar. |
| 2. Click the server field dropdown. | The relative server is not listed in the dropdown. |

## [TC-P4-04] Empty Server Field Disables Send

| Step | ER |
|------|----|
| 1. Log in to APIHUB and navigate to a package version with no servers (spec or custom). | The system displays the Playground sidebar with an empty server field. |
| 2. Hover over the Send button. | The Send button is disabled; a tooltip shows: "Please add a server". |

## Point 5: All Requests Sent via Proxy Endpoints

## [TC-P5-01] Request to Non-Agent Server via Proxy

| Step | ER |
|------|----|
| 1. Log in to APIHUB and navigate to a package version with an API operation. | The system displays the Playground sidebar. |
| 2. Select a non-agent server (spec or custom direct URL) and fill required parameters/body. | The server is selected, and parameters/body are valid. |
| 3. Click "Send". | The request is routed via GET /playground/proxy, and the response is displayed in the Playground Response section. |

## [TC-P5-02] Request to Agent Server via Proxy

| Step | ER |
|------|----|
| 1. Log in to APIHUB and add an agent proxy server via TC-P1-03. | The server is added successfully. |
| 2. Select the agent proxy server and fill required parameters/body. | The server is selected, and parameters/body are valid. |
| 3. Click "Send". | The request is routed via GET /agents/{agentId}/namespaces/{name}/services/{serviceId}/proxy/{path}, and the response is displayed in the Playground Response section. |

## [TC-P5-03] Request to Current APIHUB Server via Proxy

| Step | ER |
|------|----|
| 1. Log in to APIHUB and select a server matching the current APIHUB domain. | The system displays the Playground sidebar. |
| 2. Fill required parameters/body and click "Send". | The request is routed via the proxy endpoint (not direct), and the response is displayed in the Playground Response section. |
