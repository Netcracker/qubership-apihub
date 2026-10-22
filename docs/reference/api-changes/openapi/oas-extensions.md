# OAS extensions

| №   | OAS Object                    | Extension Classification | Justification                                    |
| --- | ----------------------------- | ------------------------ | ---------------------------------------------- |
| 1   | Info Object                   | annotation               | Purely documentation information about the API |
| 2   | Contact Object                | annotation               | Contact information - documentation            |
| 3   | License Object                | annotation               | License Information - documentation            |
| 4   | Server Object                 | unclassified             | May affect the connection to the server.       |
| 5   | Server Variable Object        | unclassified             | Affects the formation of server URLs           |
| 6   | External Documentation Object | annotation               | Links to external documentation                |
| 7   | Tag Object                    | annotation               | Metadata for grouping operations               |
| 8   | OpenAPI Object (root)         | unclassified             | Global metadata specifications                 |
| 9   | Paths Object                  | unclassified             | May affect the routing                         |
| 10  | Path Item Object              | unclassified             | May affect the processing of operations.       |
| 11  | Operation Object              | unclassified             | May affect the logic of operations.            |
| 12  | Parameter Object              | unclassified             | May affect the validation of parameters.       |
| 13  | Request Body Object           | unclassified             | May affect the processing of requests.         |
| 14  | Media Type Object             | unclassified             | May affect serialization/deserialization       |
| 15  | Encoding Object               | unclassified             | Affects data encoding                          |
| 16  | Responses Object              | unclassified             | May affect the processing of responses.        |
| 17  | Response Object               | unclassified             | May influence the formation of responses.      |
| 18  | Header Object                 | unclassified             | May affect the processing of headers.          |
| 19  | Example Object                | annotation               | Examples for documentation                     |
| 20  | Link Object                   | unclassified             | Affects navigation between operations          |
| 21  | Callback Object               | unclassified             | Affects the callback functionality             |
| 22  | Schema Object                 | unclassified             | May affect data validation.                    |
| 23  | XML Object                    | unclassified             | Affects XML serialization                      |
| 24  | Security Scheme Object        | unclassified             | Affects authentication                         |
| 25  | OAuth Flow Object             | unclassified             | Affects the OAuth process                      |
| 26  | Components Object             | unclassified             | Container for reusable components              |

## Human-readable-description

### Variables for Extensions

#### General Variables

<**Action**>:

- Added
- Changed
- Deleted

#### <**preposition**>

- "to" if action = add
- "for" if action = change
- "from" if action = delete

<**extension-path**> - **extension** '**<**extension-name**>**' where extension-name is the name of the OAS extension
(e.g., x-logo, x-cache-ttl, x-internal-use)
<**remaining-path**> - full path to the location where extension is used.

### Human-readable description format

[<**Action**>]<**extension-path**> <**preposition**> <**remaining-path**> \*\*

| №   | Property                                                     | ID                        | Description                     | Human-readable description                                                             | Example                                                                                    |
| --- | ------------------------------------------------------------ | ------------------------- | ------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1   | info.[\<custom prop>]                                         | info-extension            | Add/change/remove OAS extension | [Action] extension 'extension-name' preposition info                                   | [Deleted] extension 'x-logo' from info                                                     |
| 2   | info.contact.[\<custom prop>]                                 | contact-extension         | Add/change/remove OAS extension | [Action] extension 'extension-name' preposition info.contact                           | [Changed] extension 'x-team' for info.contact                                              |
| 3   | info.license.[\<custom prop>]                                 | license-extension         | Add/change/remove OAS extension | [Action] extension 'extension-name' preposition info.license                           | [Added] extension 'x-compliance' to info.license                                           |
| 4   | servers.[ * ].[\<custom prop>]                                | server-extension          | Add/change/remove OAS extension | [Action] extension 'extension-name' preposition servers.[ * ]                          | [Added] extension 'x-region' to servers.[0]                                                |
| 5   | servers.[ *].variables.[* ].[\<custom prop>]                | server-variable-extension | Add/change/remove OAS extension | [Action] extension 'extension-name' preposition servers.[].variables.[]                | [Changed] extension 'x-load-balancer' for servers.[0].variables.env                        |
| 6   | paths.[ *].[* ].externalDocs.[\<custom prop>]               | external-docs-extension   | Add/change/remove OAS extension | [Action] extension 'extension-name' preposition paths.[].[].externalDocs               | [Added] extension 'x-category' to paths./pets.get.externalDocs                             |
| 7   | tags.[ * ].[\<custom prop>]                                   | tag-extension             | Add/change/remove OAS extension | [Action] extension 'extension-name' preposition tags.[ * ]                             | [Deleted] extension 'x-display-order' from tags.[0]                                        |
| 8   | [\<custom prop>]                                              | root-extension            | Add/change/remove OAS extension | [Action] extension 'extension-name' preposition root                                   | [Added] extension 'x-api-version' to root                                                  |
| 9   | paths.[\<custom prop>]                                        | paths-extension           | Add/change/remove OAS extension | [Action] extension 'extension-name' preposition paths                                  | [Changed] extension 'x-rate-limit' for paths                                               |
| 10  | paths.[ * ].[\<custom prop>]                                  | path-item-extension       | Add/change/remove OAS extension | [Action] extension 'extension-name' preposition paths.[ * ]                            | [Added] extension 'x-cache-ttl' to paths./pets                                             |
| 11  | paths.[ *].[* ].[\<custom prop>]                            | operation-extension       | Add/change/remove OAS extension | [Action] extension 'extension-name' preposition paths.[].[]                            | [Deleted] extension 'x-internal-use' from paths./pets.get                                  |
| 12  | paths.[ *]. [* ].parameters.[ * ].[\<custom prop>]           | parameter-extension       | Add/change/remove OAS extension | [Action] extension 'extension-name' preposition paths.[].[].parameters.[ * ]           | [Changed] extension 'x-validation-rule' for paths./pets.get.parameters.[0]                 |
| 13  | paths.[ *].[* ].requestBody.[\<custom prop>]                | request-body-extension    | Add/change/remove OAS extension | [Action] extension 'extension-name' preposition paths.[].[].requestBody                | [Added] extension 'x-max-size' to paths./pets.post.requestBody                             |
| 14  | content.[<**mediaType**>].[\<custom prop>]                    | media-type-extension      | Add/change/remove OAS extension | [Action] extension 'extension-name' preposition content.[<**mediaType**>]              | [Changed] extension 'x-serializer' for content.application/JSON                            |
| 15  | encoding.[ * ].[\<custom prop>]                               | encoding-extension        | Add/change/remove OAS extension | [Action] extension 'extension-name' preposition encoding.[ * ]                         | [Deleted] extension 'x-compression' from encoding.file                                     |
| 16  | paths.[ *].[* ].responses.[\<custom prop>]                  | responses-extension       | Add/change/remove OAS extension | [Action] extension 'extension-name' preposition paths.[].[].responses                  | [Added] extension 'x-default-cache-control' to paths./pets.get.responses                   |
| 17  | paths.[ *].[* ].responses.[\<code>].[\<custom prop>]         | response-extension        | Add/change/remove OAS extension | [Action] extension 'extension-name' preposition paths.[].[].responses.[<**code**>]     | [Changed] extension 'x-cache-control' for paths./pets.get.responses.200                    |
| 18  | headers.[ * ].[\<custom prop>]                                | header-extension          | Add/change/remove OAS extension | [Action] extension 'extension-name' preposition headers.[ * ]                          | [Deleted] extension 'x-unit' from headers.X-Rate-Limit                                     |
| 19  | examples.[ * ].[\<custom prop>]                               | example-extension         | Add/change/remove OAS extension | [Action] extension 'extension-name' preposition examples.[ * ]                         | [Added] extension 'x-test-category' to examples.userExample                                |
| 20  | links.[ * ].[\<custom prop>]                                  | link-extension            | Add/change/remove OAS extension | [Action] extension 'extension-name' preposition links.[ * ]                            | [Changed] extension 'x-timeout' for links.GetUserById                                      |
| 21  | callbacks.[ * ].[\<custom prop>]                              | callback-extension        | Add/change/remove OAS extension | [Action] extension 'extension-name' preposition callbacks.[ * ]                        | [Deleted] extension 'x-retry-attempts' from callbacks.webhook                              |
| 22  | schema.[\<custom prop>]                                       | schema-extension          | Add/change/remove OAS extension | [Action] extension 'extension-name' preposition schema                                 | [Added] extension 'x-table-name' to schema                                                 |
| 23  | xml.[\<custom prop>]                                          | xml-extension             | Add/change/remove OAS extension | [Action] extension 'extension-name' preposition xml                                    | [Changed] extension 'x-namespace-prefix' for xml                                           |
| 24  | components.securitySchemes.[ * ].[\<custom prop>]             | security-scheme-extension | Add/change/remove OAS extension | [Action] extension 'extension-name' preposition components.securitySchemes.[ * ]       | [Deleted] extension 'x-token-format' from components.securitySchemes.ApiKeyAuth            |
| 25  | components.securitySchemes.[ * ].flows.[\<custom prop>]       | oauth-flows-extension     | Add/change/remove OAS extension | [Action] extension 'extension-name' preposition components.securitySchemes.[ * ].flows | [Added] extension 'x-flow-config' to components.securitySchemes.OAuth2.flows               |
| 26  | components.securitySchemes.[ *].flows.[* ].[\<custom prop>] | oauth-flow-extension      | Add/change/remove OAS extension | [Action] extension 'extension-name' preposition components.securitySchemes.[].flows.[] | [Changed] extension 'x-pkce-required' for components.securitySchemes.OAuth2.flows.implicit |
| 27  | components.[\<custom prop>]                                   | components-extension      | Add/change/remove OAS extension | [Action] extension 'extension-name' preposition components                             | [Deleted] extension 'x-schema-version' from components                                     |
