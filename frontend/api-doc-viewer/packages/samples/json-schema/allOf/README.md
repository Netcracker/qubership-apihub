# JSON Schema fixtures — `allOf` combiner

Programmatic `allOf` combiner cases for the plain JSON Schema viewer. There are no YAML fixtures in
this folder: schemas are built by `getCombinerPlainCaseDefinitions()` / `resolveCombinerPlainSchema()`
in `packages/api-doc-viewer/src/stories/json-schema-suite/combiner-plain-case-definitions.ts` with the
shared `buildComprehensiveTypeSchema()` / `wrapInCombiner()` builders
(`packages/api-doc-viewer/src/stories/shared/combiner-schema-builder.ts`). Terminology:
[../README.md](../README.md#combiner-terminology).

## Cases

97 cases.

| # | caseId | summary |
|---|---|---|
| 1 | `001-string-schema` | Simple combiner: single string option (comprehensive schema) |
| 2 | `002-number-schema` | Simple combiner: single number option (comprehensive schema) |
| 3 | `003-integer-schema` | Simple combiner: single integer option (comprehensive schema) |
| 4 | `004-boolean-schema` | Simple combiner: single boolean option (comprehensive schema) |
| 5 | `005-array-schema` | Simple combiner: single array option (comprehensive schema) |
| 6 | `006-object-schema` | Simple combiner: single object option (comprehensive schema) |
| 7 | `007-all-types-schema` | Simple combiner: options of all schema types |
| 8 | `008-string-MyString-NULL-schema` | Simple combiner: single string option with title "MyString", no format |
| 9 | `009-string-NULL-ISODateTime-schema` | Simple combiner: single string option with format "ISODateTime", no title |
| 10 | `010-string-MyString-ISODateTime-schema` | Simple combiner: single string option with title "MyString" and format "ISODateTime" |
| 11 | `011-number-MyNumber-NULL-schema` | Simple combiner: single number option with title "MyNumber", no format |
| 12 | `012-number-NULL-ISODateTime-schema` | Simple combiner: single number option with format "ISODateTime", no title |
| 13 | `013-number-MyNumber-ISODateTime-schema` | Simple combiner: single number option with title "MyNumber" and format "ISODateTime" |
| 14 | `014-integer-MyInteger-NULL-schema` | Simple combiner: single integer option with title "MyInteger", no format |
| 15 | `015-integer-NULL-ISODateTime-schema` | Simple combiner: single integer option with format "ISODateTime", no title |
| 16 | `016-integer-MyInteger-ISODateTime-schema` | Simple combiner: single integer option with title "MyInteger" and format "ISODateTime" |
| 17 | `017-boolean-MyBoolean-NULL-schema` | Simple combiner: single boolean option with title "MyBoolean", no format |
| 18 | `018-boolean-NULL-ISODateTime-schema` | Simple combiner: single boolean option with format "ISODateTime", no title |
| 19 | `019-boolean-MyBoolean-ISODateTime-schema` | Simple combiner: single boolean option with title "MyBoolean" and format "ISODateTime" |
| 20 | `020-array-MyArray-NULL-schema` | Simple combiner: single array option with title "MyArray", no format |
| 21 | `021-array-NULL-ISODateTime-schema` | Simple combiner: single array option with format "ISODateTime", no title |
| 22 | `022-array-MyArray-ISODateTime-schema` | Simple combiner: single array option with title "MyArray" and format "ISODateTime" |
| 23 | `023-object-MyObject-NULL-schema` | Simple combiner: single object option with title "MyObject", no format |
| 24 | `024-object-NULL-ISODateTime-schema` | Simple combiner: single object option with format "ISODateTime", no title |
| 25 | `025-object-MyObject-ISODateTime-schema` | Simple combiner: single object option with title "MyObject" and format "ISODateTime" |
| 26 | `026-string-schema-one-of` | Complex combiner: single string option, 2nd-combiner (oneOf) nested inside 1st-combiner (allOf) |
| 27 | `027-number-schema-one-of` | Complex combiner: single number option, 2nd-combiner (oneOf) nested inside 1st-combiner (allOf) |
| 28 | `028-integer-schema-one-of` | Complex combiner: single integer option, 2nd-combiner (oneOf) nested inside 1st-combiner (allOf) |
| 29 | `029-boolean-schema-one-of` | Complex combiner: single boolean option, 2nd-combiner (oneOf) nested inside 1st-combiner (allOf) |
| 30 | `030-array-schema-one-of` | Complex combiner: single array option, 2nd-combiner (oneOf) nested inside 1st-combiner (allOf) |
| 31 | `031-object-schema-one-of` | Complex combiner: single object option, 2nd-combiner (oneOf) nested inside 1st-combiner (allOf) |
| 32 | `032-string-schema-any-of` | Complex combiner: single string option, 2nd-combiner (anyOf) nested inside 1st-combiner (allOf) |
| 33 | `033-number-schema-any-of` | Complex combiner: single number option, 2nd-combiner (anyOf) nested inside 1st-combiner (allOf) |
| 34 | `034-integer-schema-any-of` | Complex combiner: single integer option, 2nd-combiner (anyOf) nested inside 1st-combiner (allOf) |
| 35 | `035-boolean-schema-any-of` | Complex combiner: single boolean option, 2nd-combiner (anyOf) nested inside 1st-combiner (allOf) |
| 36 | `036-array-schema-any-of` | Complex combiner: single array option, 2nd-combiner (anyOf) nested inside 1st-combiner (allOf) |
| 37 | `037-object-schema-any-of` | Complex combiner: single object option, 2nd-combiner (anyOf) nested inside 1st-combiner (allOf) |
| 38 | `038-string-schema-all-of` | Complex combiner: single string option, 2nd-combiner (allOf) nested inside 1st-combiner (allOf) |
| 39 | `039-number-schema-all-of` | Complex combiner: single number option, 2nd-combiner (allOf) nested inside 1st-combiner (allOf) |
| 40 | `040-integer-schema-all-of` | Complex combiner: single integer option, 2nd-combiner (allOf) nested inside 1st-combiner (allOf) |
| 41 | `041-boolean-schema-all-of` | Complex combiner: single boolean option, 2nd-combiner (allOf) nested inside 1st-combiner (allOf) |
| 42 | `042-array-schema-all-of` | Complex combiner: single array option, 2nd-combiner (allOf) nested inside 1st-combiner (allOf) |
| 43 | `043-object-schema-all-of` | Complex combiner: single object option, 2nd-combiner (allOf) nested inside 1st-combiner (allOf) |
| 44 | `044-string-schema-one-of-one-of` | Complex combiner: single string option, 3rd-combiner (oneOf) nested inside 2nd-combiner (oneOf) inside 1st-combiner (allOf) |
| 45 | `045-number-schema-one-of-one-of` | Complex combiner: single number option, 3rd-combiner (oneOf) nested inside 2nd-combiner (oneOf) inside 1st-combiner (allOf) |
| 46 | `046-integer-schema-one-of-one-of` | Complex combiner: single integer option, 3rd-combiner (oneOf) nested inside 2nd-combiner (oneOf) inside 1st-combiner (allOf) |
| 47 | `047-boolean-schema-one-of-one-of` | Complex combiner: single boolean option, 3rd-combiner (oneOf) nested inside 2nd-combiner (oneOf) inside 1st-combiner (allOf) |
| 48 | `048-array-schema-one-of-one-of` | Complex combiner: single array option, 3rd-combiner (oneOf) nested inside 2nd-combiner (oneOf) inside 1st-combiner (allOf) |
| 49 | `049-object-schema-one-of-one-of` | Complex combiner: single object option, 3rd-combiner (oneOf) nested inside 2nd-combiner (oneOf) inside 1st-combiner (allOf) |
| 50 | `050-string-schema-one-of-any-of` | Complex combiner: single string option, 3rd-combiner (anyOf) nested inside 2nd-combiner (oneOf) inside 1st-combiner (allOf) |
| 51 | `051-number-schema-one-of-any-of` | Complex combiner: single number option, 3rd-combiner (anyOf) nested inside 2nd-combiner (oneOf) inside 1st-combiner (allOf) |
| 52 | `052-integer-schema-one-of-any-of` | Complex combiner: single integer option, 3rd-combiner (anyOf) nested inside 2nd-combiner (oneOf) inside 1st-combiner (allOf) |
| 53 | `053-boolean-schema-one-of-any-of` | Complex combiner: single boolean option, 3rd-combiner (anyOf) nested inside 2nd-combiner (oneOf) inside 1st-combiner (allOf) |
| 54 | `054-array-schema-one-of-any-of` | Complex combiner: single array option, 3rd-combiner (anyOf) nested inside 2nd-combiner (oneOf) inside 1st-combiner (allOf) |
| 55 | `055-object-schema-one-of-any-of` | Complex combiner: single object option, 3rd-combiner (anyOf) nested inside 2nd-combiner (oneOf) inside 1st-combiner (allOf) |
| 56 | `056-string-schema-one-of-all-of` | Complex combiner: single string option, 3rd-combiner (allOf) nested inside 2nd-combiner (oneOf) inside 1st-combiner (allOf) |
| 57 | `057-number-schema-one-of-all-of` | Complex combiner: single number option, 3rd-combiner (allOf) nested inside 2nd-combiner (oneOf) inside 1st-combiner (allOf) |
| 58 | `058-integer-schema-one-of-all-of` | Complex combiner: single integer option, 3rd-combiner (allOf) nested inside 2nd-combiner (oneOf) inside 1st-combiner (allOf) |
| 59 | `059-boolean-schema-one-of-all-of` | Complex combiner: single boolean option, 3rd-combiner (allOf) nested inside 2nd-combiner (oneOf) inside 1st-combiner (allOf) |
| 60 | `060-array-schema-one-of-all-of` | Complex combiner: single array option, 3rd-combiner (allOf) nested inside 2nd-combiner (oneOf) inside 1st-combiner (allOf) |
| 61 | `061-object-schema-one-of-all-of` | Complex combiner: single object option, 3rd-combiner (allOf) nested inside 2nd-combiner (oneOf) inside 1st-combiner (allOf) |
| 62 | `062-string-schema-any-of-one-of` | Complex combiner: single string option, 3rd-combiner (oneOf) nested inside 2nd-combiner (anyOf) inside 1st-combiner (allOf) |
| 63 | `063-number-schema-any-of-one-of` | Complex combiner: single number option, 3rd-combiner (oneOf) nested inside 2nd-combiner (anyOf) inside 1st-combiner (allOf) |
| 64 | `064-integer-schema-any-of-one-of` | Complex combiner: single integer option, 3rd-combiner (oneOf) nested inside 2nd-combiner (anyOf) inside 1st-combiner (allOf) |
| 65 | `065-boolean-schema-any-of-one-of` | Complex combiner: single boolean option, 3rd-combiner (oneOf) nested inside 2nd-combiner (anyOf) inside 1st-combiner (allOf) |
| 66 | `066-array-schema-any-of-one-of` | Complex combiner: single array option, 3rd-combiner (oneOf) nested inside 2nd-combiner (anyOf) inside 1st-combiner (allOf) |
| 67 | `067-object-schema-any-of-one-of` | Complex combiner: single object option, 3rd-combiner (oneOf) nested inside 2nd-combiner (anyOf) inside 1st-combiner (allOf) |
| 68 | `068-string-schema-any-of-any-of` | Complex combiner: single string option, 3rd-combiner (anyOf) nested inside 2nd-combiner (anyOf) inside 1st-combiner (allOf) |
| 69 | `069-number-schema-any-of-any-of` | Complex combiner: single number option, 3rd-combiner (anyOf) nested inside 2nd-combiner (anyOf) inside 1st-combiner (allOf) |
| 70 | `070-integer-schema-any-of-any-of` | Complex combiner: single integer option, 3rd-combiner (anyOf) nested inside 2nd-combiner (anyOf) inside 1st-combiner (allOf) |
| 71 | `071-boolean-schema-any-of-any-of` | Complex combiner: single boolean option, 3rd-combiner (anyOf) nested inside 2nd-combiner (anyOf) inside 1st-combiner (allOf) |
| 72 | `072-array-schema-any-of-any-of` | Complex combiner: single array option, 3rd-combiner (anyOf) nested inside 2nd-combiner (anyOf) inside 1st-combiner (allOf) |
| 73 | `073-object-schema-any-of-any-of` | Complex combiner: single object option, 3rd-combiner (anyOf) nested inside 2nd-combiner (anyOf) inside 1st-combiner (allOf) |
| 74 | `074-string-schema-any-of-all-of` | Complex combiner: single string option, 3rd-combiner (allOf) nested inside 2nd-combiner (anyOf) inside 1st-combiner (allOf) |
| 75 | `075-number-schema-any-of-all-of` | Complex combiner: single number option, 3rd-combiner (allOf) nested inside 2nd-combiner (anyOf) inside 1st-combiner (allOf) |
| 76 | `076-integer-schema-any-of-all-of` | Complex combiner: single integer option, 3rd-combiner (allOf) nested inside 2nd-combiner (anyOf) inside 1st-combiner (allOf) |
| 77 | `077-boolean-schema-any-of-all-of` | Complex combiner: single boolean option, 3rd-combiner (allOf) nested inside 2nd-combiner (anyOf) inside 1st-combiner (allOf) |
| 78 | `078-array-schema-any-of-all-of` | Complex combiner: single array option, 3rd-combiner (allOf) nested inside 2nd-combiner (anyOf) inside 1st-combiner (allOf) |
| 79 | `079-object-schema-any-of-all-of` | Complex combiner: single object option, 3rd-combiner (allOf) nested inside 2nd-combiner (anyOf) inside 1st-combiner (allOf) |
| 80 | `080-string-schema-all-of-one-of` | Complex combiner: single string option, 3rd-combiner (oneOf) nested inside 2nd-combiner (allOf) inside 1st-combiner (allOf) |
| 81 | `081-number-schema-all-of-one-of` | Complex combiner: single number option, 3rd-combiner (oneOf) nested inside 2nd-combiner (allOf) inside 1st-combiner (allOf) |
| 82 | `082-integer-schema-all-of-one-of` | Complex combiner: single integer option, 3rd-combiner (oneOf) nested inside 2nd-combiner (allOf) inside 1st-combiner (allOf) |
| 83 | `083-boolean-schema-all-of-one-of` | Complex combiner: single boolean option, 3rd-combiner (oneOf) nested inside 2nd-combiner (allOf) inside 1st-combiner (allOf) |
| 84 | `084-array-schema-all-of-one-of` | Complex combiner: single array option, 3rd-combiner (oneOf) nested inside 2nd-combiner (allOf) inside 1st-combiner (allOf) |
| 85 | `085-object-schema-all-of-one-of` | Complex combiner: single object option, 3rd-combiner (oneOf) nested inside 2nd-combiner (allOf) inside 1st-combiner (allOf) |
| 86 | `086-string-schema-all-of-any-of` | Complex combiner: single string option, 3rd-combiner (anyOf) nested inside 2nd-combiner (allOf) inside 1st-combiner (allOf) |
| 87 | `087-number-schema-all-of-any-of` | Complex combiner: single number option, 3rd-combiner (anyOf) nested inside 2nd-combiner (allOf) inside 1st-combiner (allOf) |
| 88 | `088-integer-schema-all-of-any-of` | Complex combiner: single integer option, 3rd-combiner (anyOf) nested inside 2nd-combiner (allOf) inside 1st-combiner (allOf) |
| 89 | `089-boolean-schema-all-of-any-of` | Complex combiner: single boolean option, 3rd-combiner (anyOf) nested inside 2nd-combiner (allOf) inside 1st-combiner (allOf) |
| 90 | `090-array-schema-all-of-any-of` | Complex combiner: single array option, 3rd-combiner (anyOf) nested inside 2nd-combiner (allOf) inside 1st-combiner (allOf) |
| 91 | `091-object-schema-all-of-any-of` | Complex combiner: single object option, 3rd-combiner (anyOf) nested inside 2nd-combiner (allOf) inside 1st-combiner (allOf) |
| 92 | `092-string-schema-all-of-all-of` | Complex combiner: single string option, 3rd-combiner (allOf) nested inside 2nd-combiner (allOf) inside 1st-combiner (allOf) |
| 93 | `093-number-schema-all-of-all-of` | Complex combiner: single number option, 3rd-combiner (allOf) nested inside 2nd-combiner (allOf) inside 1st-combiner (allOf) |
| 94 | `094-integer-schema-all-of-all-of` | Complex combiner: single integer option, 3rd-combiner (allOf) nested inside 2nd-combiner (allOf) inside 1st-combiner (allOf) |
| 95 | `095-boolean-schema-all-of-all-of` | Complex combiner: single boolean option, 3rd-combiner (allOf) nested inside 2nd-combiner (allOf) inside 1st-combiner (allOf) |
| 96 | `096-array-schema-all-of-all-of` | Complex combiner: single array option, 3rd-combiner (allOf) nested inside 2nd-combiner (allOf) inside 1st-combiner (allOf) |
| 97 | `097-object-schema-all-of-all-of` | Complex combiner: single object option, 3rd-combiner (allOf) nested inside 2nd-combiner (allOf) inside 1st-combiner (allOf) |

**json-schema grand total: 291 cases** (across oneOf/anyOf/allOf).

## Storybook and screenshot tests

| Story title | Story / IT files |
| --- | --- |
| `JSON Schema Suite/Combiners/All Of Combiner Suite` | `src/stories/json-schema-suite/all-of-combiner-suite.stories.tsx`, `src/it/json-schema-suite/all-of-combiner-suite.it-test.ts` |

## Regenerate

From `packages/api-doc-viewer/`:

```bash
node --experimental-strip-types bin/generate-combiner-suite-stories.mjs
node --experimental-strip-types bin/generate-combiner-suite-tests.mjs
```
