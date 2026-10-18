* Use isDefine util function to check for null or undefined
* Every measurement unit should have a dedicated type
* Do not simplify the type to a primitive after performing operations. E.g., operations on variables with type Pixel
  should result in Pixel
* Naming convention for sources: [kebab-case].ts
* Naming convention for stories: [kebab-case].story.ts
* Naming convention for tests: [kebab-case].it-test.ts
* Use union of constants instead of enum
* Reactive fields should have $ at the end of the name
* Use `Optional<...>` instead of `| null | undefined`
* Names of types or constants related to the same entity should have the common part at the beginning. E.g.,
  SUB_KEY_TITLE, SUB_KEY_INNER_LINK
* index.ts is for public API only