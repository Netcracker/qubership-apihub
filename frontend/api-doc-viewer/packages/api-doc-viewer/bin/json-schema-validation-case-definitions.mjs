const formatValidationCaseTitle = (subset, label) => `[${subset}] ${label}`;

const ARRAY_ITEMS = { type: "string" };

const SMALL_OBJECT_PROPERTIES = {
  name: { type: "string" },
  id: { type: "integer" },
};

const SMALL_OBJECT_VALUE = { name: "sample", id: 1 };
const SMALL_OBJECT_VALUE_2 = { name: "other", id: 2 };

const STRING_SAMPLE_VALUES = {
  empty: "",
  whitespaces: "     ",
  crlf: "\r\n",
  cr: "\r",
  lf: "\n",
  tab: "\t",
  padded: "    value with whitespaces around     ",
  plain: "just a value",
};

const EMAIL_PATTERN = "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$";

const withTitle = (subset, label, schema) => ({
  ...schema,
  title: formatValidationCaseTitle(subset, label),
});

/** @type {Array<{ group: string, cases: Array<{ slug: string, subset: string, label: string, schema: Record<string, unknown> }> }>} */
export const JSON_SCHEMA_VALIDATION_GROUPS = [
  {
    group: "array-validations",
    cases: [
      {
        slug: "default-arbitrary-array",
        subset: "default",
        label: "Arbitrary array matching items schema",
        schema: withTitle("default", "Arbitrary array matching items schema", {
          type: "array",
          items: ARRAY_ITEMS,
          default: ["alpha", "beta"],
        }),
      },
      {
        slug: "example-arbitrary-array",
        subset: "example",
        label: "One arbitrary array as example",
        schema: withTitle("example", "One arbitrary array as example", {
          type: "array",
          items: ARRAY_ITEMS,
          example: ["alpha", "beta", "gamma"],
        }),
      },
      {
        slug: "examples-two-items",
        subset: "examples",
        label: "Two example arrays matching items schema",
        schema: withTitle("examples", "Two example arrays matching items schema", {
          type: "array",
          items: ARRAY_ITEMS,
          examples: [["alpha"], ["alpha", "beta"]],
        }),
      },
      {
        slug: "min-items-0",
        subset: "items-count",
        label: "minItems = 0",
        schema: withTitle("items-count", "minItems = 0", {
          type: "array",
          items: ARRAY_ITEMS,
          minItems: 0,
        }),
      },
      {
        slug: "min-items-2",
        subset: "items-count",
        label: "minItems = 2",
        schema: withTitle("items-count", "minItems = 2", {
          type: "array",
          items: ARRAY_ITEMS,
          minItems: 2,
        }),
      },
      {
        slug: "max-items-5",
        subset: "items-count",
        label: "maxItems = 5",
        schema: withTitle("items-count", "maxItems = 5", {
          type: "array",
          items: ARRAY_ITEMS,
          maxItems: 5,
        }),
      },
      {
        slug: "min-items-0-max-items-5",
        subset: "items-count",
        label: "minItems = 0, maxItems = 5",
        schema: withTitle("items-count", "minItems = 0, maxItems = 5", {
          type: "array",
          items: ARRAY_ITEMS,
          minItems: 0,
          maxItems: 5,
        }),
      },
      {
        slug: "min-items-2-max-items-5",
        subset: "items-count",
        label: "minItems = 2, maxItems = 5",
        schema: withTitle("items-count", "minItems = 2, maxItems = 5", {
          type: "array",
          items: ARRAY_ITEMS,
          minItems: 2,
          maxItems: 5,
        }),
      },
      {
        slug: "unique-items-false",
        subset: "unique-items",
        label: "uniqueItems = false",
        schema: withTitle("unique-items", "uniqueItems = false", {
          type: "array",
          items: ARRAY_ITEMS,
          uniqueItems: false,
        }),
      },
      {
        slug: "unique-items-true",
        subset: "unique-items",
        label: "uniqueItems = true",
        schema: withTitle("unique-items", "uniqueItems = true", {
          type: "array",
          items: ARRAY_ITEMS,
          uniqueItems: true,
        }),
      },
    ],
  },
  {
    group: "boolean-validations",
    cases: [
      {
        slug: "default-false",
        subset: "default",
        label: "default = false",
        schema: withTitle("default", "default = false", { type: "boolean", default: false }),
      },
      {
        slug: "default-true",
        subset: "default",
        label: "default = true",
        schema: withTitle("default", "default = true", { type: "boolean", default: true }),
      },
      {
        slug: "example-false",
        subset: "example",
        label: "example = false",
        schema: withTitle("example", "example = false", { type: "boolean", example: false }),
      },
      {
        slug: "example-true",
        subset: "example",
        label: "example = true",
        schema: withTitle("example", "example = true", { type: "boolean", example: true }),
      },
      {
        slug: "examples-false",
        subset: "examples",
        label: "examples = [false]",
        schema: withTitle("examples", "examples = [false]", { type: "boolean", examples: [false] }),
      },
      {
        slug: "examples-true",
        subset: "examples",
        label: "examples = [true]",
        schema: withTitle("examples", "examples = [true]", { type: "boolean", examples: [true] }),
      },
      {
        slug: "examples-true-false",
        subset: "examples",
        label: "examples = [true, false]",
        schema: withTitle("examples", "examples = [true, false]", {
          type: "boolean",
          examples: [true, false],
        }),
      },
    ],
  },
  {
    group: "integer-validations",
    cases: [
      ...[0, 1, -1].flatMap((value) => [
        {
          slug: `default-${value}`,
          subset: "default",
          label: `default = ${value}`,
          schema: withTitle("default", `default = ${value}`, { type: "integer", default: value }),
        },
        {
          slug: `example-${value}`,
          subset: "example",
          label: `example = ${value}`,
          schema: withTitle("example", `example = ${value}`, { type: "integer", example: value }),
        },
      ]),
      {
        slug: "examples-0",
        subset: "examples",
        label: "examples = [0]",
        schema: withTitle("examples", "examples = [0]", { type: "integer", examples: [0] }),
      },
      {
        slug: "examples-1",
        subset: "examples",
        label: "examples = [1]",
        schema: withTitle("examples", "examples = [1]", { type: "integer", examples: [1] }),
      },
      {
        slug: "examples-minus-1",
        subset: "examples",
        label: "examples = [-1]",
        schema: withTitle("examples", "examples = [-1]", { type: "integer", examples: [-1] }),
      },
      {
        slug: "examples-minus-1-0-1",
        subset: "examples",
        label: "examples = [-1, 0, 1]",
        schema: withTitle("examples", "examples = [-1, 0, 1]", {
          type: "integer",
          examples: [-1, 0, 1],
        }),
      },
      ...[0, 1, -1].map((value) => ({
        slug: `multiple-of-${value}`,
        subset: "multiple-of",
        label: `multipleOf = ${value}`,
        schema: withTitle("multiple-of", `multipleOf = ${value}`, {
          type: "integer",
          multipleOf: value,
        }),
      })),
    ],
  },
  {
    group: "object-validations",
    cases: [
      {
        slug: "default-empty-object",
        subset: "default",
        label: "default = {}",
        schema: withTitle("default", "default = {}", {
          type: "object",
          properties: SMALL_OBJECT_PROPERTIES,
          default: {},
        }),
      },
      {
        slug: "default-small-object",
        subset: "default",
        label: "default = small object",
        schema: withTitle("default", "default = small object", {
          type: "object",
          properties: SMALL_OBJECT_PROPERTIES,
          default: SMALL_OBJECT_VALUE,
        }),
      },
      {
        slug: "example-empty-object",
        subset: "example",
        label: "example = {}",
        schema: withTitle("example", "example = {}", {
          type: "object",
          properties: SMALL_OBJECT_PROPERTIES,
          example: {},
        }),
      },
      {
        slug: "example-small-object",
        subset: "example",
        label: "example = small object",
        schema: withTitle("example", "example = small object", {
          type: "object",
          properties: SMALL_OBJECT_PROPERTIES,
          example: SMALL_OBJECT_VALUE,
        }),
      },
      {
        slug: "examples-empty-object",
        subset: "examples",
        label: "examples = [{}]",
        schema: withTitle("examples", "examples = [{}]", {
          type: "object",
          properties: SMALL_OBJECT_PROPERTIES,
          examples: [{}],
        }),
      },
      {
        slug: "examples-small-object",
        subset: "examples",
        label: "examples = [small object]",
        schema: withTitle("examples", "examples = [small object]", {
          type: "object",
          properties: SMALL_OBJECT_PROPERTIES,
          examples: [SMALL_OBJECT_VALUE],
        }),
      },
      {
        slug: "examples-two-objects",
        subset: "examples",
        label: "examples = [object 1, object 2]",
        schema: withTitle("examples", "examples = [object 1, object 2]", {
          type: "object",
          properties: SMALL_OBJECT_PROPERTIES,
          examples: [SMALL_OBJECT_VALUE, SMALL_OBJECT_VALUE_2],
        }),
      },
      {
        slug: "min-properties-0",
        subset: "properties-count",
        label: "minProperties = 0",
        schema: withTitle("properties-count", "minProperties = 0", {
          type: "object",
          properties: SMALL_OBJECT_PROPERTIES,
          minProperties: 0,
        }),
      },
      {
        slug: "min-properties-1",
        subset: "properties-count",
        label: "minProperties = 1",
        schema: withTitle("properties-count", "minProperties = 1", {
          type: "object",
          properties: SMALL_OBJECT_PROPERTIES,
          minProperties: 1,
        }),
      },
      {
        slug: "max-properties-1",
        subset: "properties-count",
        label: "maxProperties = 1",
        schema: withTitle("properties-count", "maxProperties = 1", {
          type: "object",
          properties: SMALL_OBJECT_PROPERTIES,
          maxProperties: 1,
        }),
      },
    ],
  },
  {
    group: "string-validations",
    cases: [
      ...Object.entries(STRING_SAMPLE_VALUES).flatMap(([key, value]) => [
        {
          slug: `default-${key}`,
          subset: "default",
          label: `default = ${JSON.stringify(value)}`,
          schema: withTitle("default", `default = ${JSON.stringify(value)}`, {
            type: "string",
            default: value,
          }),
        },
        {
          slug: `example-${key}`,
          subset: "example",
          label: `example = ${JSON.stringify(value)}`,
          schema: withTitle("example", `example = ${JSON.stringify(value)}`, {
            type: "string",
            example: value,
          }),
        },
      ]),
      {
        slug: "examples-all-samples",
        subset: "examples",
        label: "examples = all sample strings",
        schema: withTitle("examples", "examples = all sample strings", {
          type: "string",
          examples: Object.values(STRING_SAMPLE_VALUES),
        }),
      },
      {
        slug: "enum-all-samples",
        subset: "enum",
        label: "enum = all sample strings",
        schema: withTitle("enum", "enum = all sample strings", {
          type: "string",
          enum: Object.values(STRING_SAMPLE_VALUES),
        }),
      },
      {
        slug: "min-length-0",
        subset: "value-length",
        label: "minLength = 0",
        schema: withTitle("value-length", "minLength = 0", { type: "string", minLength: 0 }),
      },
      {
        slug: "min-length-1",
        subset: "value-length",
        label: "minLength = 1",
        schema: withTitle("value-length", "minLength = 1", { type: "string", minLength: 1 }),
      },
      {
        slug: "max-length-1",
        subset: "value-length",
        label: "maxLength = 1",
        schema: withTitle("value-length", "maxLength = 1", { type: "string", maxLength: 1 }),
      },
      {
        slug: "min-length-0-max-length-1",
        subset: "value-length",
        label: "minLength = 0, maxLength = 1",
        schema: withTitle("value-length", "minLength = 0, maxLength = 1", {
          type: "string",
          minLength: 0,
          maxLength: 1,
        }),
      },
      {
        slug: "min-length-1-max-length-2",
        subset: "value-length",
        label: "minLength = 1, maxLength = 2",
        schema: withTitle("value-length", "minLength = 1, maxLength = 2", {
          type: "string",
          minLength: 1,
          maxLength: 2,
        }),
      },
      {
        slug: "pattern-email",
        subset: "pattern",
        label: "pattern = email regexp",
        schema: withTitle("pattern", "pattern = email regexp", {
          type: "string",
          pattern: EMAIL_PATTERN,
        }),
      },
    ],
  },
];

export const listJsonSchemaValidationYamlCases = () =>
  JSON_SCHEMA_VALIDATION_GROUPS.flatMap(({ group, cases }) =>
    cases.map((sampleCase, index) => ({
      group,
      caseId: `${String(index + 1).padStart(3, "0")}-${sampleCase.slug}`,
      ...sampleCase,
    })),
  );

export const collectJsonSchemaValidationYamlCasesForGroup = (group) =>
  listJsonSchemaValidationYamlCases().filter((sampleCase) => sampleCase.group === group);

export const toValidationCaseExportName = (caseId) => `Case_${caseId.replaceAll("-", "_")}`;

/** Group folder Storybook titles get nested under; groups not listed here stay ungrouped. */
const VALIDATION_GROUP_TITLE_PREFIX = {
  "array-validations": "Array And Validations",
  "boolean-validations": "Boolean And Validations",
  "integer-validations": "Integer And Validations",
  "object-validations": "Object And Validations",
  "string-validations": "String And Validations",
};

/** @type {Array<{ group: string, title: string, metaId: string, storyFileName: string, testFileName: string, programmatic?: boolean }>} */
export const JSON_SCHEMA_VALIDATION_YAML_SUITES = JSON_SCHEMA_VALIDATION_GROUPS.map(
  ({ group }) => {
    const leaf = group.replaceAll("-", " ").replace(/\b\w/g, (char) => char.toUpperCase()).replace("Validations", " Validations");
    const groupPrefix = VALIDATION_GROUP_TITLE_PREFIX[group];
    return {
      group,
      title: groupPrefix ? `JSON Schema Suite/${groupPrefix}/${leaf}` : `JSON Schema Suite/${leaf}`,
      metaId: `json-schema-suite-${group}`,
      storyFileName: `${group}.stories.tsx`,
      testFileName: `${group}.it-test.ts`,
    };
  },
);

/** @type {Array<{ group: string, title: string, metaId: string, storyFileName: string, testFileName: string, schemaType: "integer" | "number", includeOas31Only: boolean, sampleBuilderName: string }>} */
export const JSON_SCHEMA_VALIDATION_VALUE_RANGE_SUITES = [
  {
    group: "integer-validations",
    schemaType: "integer",
    title: "JSON Schema Suite/Integer And Validations/Integer Validations Value Range",
    metaId: "json-schema-suite-integer-validations-value-range",
    storyFileName: "integer-validations-value-range.stories.tsx",
    testFileName: "integer-validations-value-range.it-test.ts",
    includeOas31Only: false,
    sampleBuilderName: "buildValueRangePlainProgrammaticSampleCases",
  },
  {
    group: "integer-validations",
    schemaType: "integer",
    title: "JSON Schema Suite/Integer And Validations/Integer Validations Value Range OAS 3.1",
    metaId: "json-schema-suite-integer-validations-value-range-oas-3-1",
    storyFileName: "integer-validations-value-range-oas-3-1.stories.tsx",
    testFileName: "integer-validations-value-range-oas-3-1.it-test.ts",
    includeOas31Only: true,
    sampleBuilderName: "buildValueRangePlainOas31ProgrammaticSampleCases",
  },
  {
    group: "number-validations",
    schemaType: "number",
    title: "JSON Schema Suite/Number And Validations/Number Validations Value Range",
    metaId: "json-schema-suite-number-validations-value-range",
    storyFileName: "number-validations-value-range.stories.tsx",
    testFileName: "number-validations-value-range.it-test.ts",
    includeOas31Only: false,
    sampleBuilderName: "buildValueRangePlainProgrammaticSampleCases",
  },
  {
    group: "number-validations",
    schemaType: "number",
    title: "JSON Schema Suite/Number And Validations/Number Validations Value Range OAS 3.1",
    metaId: "json-schema-suite-number-validations-value-range-oas-3-1",
    storyFileName: "number-validations-value-range-oas-3-1.stories.tsx",
    testFileName: "number-validations-value-range-oas-3-1.it-test.ts",
    includeOas31Only: true,
    sampleBuilderName: "buildValueRangePlainOas31ProgrammaticSampleCases",
  },
];
