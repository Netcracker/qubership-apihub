# JSON Schema diff fixtures — `oneOf` combiner

Programmatic `oneOf` combiner diff cases. There are no YAML fixtures in this folder: before/after
schemas are built by `getCombinerDiffCaseDefinitions()` / `resolveCombinerDiffSchemas()` in
`packages/api-doc-viewer/src/stories/json-schema-diffs-suite/combiner-diff-case-definitions.ts` with the
shared `buildComprehensiveTypeSchema()` / `wrapInCombiner()` builders
(`packages/api-doc-viewer/src/stories/shared/combiner-schema-builder.ts`). Terminology:
[../../json-schema/README.md](../../json-schema/README.md#combiner-terminology).

## Cases

177 cases.

| # | caseId | summary |
|---|---|---|
| 1 | `001-string-add-option-number` | Added number option to existing string option |
| 2 | `002-string-remove-option-number` | Removed number option, keeping string |
| 3 | `003-string-add-option-integer` | Added integer option to existing string option |
| 4 | `004-string-remove-option-integer` | Removed integer option, keeping string |
| 5 | `005-string-add-option-boolean` | Added boolean option to existing string option |
| 6 | `006-string-remove-option-boolean` | Removed boolean option, keeping string |
| 7 | `007-string-add-option-array` | Added array option to existing string option |
| 8 | `008-string-remove-option-array` | Removed array option, keeping string |
| 9 | `009-string-add-option-object` | Added object option to existing string option |
| 10 | `010-string-remove-option-object` | Removed object option, keeping string |
| 11 | `011-number-add-option-string` | Added string option to existing number option |
| 12 | `012-number-remove-option-string` | Removed string option, keeping number |
| 13 | `013-number-add-option-integer` | Added integer option to existing number option |
| 14 | `014-number-remove-option-integer` | Removed integer option, keeping number |
| 15 | `015-number-add-option-boolean` | Added boolean option to existing number option |
| 16 | `016-number-remove-option-boolean` | Removed boolean option, keeping number |
| 17 | `017-number-add-option-array` | Added array option to existing number option |
| 18 | `018-number-remove-option-array` | Removed array option, keeping number |
| 19 | `019-number-add-option-object` | Added object option to existing number option |
| 20 | `020-number-remove-option-object` | Removed object option, keeping number |
| 21 | `021-integer-add-option-string` | Added string option to existing integer option |
| 22 | `022-integer-remove-option-string` | Removed string option, keeping integer |
| 23 | `023-integer-add-option-number` | Added number option to existing integer option |
| 24 | `024-integer-remove-option-number` | Removed number option, keeping integer |
| 25 | `025-integer-add-option-boolean` | Added boolean option to existing integer option |
| 26 | `026-integer-remove-option-boolean` | Removed boolean option, keeping integer |
| 27 | `027-integer-add-option-array` | Added array option to existing integer option |
| 28 | `028-integer-remove-option-array` | Removed array option, keeping integer |
| 29 | `029-integer-add-option-object` | Added object option to existing integer option |
| 30 | `030-integer-remove-option-object` | Removed object option, keeping integer |
| 31 | `031-boolean-add-option-string` | Added string option to existing boolean option |
| 32 | `032-boolean-remove-option-string` | Removed string option, keeping boolean |
| 33 | `033-boolean-add-option-number` | Added number option to existing boolean option |
| 34 | `034-boolean-remove-option-number` | Removed number option, keeping boolean |
| 35 | `035-boolean-add-option-integer` | Added integer option to existing boolean option |
| 36 | `036-boolean-remove-option-integer` | Removed integer option, keeping boolean |
| 37 | `037-boolean-add-option-array` | Added array option to existing boolean option |
| 38 | `038-boolean-remove-option-array` | Removed array option, keeping boolean |
| 39 | `039-boolean-add-option-object` | Added object option to existing boolean option |
| 40 | `040-boolean-remove-option-object` | Removed object option, keeping boolean |
| 41 | `041-array-add-option-string` | Added string option to existing array option |
| 42 | `042-array-remove-option-string` | Removed string option, keeping array |
| 43 | `043-array-add-option-number` | Added number option to existing array option |
| 44 | `044-array-remove-option-number` | Removed number option, keeping array |
| 45 | `045-array-add-option-integer` | Added integer option to existing array option |
| 46 | `046-array-remove-option-integer` | Removed integer option, keeping array |
| 47 | `047-array-add-option-boolean` | Added boolean option to existing array option |
| 48 | `048-array-remove-option-boolean` | Removed boolean option, keeping array |
| 49 | `049-array-add-option-object` | Added object option to existing array option |
| 50 | `050-array-remove-option-object` | Removed object option, keeping array |
| 51 | `051-object-add-option-string` | Added string option to existing object option |
| 52 | `052-object-remove-option-string` | Removed string option, keeping object |
| 53 | `053-object-add-option-number` | Added number option to existing object option |
| 54 | `054-object-remove-option-number` | Removed number option, keeping object |
| 55 | `055-object-add-option-integer` | Added integer option to existing object option |
| 56 | `056-object-remove-option-integer` | Removed integer option, keeping object |
| 57 | `057-object-add-option-boolean` | Added boolean option to existing object option |
| 58 | `058-object-remove-option-boolean` | Removed boolean option, keeping object |
| 59 | `059-object-add-option-array` | Added array option to existing object option |
| 60 | `060-object-remove-option-array` | Removed array option, keeping object |
| 61 | `061-all-types-string-title-added` | All-types combiner: added title "MyString" to the string option |
| 62 | `062-all-types-string-title-removed` | All-types combiner: removed title from the string option |
| 63 | `063-all-types-string-title-replaced` | All-types combiner: replaced title on the string option |
| 64 | `064-all-types-string-format-added` | All-types combiner: added format "ISODateTime" to the string option |
| 65 | `065-all-types-string-format-removed` | All-types combiner: removed format from the string option |
| 66 | `066-all-types-string-format-replaced` | All-types combiner: replaced format on the string option |
| 67 | `067-all-types-string-to-number` | All-types combiner: changed the string option's type to number |
| 68 | `068-all-types-string-to-integer` | All-types combiner: changed the string option's type to integer |
| 69 | `069-all-types-string-to-boolean` | All-types combiner: changed the string option's type to boolean |
| 70 | `070-all-types-string-to-array` | All-types combiner: changed the string option's type to array |
| 71 | `071-all-types-string-to-object` | All-types combiner: changed the string option's type to object |
| 72 | `072-all-types-number-title-added` | All-types combiner: added title "MyNumber" to the number option |
| 73 | `073-all-types-number-title-removed` | All-types combiner: removed title from the number option |
| 74 | `074-all-types-number-title-replaced` | All-types combiner: replaced title on the number option |
| 75 | `075-all-types-number-format-added` | All-types combiner: added format "ISODateTime" to the number option |
| 76 | `076-all-types-number-format-removed` | All-types combiner: removed format from the number option |
| 77 | `077-all-types-number-format-replaced` | All-types combiner: replaced format on the number option |
| 78 | `078-all-types-number-to-string` | All-types combiner: changed the number option's type to string |
| 79 | `079-all-types-number-to-integer` | All-types combiner: changed the number option's type to integer |
| 80 | `080-all-types-number-to-boolean` | All-types combiner: changed the number option's type to boolean |
| 81 | `081-all-types-number-to-array` | All-types combiner: changed the number option's type to array |
| 82 | `082-all-types-number-to-object` | All-types combiner: changed the number option's type to object |
| 83 | `083-all-types-integer-title-added` | All-types combiner: added title "MyInteger" to the integer option |
| 84 | `084-all-types-integer-title-removed` | All-types combiner: removed title from the integer option |
| 85 | `085-all-types-integer-title-replaced` | All-types combiner: replaced title on the integer option |
| 86 | `086-all-types-integer-format-added` | All-types combiner: added format "ISODateTime" to the integer option |
| 87 | `087-all-types-integer-format-removed` | All-types combiner: removed format from the integer option |
| 88 | `088-all-types-integer-format-replaced` | All-types combiner: replaced format on the integer option |
| 89 | `089-all-types-integer-to-string` | All-types combiner: changed the integer option's type to string |
| 90 | `090-all-types-integer-to-number` | All-types combiner: changed the integer option's type to number |
| 91 | `091-all-types-integer-to-boolean` | All-types combiner: changed the integer option's type to boolean |
| 92 | `092-all-types-integer-to-array` | All-types combiner: changed the integer option's type to array |
| 93 | `093-all-types-integer-to-object` | All-types combiner: changed the integer option's type to object |
| 94 | `094-all-types-boolean-title-added` | All-types combiner: added title "MyBoolean" to the boolean option |
| 95 | `095-all-types-boolean-title-removed` | All-types combiner: removed title from the boolean option |
| 96 | `096-all-types-boolean-title-replaced` | All-types combiner: replaced title on the boolean option |
| 97 | `097-all-types-boolean-format-added` | All-types combiner: added format "ISODateTime" to the boolean option |
| 98 | `098-all-types-boolean-format-removed` | All-types combiner: removed format from the boolean option |
| 99 | `099-all-types-boolean-format-replaced` | All-types combiner: replaced format on the boolean option |
| 100 | `100-all-types-boolean-to-string` | All-types combiner: changed the boolean option's type to string |
| 101 | `101-all-types-boolean-to-number` | All-types combiner: changed the boolean option's type to number |
| 102 | `102-all-types-boolean-to-integer` | All-types combiner: changed the boolean option's type to integer |
| 103 | `103-all-types-boolean-to-array` | All-types combiner: changed the boolean option's type to array |
| 104 | `104-all-types-boolean-to-object` | All-types combiner: changed the boolean option's type to object |
| 105 | `105-all-types-array-title-added` | All-types combiner: added title "MyArray" to the array option |
| 106 | `106-all-types-array-title-removed` | All-types combiner: removed title from the array option |
| 107 | `107-all-types-array-title-replaced` | All-types combiner: replaced title on the array option |
| 108 | `108-all-types-array-format-added` | All-types combiner: added format "ISODateTime" to the array option |
| 109 | `109-all-types-array-format-removed` | All-types combiner: removed format from the array option |
| 110 | `110-all-types-array-format-replaced` | All-types combiner: replaced format on the array option |
| 111 | `111-all-types-array-to-string` | All-types combiner: changed the array option's type to string |
| 112 | `112-all-types-array-to-number` | All-types combiner: changed the array option's type to number |
| 113 | `113-all-types-array-to-integer` | All-types combiner: changed the array option's type to integer |
| 114 | `114-all-types-array-to-boolean` | All-types combiner: changed the array option's type to boolean |
| 115 | `115-all-types-array-to-object` | All-types combiner: changed the array option's type to object |
| 116 | `116-all-types-object-title-added` | All-types combiner: added title "MyObject" to the object option |
| 117 | `117-all-types-object-title-removed` | All-types combiner: removed title from the object option |
| 118 | `118-all-types-object-title-replaced` | All-types combiner: replaced title on the object option |
| 119 | `119-all-types-object-format-added` | All-types combiner: added format "ISODateTime" to the object option |
| 120 | `120-all-types-object-format-removed` | All-types combiner: removed format from the object option |
| 121 | `121-all-types-object-format-replaced` | All-types combiner: replaced format on the object option |
| 122 | `122-all-types-object-to-string` | All-types combiner: changed the object option's type to string |
| 123 | `123-all-types-object-to-number` | All-types combiner: changed the object option's type to number |
| 124 | `124-all-types-object-to-integer` | All-types combiner: changed the object option's type to integer |
| 125 | `125-all-types-object-to-boolean` | All-types combiner: changed the object option's type to boolean |
| 126 | `126-all-types-object-to-array` | All-types combiner: changed the object option's type to array |
| 127 | `127-add-option-number-wrapped-in-one-of` | Added number option wrapped in nested oneOf |
| 128 | `128-remove-option-number-wrapped-in-one-of` | Removed number option that was wrapped in nested oneOf |
| 129 | `129-add-option-number-wrapped-in-any-of` | Added number option wrapped in nested anyOf |
| 130 | `130-remove-option-number-wrapped-in-any-of` | Removed number option that was wrapped in nested anyOf |
| 131 | `131-add-option-number-wrapped-in-all-of` | Added number option wrapped in nested allOf |
| 132 | `132-remove-option-number-wrapped-in-all-of` | Removed number option that was wrapped in nested allOf |
| 133 | `133-nested-one-of-string-title-added` | 2nd-combiner (oneOf): added title "MyString" on the string option |
| 134 | `134-nested-one-of-string-title-removed` | 2nd-combiner (oneOf): removed title on the string option |
| 135 | `135-nested-one-of-string-title-replaced` | 2nd-combiner (oneOf): replaced title on the string option |
| 136 | `136-nested-one-of-string-format-added` | 2nd-combiner (oneOf): added format "ISODateTime" on the string option |
| 137 | `137-nested-one-of-string-format-removed` | 2nd-combiner (oneOf): removed format on the string option |
| 138 | `138-nested-one-of-string-type-changed` | 2nd-combiner (oneOf): changed type to number on the string option |
| 139 | `139-nested-any-of-string-title-added` | 2nd-combiner (anyOf): added title "MyString" on the string option |
| 140 | `140-nested-any-of-string-title-removed` | 2nd-combiner (anyOf): removed title on the string option |
| 141 | `141-nested-any-of-string-title-replaced` | 2nd-combiner (anyOf): replaced title on the string option |
| 142 | `142-nested-any-of-string-format-added` | 2nd-combiner (anyOf): added format "ISODateTime" on the string option |
| 143 | `143-nested-any-of-string-format-removed` | 2nd-combiner (anyOf): removed format on the string option |
| 144 | `144-nested-any-of-string-type-changed` | 2nd-combiner (anyOf): changed type to number on the string option |
| 145 | `145-nested-all-of-string-title-added` | 2nd-combiner (allOf): added title "MyString" on the string option |
| 146 | `146-nested-all-of-string-title-removed` | 2nd-combiner (allOf): removed title on the string option |
| 147 | `147-nested-all-of-string-title-replaced` | 2nd-combiner (allOf): replaced title on the string option |
| 148 | `148-nested-all-of-string-format-added` | 2nd-combiner (allOf): added format "ISODateTime" on the string option |
| 149 | `149-nested-all-of-string-format-removed` | 2nd-combiner (allOf): removed format on the string option |
| 150 | `150-nested-all-of-string-type-changed` | 2nd-combiner (allOf): changed type to number on the string option |
| 151 | `151-nested-one-of-nested-one-of-string-title-added` | 3rd-combiner (oneOf inside oneOf): added title "MyString" on the string option |
| 152 | `152-nested-one-of-nested-one-of-string-title-removed` | 3rd-combiner (oneOf inside oneOf): removed title on the string option |
| 153 | `153-nested-one-of-nested-one-of-string-title-replaced` | 3rd-combiner (oneOf inside oneOf): replaced title on the string option |
| 154 | `154-nested-one-of-nested-any-of-string-title-added` | 3rd-combiner (anyOf inside oneOf): added title "MyString" on the string option |
| 155 | `155-nested-one-of-nested-any-of-string-title-removed` | 3rd-combiner (anyOf inside oneOf): removed title on the string option |
| 156 | `156-nested-one-of-nested-any-of-string-title-replaced` | 3rd-combiner (anyOf inside oneOf): replaced title on the string option |
| 157 | `157-nested-one-of-nested-all-of-string-title-added` | 3rd-combiner (allOf inside oneOf): added title "MyString" on the string option |
| 158 | `158-nested-one-of-nested-all-of-string-title-removed` | 3rd-combiner (allOf inside oneOf): removed title on the string option |
| 159 | `159-nested-one-of-nested-all-of-string-title-replaced` | 3rd-combiner (allOf inside oneOf): replaced title on the string option |
| 160 | `160-nested-any-of-nested-one-of-string-title-added` | 3rd-combiner (oneOf inside anyOf): added title "MyString" on the string option |
| 161 | `161-nested-any-of-nested-one-of-string-title-removed` | 3rd-combiner (oneOf inside anyOf): removed title on the string option |
| 162 | `162-nested-any-of-nested-one-of-string-title-replaced` | 3rd-combiner (oneOf inside anyOf): replaced title on the string option |
| 163 | `163-nested-any-of-nested-any-of-string-title-added` | 3rd-combiner (anyOf inside anyOf): added title "MyString" on the string option |
| 164 | `164-nested-any-of-nested-any-of-string-title-removed` | 3rd-combiner (anyOf inside anyOf): removed title on the string option |
| 165 | `165-nested-any-of-nested-any-of-string-title-replaced` | 3rd-combiner (anyOf inside anyOf): replaced title on the string option |
| 166 | `166-nested-any-of-nested-all-of-string-title-added` | 3rd-combiner (allOf inside anyOf): added title "MyString" on the string option |
| 167 | `167-nested-any-of-nested-all-of-string-title-removed` | 3rd-combiner (allOf inside anyOf): removed title on the string option |
| 168 | `168-nested-any-of-nested-all-of-string-title-replaced` | 3rd-combiner (allOf inside anyOf): replaced title on the string option |
| 169 | `169-nested-all-of-nested-one-of-string-title-added` | 3rd-combiner (oneOf inside allOf): added title "MyString" on the string option |
| 170 | `170-nested-all-of-nested-one-of-string-title-removed` | 3rd-combiner (oneOf inside allOf): removed title on the string option |
| 171 | `171-nested-all-of-nested-one-of-string-title-replaced` | 3rd-combiner (oneOf inside allOf): replaced title on the string option |
| 172 | `172-nested-all-of-nested-any-of-string-title-added` | 3rd-combiner (anyOf inside allOf): added title "MyString" on the string option |
| 173 | `173-nested-all-of-nested-any-of-string-title-removed` | 3rd-combiner (anyOf inside allOf): removed title on the string option |
| 174 | `174-nested-all-of-nested-any-of-string-title-replaced` | 3rd-combiner (anyOf inside allOf): replaced title on the string option |
| 175 | `175-nested-all-of-nested-all-of-string-title-added` | 3rd-combiner (allOf inside allOf): added title "MyString" on the string option |
| 176 | `176-nested-all-of-nested-all-of-string-title-removed` | 3rd-combiner (allOf inside allOf): removed title on the string option |
| 177 | `177-nested-all-of-nested-all-of-string-title-replaced` | 3rd-combiner (allOf inside allOf): replaced title on the string option |

## Storybook and screenshot tests

| Story title | Story / IT files |
| --- | --- |
| `JSON Schema Diffs Suite/Combiners/One Of Combiner Diffs Suite` | `src/stories/json-schema-diffs-suite/one-of-combiner-diffs-suite.stories.tsx`, `src/it/json-schema-diffs-suite/one-of-combiner-diffs-suite.it-test.ts` |

## Regenerate

From `packages/api-doc-viewer/`:

```bash
node --experimental-strip-types bin/generate-combiner-diffs-suite-stories.mjs
node --experimental-strip-types bin/generate-combiner-diffs-suite-tests.mjs
```
