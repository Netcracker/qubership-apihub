## Summary

All Spectral linter rulesets (OpenAPI 2.0, OpenAPI 3.0, OpenAPI 3.1, AsyncAPI 3.0) have been updated to downgrade every rule's severity by one level: `error` → `warn`, `warn` → `info`, `info` → `hint`. This ensures that no ruleset produces `error`-level findings from linter rules, which is a prerequisite for the safe rollout of Quality Gate v4 on production. The recommended Spectral rules remain active — only their severity has been lowered, not their logic.

## Spectral Version Compatibility

These rulesets are designed for **Spectral CLI 6.15.0** (`@stoplight/spectral-rulesets` 1.22.0). Key version-dependent rules:

| Rule | Minimum rulesets version |
|------|------------------------|
| `array-items` | 1.19.0 |
| `oas3-callbacks-in-callbacks` | 1.19.0 |
| `oas3_1-servers-in-webhook` | 1.19.0 |
| `oas3_1-callbacks-in-webhook` | 1.19.0 |
| `asyncapi-3-*` (all v3 rules) | 1.21.0 |

**Important:** If a ruleset contains a rule that does not exist in the deployed Spectral version, Spectral will crash with `Cannot extend non-existing rule` and the entire API Quality Check will fail. Always verify the Spectral version before deploying rulesets.

## Assumptions

`parser` errors (OpenAPI) and invalid-ref errors (AsyncAPI and OpenAPI) are considered infrastructure-level errors produced by the YAML parser and `$ref` resolver respectively. These errors are **not** part of Spectral rules and therefore **cannot** be configured, controlled, or suppressed via rulesets. They occur only when a specification is structurally invalid (e.g., incorrect YAML syntax or unresolved references), and not as a result of quality or style rule violations.

## Rules List

### 1. `default-openapi-2-0` — OpenAPI 2.0 Default Ruleset

#### Common rules (OpenAPI v2 & v3) — recommended

| # | Rule | Previous severity | New severity |
|---|------|:-----------------:|:------------:|
| 1 | `duplicated-entry-in-enum` | warn | **info** |
| 2 | `info-contact` | warn | **info** |
| 3 | `info-description` | warn | **info** |
| 4 | `no-$ref-siblings` | warn | **info** |
| 5 | `no-eval-in-markdown` | warn | **info** |
| 6 | `no-script-tags-in-markdown` | warn | **info** |
| 7 | `openapi-tags` | warn | **info** |
| 8 | `openapi-tags-uniqueness` | error | **warn** |
| 9 | `operation-description` | warn | **info** |
| 10 | `operation-operationId` | warn | **info** |
| 11 | `operation-operationId-unique` | error | **warn** |
| 12 | `operation-operationId-valid-in-url` | warn | **info** |
| 13 | `operation-parameters` | warn | **info** |
| 14 | `operation-success-response` | warn | **info** |
| 15 | `operation-tags` | warn | **info** |
| 16 | `operation-tag-defined` | warn | **info** |
| 17 | `path-declarations-must-exist` | warn | **info** |
| 18 | `path-keys-no-trailing-slash` | warn | **info** |
| 19 | `path-not-include-query` | warn | **info** |
| 20 | `path-params` | error | **warn** |
| 21 | `typed-enum` | warn | **info** |
| 22 | `array-items` | error | **warn** |

#### OAS 2.0-only rules — recommended

| # | Rule | Previous severity | New severity |
|---|------|:-----------------:|:------------:|
| 23 | `oas2-anyOf` | warn | **info** |
| 24 | `oas2-api-host` | warn | **info** |
| 25 | `oas2-api-schemes` | warn | **info** |
| 26 | `oas2-discriminator` | warn | **info** |
| 27 | `oas2-host-trailing-slash` | warn | **info** |
| 28 | `oas2-oneOf` | warn | **info** |
| 29 | `oas2-operation-formData-consume-check` | warn | **info** |
| 30 | `oas2-operation-security-defined` | warn | **info** |
| 31 | `oas2-schema` | error | **warn** |
| 32 | `oas2-unused-definition` | warn | **info** |
| 33 | `oas2-valid-media-example` | warn | **info** |

**Total: 33 rules. Errors in ruleset: 0.**

---

### 2. `default-openapi-3-0` — OpenAPI 3.0 Default Ruleset

#### Common rules (OpenAPI v2 & v3) — recommended

| # | Rule | Previous severity | New severity |
|---|------|:-----------------:|:------------:|
| 1 | `duplicated-entry-in-enum` | warn | **info** |
| 2 | `info-contact` | warn | **info** |
| 3 | `info-description` | warn | **info** |
| 4 | `no-$ref-siblings` | warn | **info** |
| 5 | `no-eval-in-markdown` | warn | **info** |
| 6 | `no-script-tags-in-markdown` | warn | **info** |
| 7 | `openapi-tags` | warn | **info** |
| 8 | `openapi-tags-uniqueness` | error | **warn** |
| 9 | `operation-description` | warn | **info** |
| 10 | `operation-operationId` | warn | **info** |
| 11 | `operation-operationId-unique` | error | **warn** |
| 12 | `operation-operationId-valid-in-url` | warn | **info** |
| 13 | `operation-parameters` | warn | **info** |
| 14 | `operation-success-response` | warn | **info** |
| 15 | `operation-tags` | warn | **info** |
| 16 | `operation-tag-defined` | warn | **info** |
| 17 | `path-declarations-must-exist` | warn | **info** |
| 18 | `path-keys-no-trailing-slash` | warn | **info** |
| 19 | `path-not-include-query` | warn | **info** |
| 20 | `path-params` | error | **warn** |
| 21 | `typed-enum` | warn | **info** |
| 22 | `array-items` | error | **warn** |

#### OAS 3.0/3.1-only rules — recommended

| # | Rule | Previous severity | New severity |
|---|------|:-----------------:|:------------:|
| 23 | `oas3-api-servers` | warn | **info** |
| 24 | `oas3-examples-value-or-externalValue` | warn | **info** |
| 25 | `oas3-operation-security-defined` | warn | **info** |
| 26 | `oas3-server-trailing-slash` | warn | **info** |
| 27 | `oas3-unused-component` | warn | **info** |
| 28 | `oas3-valid-media-example` | warn | **info** |
| 29 | `oas3-valid-schema-example` | warn | **info** |
| 30 | `oas3-server-variables` | warn | **info** |
| 31 | `oas3-schema` | error | **warn** |
| 32 | `oas3-callbacks-in-callbacks` | warn | **info** |

**Total: 32 rules. Errors in ruleset: 0.**

---

### 3. `default-openapi-3-1` — OpenAPI 3.1 Default Ruleset

#### Common rules (OpenAPI v2 & v3) — recommended

| # | Rule | Previous severity | New severity |
|---|------|:-----------------:|:------------:|
| 1 | `duplicated-entry-in-enum` | warn | **info** |
| 2 | `info-contact` | warn | **info** |
| 3 | `info-description` | warn | **info** |
| 4 | `no-eval-in-markdown` | warn | **info** |
| 5 | `no-script-tags-in-markdown` | warn | **info** |
| 6 | `openapi-tags` | warn | **info** |
| 7 | `openapi-tags-uniqueness` | error | **warn** |
| 8 | `operation-description` | warn | **info** |
| 9 | `operation-operationId` | warn | **info** |
| 10 | `operation-operationId-unique` | error | **warn** |
| 11 | `operation-operationId-valid-in-url` | warn | **info** |
| 12 | `operation-parameters` | warn | **info** |
| 13 | `operation-success-response` | warn | **info** |
| 14 | `operation-tags` | warn | **info** |
| 15 | `operation-tag-defined` | warn | **info** |
| 16 | `path-declarations-must-exist` | warn | **info** |
| 17 | `path-keys-no-trailing-slash` | warn | **info** |
| 18 | `path-not-include-query` | warn | **info** |
| 19 | `path-params` | error | **warn** |
| 20 | `typed-enum` | warn | **info** |
| 21 | `array-items` | error | **warn** |

> Note: `no-$ref-siblings` is not included because `$ref` siblings are allowed in OpenAPI 3.1.

#### OAS 3.0/3.1-only rules — recommended

| # | Rule | Previous severity | New severity |
|---|------|:-----------------:|:------------:|
| 22 | `oas3-api-servers` | warn | **info** |
| 23 | `oas3-examples-value-or-externalValue` | warn | **info** |
| 24 | `oas3-operation-security-defined` | warn | **info** |
| 25 | `oas3-server-trailing-slash` | warn | **info** |
| 26 | `oas3-unused-component` | warn | **info** |
| 27 | `oas3-valid-media-example` | warn | **info** |
| 28 | `oas3-valid-schema-example` | warn | **info** |
| 29 | `oas3-server-variables` | warn | **info** |
| 30 | `oas3-schema` | error | **warn** |
| 31 | `oas3-callbacks-in-callbacks` | warn | **info** |

#### OAS 3.1-only rules — recommended

| # | Rule | Previous severity | New severity |
|---|------|:-----------------:|:------------:|
| 32 | `oas3_1-servers-in-webhook` | warn | **info** |
| 33 | `oas3_1-callbacks-in-webhook` | warn | **info** |

**Total: 33 rules. Errors in ruleset: 0.**

---

### 4. `default-asyncapi-3-0` — AsyncAPI 3.0 Default Ruleset

#### Common rules (AsyncAPI v2 & v3) — recommended

| # | Rule | Previous severity | New severity |
|---|------|:-----------------:|:------------:|
| 1 | `asyncapi-info-contact-properties` | warn | **info** |
| 2 | `asyncapi-info-contact` | warn | **info** |
| 3 | `asyncapi-info-description` | warn | **info** |
| 4 | `asyncapi-info-license` | warn | **info** |
| 5 | `asyncapi-servers` | warn | **info** |
| 6 | `asyncapi-unused-components-schema` | warn | **info** |
| 7 | `asyncapi-unused-components-server` | warn | **info** |
| 8 | `asyncapi-latest-version` | info | **hint** |
| 9 | `asyncapi-channel-parameters` | error | **warn** |

#### AsyncAPI v3-only rules — recommended

| # | Rule | Previous severity | New severity |
|---|------|:-----------------:|:------------:|
| 10 | `asyncapi-3-channel-no-empty-parameter` | warn | **info** |
| 11 | `asyncapi-3-channel-no-query-nor-fragment` | warn | **info** |
| 12 | `asyncapi-3-channel-no-trailing-slash` | warn | **info** |
| 13 | `asyncapi-3-operation-description` | warn | **info** |
| 14 | `asyncapi-3-server-no-empty-variable` | warn | **info** |
| 15 | `asyncapi-3-server-no-trailing-slash` | warn | **info** |
| 16 | `asyncapi-3-tags` | warn | **info** |
| 17 | `asyncapi-3-payload-unsupported-schemaFormat` | info | **hint** |
| 18 | `asyncapi-3-channel-servers` | error | **warn** |
| 19 | `asyncapi-3-headers-schema-type-object` | error | **warn** |
| 20 | `asyncapi-3-tags-uniqueness` | error | **warn** |
| 21 | `asyncapi-3-document-resolved` | error | **warn** |
| 22 | `asyncapi-3-document-unresolved` | error | **warn** |
| 23 | `asyncapi-3-operation-security` | error | **warn** |

**Total: 23 rules. Errors in ruleset: 0.**
