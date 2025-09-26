# qubership-apihub-api-unifier

Unify API into a normalized presentation with all reference resolved, allOf combiners merged and other aspects unified.

Supports OpenAPI and GraphQL specifications processing.

## Modifications
- Added cycles support during combiners resolve
- Added origins support- it is now possible for any value in the unified JSO to track its origins in the source specification
- Store original ref for the object if the object was resolved from ref
- Gathered various API unification adapters from different libraries in the stack to a single place
- Support data structure hash calculation
- Process different phases sequentially (reference resolving, allOf merge, unification)
- Support synthetic `any` and `nothing` type for OAS
- Added deprecated items calculation
- Support new graphapi format
- Feature flags added to control behavior during processing
- Added a large number of tests
- Debug tooling for cycled JSO

## Features
- Safe merging of schemas combined with allOf in whole document
- Fastest implementation - up to x3 times faster then other popular libraries
- Merged schema does not validate more or less than the original schema
- Removes almost all logical impossibilities
- Correctly merge additionalProperties, patternProperties and properties taking into account common validations
- Correctly merge items and additionalItems taking into account common validations
- Supports custom rules to merge other document types and JsonSchema versions
- Supports input with circular references (JavaScript references)
- Supports $refs and circular $refs either (internal references only)
- Correctly merge of $refs with sibling content (optionally)
- Correctly merge of combiners (anyOf, oneOf) with sibling content (optionally)
- TypeScript syntax support out of the box
- No dependencies (except json-crawl), can be used in Node.js or browser

## Works perfectly with specifications

- [JsonSchema](https://json-schema.org/draft/2020-12/json-schema-core.html)
- [OpenApi 3.x](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md)
- GraphApi
- ~~Swagger 2.x~~ (roadmap)
- ~~AsyncApi 2.x~~ (roadmap)
- ~~AsyncApi 3.x~~ (roadmap)

## Other libraries
There are some libraries that can merge schemas combined with allOf. One of the most popular is [mokkabonna/json-schema-merge-allof](https://npmjs.com/package/json-schema-merge-allof), but it has some limitatons: Does not support circular $refs and no TypeScript syntax out of the box.

## License

MIT
