**Design Item ID**: DI-Portal-GS-001   
**Design Item Name**: Search Scope for REST Operations   
**Related Design Items**: [Global Search](https://github.com/Netcracker/qubership-apihub/wiki/Global-Search)   
**Related API**:   
**Revision History:**   

| Date | Description |
| ---- | ----------- |
|      |             |

---

# Description
The functionality calculates search scope for REST operations to define by which content the system will perform search. The system provides the following search scopes for REST operations:
- all - union of all other search scopes
- property - all kind of properties, parameters.
- annotation - descriptions, summary, operationId, title.
- request - search only in request parameters, body, headers, etc.
- response - search only in response body, headers.
- example - all kind of examples in several layers.


## Search scopes

| Path                                                        | property | annotation | request | response | example |
|-------------------------------------------------------------|:--------:|:----------:|:-------:|:--------:|:-------:|
| **Properties**                                              |          |            |         |          |         |
| `$.paths.[<key>] + $.paths.[*].[<key>]`                     | ✅        |            | ✅       |          |         |
| `$.paths.[*].parameters.[*].name.<value>`                   | ✅        |            | ✅       |          |         |
| `$.paths.[*].parameters.[*].schema.[<schema>]`              | ✅        |            | ✅       |          |         |
| `$.paths.[*].[*].parameters.[*].name.<value>`               | ✅        |            | ✅       |          |         |
| `$.paths.[*].[*].parameters.[*].schema.[<schema>]`          | ✅        |            | ✅       |          |         |
| `$.paths.[*].[*].requestBody.content.[*].schema.[<schema>]` | ✅        |            | ✅       |          |         |
| `$.paths.[*].[*].responses.[*].headers.[<key>]`             | ✅        |            |         | ✅        |         |
| `$.paths.[*].[*].responses.[*].headers.[*].schema.[<schema>]`| ✅       |            |         | ✅        |         |
| `$.paths.[*].[*].responses.[*].content.[*].schema.[<schema>]`| ✅       |            |         | ✅        | ✅       |
| **Annotations**                                             |          |            |         |          |         |
| `$.info.description.<value>`                                |          |     ✅      |         |          |         |
| `$.info.title.<value>`                                      |          |     ✅      |         |          |         |
| `$.info.contact.name.<value>`                               |          |     ✅      |         |          |         |
| `$.info.license.name.<value>`                               |          |     ✅      |         |          |         |
| `$.servers.[*].description.<value>`                         |          |     ✅      |         |          |         |
| `$.servers.[*].variables.[*].description.<value>`           |          |     ✅      |         |          |         |
| `$.tags.[*].name.<value>`                                   |          |     ✅      |         |          |         |
| `$.tags.[*].description.<value>`                            |          |     ✅      |         |          |         |
| `$.paths.[*].summary.<value>`                               |          |     ✅      |         |          |         |
| `$.paths.[*].description.<value>`                           |          |     ✅      |         |          |         |
| `$.paths.[*].servers.[*].description.<value>`               |          |     ✅      |         |          |         |
| `$.paths.[*].servers.[*].variables.[*].description.<value>` |          |     ✅      |         |          |         |
| `$.paths.[*].parameters.[*].description.<value>`            |          |     ✅      |         | ✅        | ✅       |
| `$.paths.[*].parameters.[*].examples.[<key>]`               |          |     ✅      |         | ✅        | ✅       |
| `$.paths.[*].parameters.[*].examples.[*].summary.<value>`   |          |     ✅      |         | ✅        |         |
| `$.paths.[*].parameters.[*].examples.[*].description.<value>`|          |     ✅      |         | ✅        |         |
| `$.paths.[*].[*].summary.<value>`                           |          |     ✅      |         |          |         |
| `$.paths.[*].[*].description.<value>`                       |          |     ✅      |         |          |         |
| `$.paths.[*].[*].operationId.<value>`                       |          |     ✅      |         |          |         |
| `$.paths.[*].[*].parameters.[*].description.<value>`        |          |     ✅      |         | ✅        | ✅       |
| `$.paths.[*].[*].parameters.[*].examples.[<key>]`           |          |     ✅      |         | ✅        | ✅       |
| `$.paths.[*].[*].parameters.[*].examples.[*].summary.<value>`|          |     ✅      |         | ✅        |         |
| `$.paths.[*].[*].parameters.[*].examples.[*].description.<value>`|      |     ✅      |         | ✅        |         |
| `$.paths.[*].[*].requestBody.description.<value>`           |          |     ✅      | ✅       |          |         |
| `$.paths.[*].[*].responses.[*].description.<value>`         |          |     ✅      |         | ✅        |         |
| `$.paths.[*].[*].responses.[*].headers.[*].description.<value>`|        |     ✅      |         | ✅        |         |
| `$.paths.[*].[*].servers.[*].description.<value>`           |          |     ✅      |         |          |         |
| `$.paths.[*].[*].servers.[*].variables.[*].description.<value>`|        |     ✅      |         |          |         |
| `$.paths.[*].[*].tags.[*].name.<value>`                     |          |     ✅      |         |          |         |
| `$.paths.[*].[*].tags.[*].description.<value>`              |          |     ✅      |         |          |         |
| **Examples.** Example value may be of ANY type. Need to make additional "stringify" operation first.                                             |          |            |         |          |         |
| `$.paths.[*].parameters.[*].example.<value>`                |          |            | ✅       |          | ✅       |
| `$.paths.[*].parameters.[*].examples.[*].value.<value>`     |          |            | ✅       |          | ✅       |
| `$.paths.[*].[*].parameters.[*].example.<value>`            |          |            | ✅       |          | ✅       |
| `$.paths.[*].[*].parameters.[*].examples.[*].value.<value>` |          |            | ✅       |          | ✅       |
| `$.paths.[*].[*].requestBody.content.[*].example.<value>`   |          |            | ✅       |          | ✅       |
| `$.paths.[*].[*].requestBody.content.[*].examples.[*].value.<value>`|   |            | ✅       |          | ✅       |
| `$.paths.[*].[*].responses.[*].content.[*].example.<value>` |          |            |         | ✅        | ✅       |
| `$.paths.[*].[*].responses.[*].content.[*].examples.[*].value.<value>`| |            |         | ✅        | ✅       |
| `$.paths.[*].[*].responses.[*].headers.[*].example.<value>` |          |            |         | ✅        | ✅       |
| `$.paths.[*].[*].responses.[*].headers.[*].examples.[*].value.<value>`| |            |         | ✅        | ✅       |

## Schema
| Path                                    | property | annotation | request | response | example |
|-----------------------------------------|:--------:|:----------:|:-------:|:--------:|:-------:|
| **Schema**                              |          |            |         |          |         |
| `/title.<value>`                        |          |    ✅       |         |          |         |
| `/description.<value>`                  |          |    ✅       |         |          |         |
| `/properties.[<key>]`                   |    ✅     |            |         |          |         |
| `/properties.[*].title.<value>`         |          |    ✅       |         |          |         |
| `/properties.[*].description.<value>`   |          |    ✅       |         |          |         |
| `/properties.[*].enum.[<key>]`          |          |            |         |          | ✅       |
| `/properties.[*].default.<value>`       |          |            |         |          | ✅       |
| `/properties.[*].example.<value>`       |          |            |         |          | ✅       |
| `/properties.[*].example.[<value>]`     |          |            |         |          | ✅       |
| `/properties.[<schema>]`                |          |            |         |          |         |
| `/additionalProperties.[<schema>]`      |          |            |         |          |         |
| `/allOf.[*].[<schema>]`                 |          |            |         |          |         |
| `/anyOf.[*].[<schema>]`                 |          |            |         |          |         |
| `/oneOf.[*].[<schema>]`                 |          |            |         |          |         |
| `/items.[*].[<schema>]`                 |          |            |         |          |         |

