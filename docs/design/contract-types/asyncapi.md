# AsyncAPI

## **Summary**
This design document describes the implementation of AsyncAPI 3.0 specification support and rendering in APIHUB Portal.

## **Assumptions**

APIHUB API Operation for AsyncAPI, the term **API Operation** denotes the combination of three entities: **channel, operation, and message**. One row in the operations list corresponds to one such triple. 

* API Changes tab and API Quality tab are out of scope for this document (handled by separate stories).

* List of all channels in the current package version means the set of channels that are used by at least one APIHUB operation (as defined above) in the AsyncAPI document(s) of the current package version. The system renders this list using channel.title (one entry per channel).  
* For AsyncAPI 3.0, labels are informational only. Functional metadata (API Kind, Audience, deprecation, etc.) shall be defined using specification extensions (e.g. x-api-kind, x-audience). This is a change from REST/OpenAPI behavior, where labels can affect functional metadata. For AsyncAPI 3.0, use extensions in the spec to set functional properties; labels remain available for informational purposes.

## **Data collection logic**

### **Summary**

This section defines how the system computes or collects data (derivation rules, filter criteria, operationId, bwc, deprecated, etc.).

Out of scope for this story: tags, models used in operation,externalDocs(with refs), API Changes tab and API Quality tab are out of scope.

### **APIHUB operations collection — base rules**

* The system shall collect APIHUB operations (channel, operation, message triples) only from AsyncAPI documents that have an operations section. If the document has no operations section, no APIHUB operations shall be collected for that document.  
* Each collected APIHUB operation shall be uniquely identified by the OperationId calculated for the triple (channel, operation, message).

### 

### 

### **OperationID calculation rules**

APIHUB Operation is the triple (channel, operation, message). 

Formula:

operationId \= normalized\_operation\_id \+ "-" \+ normalized\_message\_id

Source of each segment (AsyncAPI 3.0 specification):

Each segment is derived from the key that identifies the corresponding object in the AsyncAPI document. The AsyncAPI 3.0 specification does not define separate "id" fields inside these objects for that purpose. The map keys act as the identifiers.

| Segment | AsyncAPI 3.0 source | Description |
| ----- | ----- | ----- |
| Operation | Key in the root operations map ({operationId}) | In the spec this key is referred to as operationId (Operations Object: *"The field name (operationId) MUST be a string used to identify the operation in the document"*). Example: onUserSignUp, OrderOperation. |
| Message | Key in the channel’s messages map \- the channel referenced by the operation, from the root channels property) | In the spec this key is the messageId (Messages Object: *"The key represents the message identifier"*). Resolved from the operation’s messages references. Example: userSignedUp, OrderMessage. |

### **Single operation specification composition rules**

When the system builds or stores a representation of a single APIHUB operation, the result MUST satisfy:

1. Be a valid AsyncAPI specification (conformant to AsyncAPI 3.0).  
2. Contain all data relevant for the channel/operation/message triple that constitutes this APIHUB operation (no missing refs, no incomplete context).

The following elements shall be included.

### **Root-level (validity and context)**

| Element | Requirement | Notes |
| ----- | ----- | ----- |
| asyncapi | Required | Version string, e.g. 3.0.0. |
| info | Required | At least title and version (required by the spec). May copy from source document or use a minimal stub. Other fields (description, contact, etc.) optional. |
| id | Optional | Application identifier if the source document has it and it is relevant. |
| servers | As needed | Include every server referenced by the channel (via channel.servers). Required if the channel references servers; needed for protocol derivation and validity when refs are present. |
| defaultContentType | Optional | Include if present in the source document and the single APIHUB operation’s message does not override it with its own contentType. If the message has contentType, the root defaultContentType is redundant for that message. Otherwise include it so the composed spec remains valid and the message’s content type is unambiguous. |
| channels | Required | A map containing exactly one channel: the channel referenced by the operation. Key \= channelId. Full channel object (address, description, parameters, servers, bindings, extensions, messages map with at least the one message of the triple). |
| operations | Required | A map containing exactly one operation: the operation of the triple. Key \= operationId. Full operation object (action, channel ref, title, description, bindings, extensions, traits, messages refs). The messages array must reference at least the one message that defines this APIHUB operation. |
| components | As needed | Include every referenced component so that all $ref resolve and all data for the triple is present (see below). |

### **Channel object (the one channel)**

* address, title, summary, description, parameters, servers, tags, externalDocs, bindings, extensions.  
* messages: map that includes the one message that corresponds to the current triple (key \= messageId). Other messages of the channel may be omitted if the use case is strictly "single APIHUB operation".

### **Operation object (the one operation)**

* action, channel (ref to the channel above), title, summary, description, security, tags, bindings, messages.  
* All refs (channel, messages etc.) must be resolvable within the composed spec.

### **Message object (exactly the one for the triple)**

* Include exactly the one message that defines this APIHUB operation (singular),  one and not the full list of messages of the operation.  
* Resolve it from key in the channel’s messages map \- the channel referenced by the operation, from the root channels property  
* Include full message object: headers, payload, correlationId, contentType, name, title, summary, description, tags,, bindings, examples, traits, and extensions.  
* Any $ref in that message (payload, headers, traits, correlationId, etc.) must be satisfied by components (see below).

Components (all referenced pieces)  
Include in components every object that is referenced from the operation, channel, or the single message, so that:

* No $ref is broken.  
* All data relevant for the triple is present (rendering, validation, diff).

Typically:

| Component | When to include |
| ----- | ----- |
| components.schemas | Every schema ref'd by the message's payload, headers, or by other included schemas. |
| components.messages | The one message of the triple if it is defined here and referenced from the channel/operation. |
| components.parameters | Every parameter ref'd by the channel (e.g. for address parameters). |
| components.messageTraits | If the message references traits. |
| components.securitySchemes | If the operation or server references security. |

Other component types (servers, channels, operations, tags, etc.) include only if they are referenced and needed for validity or for the triple.

### 

### **Protocol (APIHUB Operation metadata)**

The "Protocol" value is not taken from a message or channel field. The system shall derive it from the server(s) referenced by the channel: resolve the channel's servers references to the document's servers object, then take the protocol of the first server (e.g. kafka, amqp). If the channel references multiple servers, the system shall assume they use the same protocol and use the first server's protocol. 

The protocol value is a string as defined in the AsyncAPI 3.0 Server Object specification. The system shall display the protocol value from the spec as-is, without validation or transformation. Expected values are kafka and amqp, but any other protocol value present in the spec shall be displayed without modification. If the channel has no server references or the protocol cannot be resolved, the system shall also display "Unknown".

### **Audience**

Audience indicates whether an APIHUB operation is intended for internal or external consumers. AsyncAPI does not define a native audience field. The system shall derive audience from a custom extension on the specification objects defined below. If no extension is present at any level, the APIHUB operation audience shall be External (default).

Extension by object

* Channel Object \- extension x-api-audience (string). Allowed values: internal, external. If set to internal, all APIHUB operations that use this channel shall have audience Internal; if set to external, External.  
* Operation Object \- extension x-api-audience (string). Allowed values: internal, external. If set, the corresponding APIHUB operation(s) shall have the given audience.

**Resolution order**

Channel-level x-api-audience is the default for all APIHUB operations on that channel. Operation-level x-api-audience overrides when present. If neither channel nor operation defines the extension, the audience shall be external.

**bwc/no-bwc (API Kind)**

In AsyncAPI, API Kind (bwc vs. no-bwc) can be specified only at two specification object levels: Channel Object and Operation Object. There is no document-level \`x-api-kind\` for AsyncAPI in this design; the value is derived from the Channel → Operation hierarchy.

**Extension by object:**

* Channel Object — extension \`x-api-kind: bwc/no-bwc\` (string). Value \`no-bwc\` means the channel is not supported by bwc policies; the system shall treat all APIHUB operations that use this channel as no-bwc (API Kind column and filters).  
* Operation Object — extension \`x-api-kind: bwc/no-bwc\` (string). Value \`no-bwc\` means the operation is not supported by bwc policies; the system shall treat the corresponding APIHUB operation(s) as no-bwc.

**Resolution order:**

AsyncAPI structure is Channel → Operation → Message: a channel contains operations, and each operation may reference messages. For API Kind, channel-level x-api-kind is the default for all APIHUB operations on that channel; operation-level x-api-kind overrides when present (more specific overrides more general, same as in REST). If the channel does not define x-api-kind and the operation does not define x-api-kind, the APIHUB operation’s API Kind shall be bwc.

Concretely:

* If the Channel has x-api-kind (e.g. no-bwc), that value is the default for all APIHUB operations bound to that channel.  
* If an Operation on that channel also defines x-api-kind, the operation-level value is used for the APIHUB operation(s) derived from that operation (it overrides the channel default).  
* If the Channel does not define x-api-kind, the system uses the operation-level x-api-kind for each APIHUB operation when the operation has it. Otherwise the API Kind is undefined or falls back to a global default, as defined elsewhere.

So: channel sets the default for the whole channel; operation-level overrides when explicitly set. API Kind at document level is not supported for now.

### **Deprecated — data collection**

In AsyncAPI 3.0 native deprecated: true/false exists only for Schema Object. It does not exist for Operation, Channel, or Message Objects in the core spec. For Channel and Message, deprecation is expressed via custom extensions on those objects.

Extensions by specification object:

* Message Object — extension x-deprecated (boolean). The Message Object may be defined inline or referenced from components.messages; the extension is evaluated on the resolved Message Object regardless of where it is defined. If x-deprecated: true, the APIHUB operation is treated as message-deprecated.  
* Channel Object — extension x-deprecated (boolean). If x-deprecated: true, that channel and all APIHUB operations that use that channel are treated as channel-deprecated.

**Deprecation message**  
When an APIHUB operation is treated as message-deprecated, the system shall display a label in the form "\[Deprecated\] message {name}". The value for {name} is taken by the following priority (first non-empty wins):

1. title (Message Object)  
2. messageId (key in the channel’s messages map \- the channel referenced by the operation, from the root channels property)

Deprecation channel  
When a channel or its APIHUB operations are treated as channel-deprecated, the system shall display a label in the form "\[Deprecated\] channel {name}". The value for {name} is taken by the same kind of priority:

1. title (Channel Object)  
2. channel id (key in the document’s channels map)

**Deprecated items**

In AsyncAPI 3.0, the native deprecated: true field exists only on Schema Object (as in JSON Schema). For Channel and Message objects, deprecation is expressed via custom extensions (x-deprecated) \- that is covered separately above.

When a message's payload or headers contain a Schema Object with deprecated: true, the APIHUB operation itself is not considered deprecated. Instead, it is treated as containing deprecated item(s). The system shall include such operations in the Deprecated Tab dropdown with deprecated schemas but shall not show a deprecated badge on the operation itself.

**Deprecated item message format:**

The system shall generate a human-readable description for each deprecated schema found in the operation's message payload or headers, following the same approach as REST \[DI‐Portal‐PKGVER‐015\]([https://github.com/Netcracker/qubership-apihub/wiki/DI%E2%80%90Portal%E2%80%90PKGVER%E2%80%90015-Human%E2%80%90readable-description-for-deprecated-items-for-OpenAPI-3.0](https://github.com/Netcracker/qubership-apihub/wiki/DI%E2%80%90Portal%E2%80%90PKGVER%E2%80%90015-Human%E2%80%90readable-description-for-deprecated-items-for-OpenAPI-3.0)).

Variables:

* deprecationPath — path from schema to the deprecated element (e.g. schema, schema.properties.userId, schema.properties.address.properties.city).  
* messageId — key in the channel's messages map (the channel referenced by the operation, from the root channels property).

Rules:

1. Schema in components.schemas (ref case):

If the path to the deprecated schema starts with components.schemas, the message shall use the full path in components:\[Deprecated\] schema in '{path in components}'

1. Schema inline in components.messages (mixed case):

If the path starts with components.messages (i.e. schema is defined inside a message that lives in components), the message shall use the full path:\[Deprecated\] schema in '{full path in components}'

1. Schema inline in message payload (pure inline):

If the schema is defined inline inside the message payload (path starts with channels), the message shall be:\[Deprecated\] {deprecationPath} in message '{messageId}' payload

1. Schema inline in message headers (pure inline):

If the schema is defined inline inside the message headers, the message shall be:\[Deprecated\] {deprecationPath} in message '{messageId}' headersFor nested schemas (e.g. a deprecated property inside a property of the payload), the deprecationPath shall include the full property path (e.g. schema.properties.address.properties.city).

Summary table:

| Where the deprecated schema is located | Message format |
| :---- | :---- |
| components.schemas.\* | \[Deprecated\] schema in '{path}' |
| components.messages.\*.payload or \*.headers | \[Deprecated\] schema in '{full path}' |
| Inline in message payload | \[Deprecated\] {deprecationPath} in message '{messageId}' payload |
| Inline in message headers | \[Deprecated\] {deprecationPath} in message '{messageId}' headers |

## **Build Result**

When publishing, the UI sends to the backend one operation object per APIHUB operation. Each object shall conform to the backend Operation schema. Type-specific data shall be sent in externalMetadata.

### **Required fields**

| Field | Description |
| ----- | ----- |
| operationId | Operation unique identifier (slug). For AsyncAPI: as defined by APIHUB (e.g. channelId \+ operationId \+ messageId) |
| documentId | Unique string identifier of the document from which the operation is originated (e.g. AsyncAPI file id). |
| title | APIHUB Operation title(message.title). If the message has no title, the system shall display the messageId. |
| apiType | Type of the API (e.g. rest, kafka). From ApiType schema. |
| apiAudience | internal | external | unknown. For AsyncAPI: derived from extension or default External. |
| apiKind | bwc | no-bwc | experimental. For AsyncAPI: derived from x-api-kind (channel default, operation override). |
| versionInternalDocumentId | Unique string identifier of the preprocessed internal document where the operation is present. |

Optional fields (all API types)

| Field | Description |
| ----- | ----- |
| deprecated | Operation deprecated flag (e.g. message-deprecated or channel-deprecated). |
| externalMetadata | Type-specific metadata; shape depends on apiType (see below). |

AsyncAPI Operation Metadata

| Key | Required | Description |
| ----- | ----- | ----- |
| action | Yes | AsyncAPI operation action: send | receive. |
| channel | Yes | AsyncAPI channel.title If the channel has no title, the system shall display the channelId(Key in the channels map) |
| protocol | Yes | Communication protocol of the channel’s (first) server. Any unresolved value shall be sent as “Unknown”. |
| customTags | No | Custom tags object. |
| asyncOperationId | Yes | AsyncAPI operationId as defined in the AsyncAPI specification |
| messageId | Yes | AsyncAPI messageId as defined in the AsyncAPI specification |

## **Scope for UI Functions**

| Page / Functionality | Scope | Out of Scope |
| ----- | ----- | ----- |
| Overview Tab | • Summary • Activity history • Revision history | • Groups |
| Operation Tab | • Filters • List of operations(Messages) • List view • Detailed view | • Export operations to Excel |
| API Changes Tab | — | Out of Scope |
| Deprecated Tab | Same as in Operation Tab, but with deprecated badges (filters, list of deprecated operations, list view, detailed view). | • Export operations to Excel |
| API Quality Tab | — | Out of Scope |
| Documents Tab | • Overview tab • View operations tab • Export • Copy public link to source  | • Preview (Stoplight) • Export with extensions settings (preserve/remove extensions) • Copy page template  |

## **Overview Tab**

| Description | Mockups | API |
| ----- | ----- | ----- |
| Summary. If the user opens the Summary page, the system shall display a summary of the AsyncAPI package version, including: (1) total number of operations, (2) number of deprecated operations, (3) number of no-bwc operations. | Figma — Overview Tab |  |
| Activity history. If the user opens the Activity history tab, the system shall provide the ability to view a list of actions performed by users on the current package. |  |  |
| Revision history. If the user opens the Revision history tab, the system shall provide the ability to view information about all revisions of the current package. |  |  |

## 

## **API Operation (Messages) Tab**

| Description | Mockups | API |
| ----- | ----- | ----- |
| Filters. If the user is on the API Operation (Messages) tab, the system shall display filters on the left sidebar. The filters shall consist of: • Filter by Audience • Filter by Protocol • Filter by API Kind • Filter by Channel Filter by Channel shall show a list of all channels in the current package version(see Assumptions) and shall allow the user to filter the list of APIHUB Operation(see Assumptions) by selected channel(s). If the user clicks the filter button (to the right of "Search operations"), the system shall collapse or expand the filters sidebar. | Figma — Operation List View |  |
| Main list of operations (messages) — List View. If the user is on the API Operation (Messages) tab, the system shall display the main list of all messages by default in List View. The table shall have the following columns: • Messages — Message title, operation action (send or receive), and channel address. If the message has no title, the system shall display the messageId(Key in the messages map) • Channel — the channel.title. If the channel has no title, we need to show channelId(Key in the root channels map) • Protocol — the protocol of the channel's (first) server (see APIHUB Operation metadata). • API Kind — the kind of the message (from extension; see extensions section below) • Audience — the audience of the message (from extension). The Audience column and filters shall reflect the derived value (Internal/External) | Figma — Operation List View |  |
| Main list of operations (messages) — Detailed View. If the user switches to Detailed View (via the Detailed View button), the system shall display the screen in two parts: • On the left — only the data from the Messages column (message title, operation action, and channel address) • On the right — the Doc View for the selected message The filters sidebar shall remain in place and unchanged. | Figma — Operation Detailed View |  |
| Search operations. The "Search operations" field is a single text input. The system shall filter the list of APIHUB operations by matching the user's input against any of the following (OR logic): message title — the message's title per Message Object. If title is absent use message name or the message reference key channel title — channel.title or channelId operation action — operation.action ("send" or "receive") A row is shown if the search text matches at least one of these three. | Figma — Operation List View |  |

## 

## **Deprecated Tab**

| Description | Mockups | API |
| ----- | ----- | ----- |
| Filters The system shall behave the same as described for the API Operation (Messages) tab: filters on the left sidebar (Filter by Audience, Filter by Protocol, Filter by API Kind, Filter by Channel), with the ability to collapse or expand the filters sidebar via the filter button. | Figma — Deprecated Tab |  |
| Main list of API operations The system shall behave the same as described for the API Operation (Messages) tab (list of messages with table columns: Messages, Channel, Protocol, API Kind, Audience). If a message or channel is deprecated, the system shall display a yellow deprecated badge next to the message title or in the Channel column under the channel title, as defined in the Deprecated logic below. | Figma — Deprecated Tab |  |
| Deprecated (UI).  Deprecation is determined by the rules in Deprecated \- data collection. In the list:  Badge placement. For message-deprecated (or schema-deprecated): show the deprecated badge in the first column (Messages), to the right of the message title. For channel-deprecated: show the deprecated badge in the Channel column, under the channel title only; do not duplicate the badge on every message row that belongs to that channel. If both message and channel are deprecated the system shows only channel-deprecated badge. | Figma — Deprecated Tab |  |
| Deprecated in Doc View. If the user opens a message and the message is deprecated, the system shall open Doc View and display a yellow deprecated badge to the right of the Message title in the Doc View header. | Figma — Deprecated in Doc View |  |

## **Documents Tab**

| Description | Mockups | API |
| ----- | ----- | ----- |
| List of documents. If the user selects the Documents tab, the system shall display a page consisting of a left sidebar and a main content area. The system shall display in the left sidebar a list of all documents in the current package version. AsyncAPI documents shall be shown with a specific purple icon. Above the list of documents, the system shall display a "Search" field. If the user enters text in Search, the system shall allow the user to search by name for documents in the current package version. | Figma — Documents Tab, List & Overview |  |
| Overview tab view (default). By default, the main content area shall open in Overview tab view. The system shall display information from the selected AsyncAPI document taken from the specification info section: version, title, and description. If the user selects a different document from the list, the system shall update the main content area and display the overview for the newly selected document. | Figma — Documents Tab, List & Overview |  |
| Operations tab view. If the user switches to the Operations tab view, the system shall display all operations (messages) for the document currently selected from the list. The structure of the messages table (columns: Messages, Channel, Protocol, API Kind, Audience) shall be the same as in the API Operation (Messages) tab. | Figma — Documents Tab, Operations View |  |
| More functionality. If the user clicks the "More" button, the system shall display additional options: • Export. If the user selects Export, the system shall open an export settings modal. The modal shall offer: – File format: JSON or YAML After the user selects the format and clicks Export, the system shall download the selected document locally. • Copy public link to source. The system shall provide the ability to copy the public link to the source. |  |  |

## 

## **Custom Properties (Extensions)**

| Specification object | Extension / custom property | Format | Mandatory | Description |
| ----- | ----- | ----- | ----- | ----- |
| Channel Object | x-api-kind | String | no | Value:no-bwc. Mark that channel is not supported by bwc policies. See bwc/ no-bwc. |
| Channel Object | x-deprecated | boolean | no | Mark that channel is deprecated. See Deprecated. |
| Operation Object | x-api-kind | String | no | Value:no-bwc. Mark that operation is not supported by bwc policies. See bwc/ no-bwc. |
| Message Object | x-deprecated | boolean | no | Mark that message is deprecated. See Deprecated. |

