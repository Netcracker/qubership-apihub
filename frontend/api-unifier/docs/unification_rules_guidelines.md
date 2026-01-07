# Unification Rules Guidelines

## Overview

Unification rules (`unify`) are functions that transform specification objects after merging to normalize them according to specification defaults, replacements, and business logic. They are a key part of the normalization pipeline in the api-unifier system.

## How Unification Works

### Execution Model

1. **Trigger**: Unify functions are called during the `syncClone` traversal after merge operations
2. **Execution Order**: Multiple unify functions can be specified in an array and are executed sequentially
3. **Context**: Each unify function receives:
   - `value`: The current object/value being processed
   - `context`: Contains `origins`, `options`, `path`, and `parentValue`
4. **Return Value**: Transformed value (immutable - should return new object if changed)

### UnifyFunction Interface

```typescript
type TransformFunction = (value: unknown, context: UnifyContext) => unknown
type MutationFunction = (value: unknown, context: UnifyContext) => void

type UnifyFunction =
  | TransformFunction  // Simple forward-only transformation
  | {
      forward: TransformFunction    // Applied during unification
      backward: MutationFunction    // Applied during de-unification (reverses changes)
    }
```

### Rule Declaration

Unify functions are declared in the `unify` property of `NormalizationRule`:

```typescript
interface NormalizationRule {
  unify?: UnifyFunction[] | UnifyFunction
  mandatoryUnify?: UnifyFunction[] | UnifyFunction
  // ... other properties
}
```

## Analysis of OpenAPI Rules

### Common Patterns in OpenAPI

#### 1. **Default Value Application**
Used extensively for optional properties with specification-defined defaults:

```typescript
const OPEN_API_OPERATION_DEFAULTS: DefaultValueMapping = {
  [OPEN_API_PROPERTY_PARAMETERS]: EMPTY_MARKER,
  [OPEN_API_PROPERTY_TAGS]: EMPTY_MARKER,
  [OPEN_API_PROPERTY_DEPRECATED]: false,
}

// Applied in rules:
unify: [
  valueDefaults(OPEN_API_OPERATION_DEFAULTS),
  valueReplaces(OPEN_API_OPERATION_REPLACES),
]
```

#### 2. **Value Replacement**
Used to replace sentinel values or primitives with complex objects:

```typescript
const OPEN_API_OPERATION_REPLACES: Record<string, ReplaceMapping> = {
  [OPEN_API_PROPERTY_PARAMETERS]: TO_EMPTY_ARRAY_MAPPING,
  [OPEN_API_PROPERTY_TAGS]: TO_EMPTY_ARRAY_MAPPING,
}
```

#### 3. **Contextual Defaults**
Dynamic defaults based on parent or current object state:

```typescript
const getOperationParameterStyleDefault = (parameter: Record<string, any>): string | undefined => {
  const inValue = parameter.in
  switch (inValue) {
    case 'query':
    case 'cookie':
      return 'form'
    case 'path':
    case 'header':
      return 'simple'
  }
}

const OPEN_API_PARAMETER_DEFAULTS: DefaultValueMapping = {
  [OPEN_API_PROPERTY_STYLE]: getOperationParameterStyleDefault,
  // ...
}
```

#### 4. **Combining Base Defaults**
Reusing and extending default mappings:

```typescript
const OPEN_API_30_JSON_SCHEMA_DEFAULTS: DefaultValueMapping = {
  ...JSON_SCHEMA_DEFAULTS[SPEC_TYPE_JSON_SCHEMA_04],
  [JSON_SCHEMA_PROPERTY_NULLABLE]: false,
  [JSON_SCHEMA_PROPERTY_READ_ONLY]: false,
  // ...
}
// Then remove unsupported properties:
delete OPEN_API_30_JSON_SCHEMA_DEFAULTS[JSON_SCHEMA_PROPERTY_PATTERN_PROPERTIES]
```

#### 5. **Replacing in Composed Rules**
Using `insertIntoArrayByInstruction` and `replaceValue` to modify inherited unify arrays:

```typescript
unify: insertIntoArrayByInstruction(
  concatArrays<UnifyFunction>(core.unify, extension.unify),
  replaceValue(JSON_SCHEMA_DEFAULTS_UNIFY_FUNCTION[baseJsonSchemaVersion],
               valueDefaults(OPEN_API_30_JSON_SCHEMA_DEFAULTS)),
  replaceValue(JSON_SCHEMA_REPLACES_UNIFY_FUNCTION[baseJsonSchemaVersion],
               valueReplaces(OPEN_API_30_JSON_SCHEMA_REPLACES)),
  replaceValue(jsonSchemaTypeInfer,
               jsonSchemaTypeInferWithRestriction(OPEN_API_30_JSON_SCHEMA_NODE_TYPES)),
)
```

## Analysis of JSON Schema Rules

### Common Patterns in JSON Schema

#### 1. **Standard Default Application**
Core defaults for JSON Schema properties:

```typescript
const JSON_SCHEMA_DEFAULTS_COMMON: DefaultValueMapping = {
  [JSON_SCHEMA_PROPERTY_ADDITIONAL_PROPERTIES]: true,
  [JSON_SCHEMA_PROPERTY_MIN_LENGTH]: 0,
  [JSON_SCHEMA_PROPERTY_MIN_PROPERTIES]: 0,
  [JSON_SCHEMA_PROPERTY_MIN_ITEMS]: 0,
  [JSON_SCHEMA_PROPERTY_UNIQUE_ITEMS]: false,
  [JSON_SCHEMA_PROPERTY_REQUIRED]: EMPTY_MARKER,
  [JSON_SCHEMA_PROPERTY_PROPERTIES]: EMPTY_MARKER,
  [JSON_SCHEMA_PROPERTY_PATTERN_PROPERTIES]: EMPTY_MARKER,
}
```

#### 2. **Complex Value Replacement**
Replacing boolean/primitive values with schema objects:

```typescript
[JSON_SCHEMA_PROPERTY_ADDITIONAL_PROPERTIES]: {
  mapping: new Map([
    [true, {
      value: (origins, opts) => opts.syntheticMetaDefinitions.emptyJsonSchema(origins),
      reverseMatcher: deepEqualsWithEmptySchema,
    }],
    [false, {
      value: (origins, opts) => opts.syntheticMetaDefinitions.invertedEmptyJsonSchema(origins),
      reverseMatcher: deepEqualsWithInvertedEmptySchema,
    }],
  ]),
}
```

#### 3. **Comprehensive Unify Pipeline**
JSON Schema uses a complete pipeline of transformations:

```typescript
unify: [
  extractEmptyJsonSchema,              // Detect and mark empty schemas
  jsonSchemaTypeInfer,                 // Infer type from constraints
  JSON_SCHEMA_DEFAULTS_UNIFY_FUNCTION[version],  // Apply defaults
  JSON_SCHEMA_REPLACES_UNIFY_FUNCTION[version],  // Replace sentinel values
  splitJsonSchemaTypeArray,            // Normalize type arrays
  cleanJsonSchemaTypeSpecificProperties,  // Remove invalid properties for type
  unifyJsonSchemaRequired,             // Deduplicate required array
  cleanUpSyntheticJsonSchemaTypes,     // Clean synthetic metadata
]
```

#### 4. **Version-Specific Rules**
Different defaults for different schema versions:

```typescript
export const JSON_SCHEMA_DEFAULTS: Record<JsonSchemaSpecVersion, DefaultValueMapping> = {
  [SPEC_TYPE_JSON_SCHEMA_04]: {
    ...JSON_SCHEMA_DEFAULTS_COMMON,
    [JSON_SCHEMA_PROPERTY_EXCLUSIVE_MINIMUM]: false,
    [JSON_SCHEMA_PROPERTY_EXCLUSIVE_MAXIMUM]: false,
  },
  [SPEC_TYPE_JSON_SCHEMA_07]: {
    ...JSON_SCHEMA_DEFAULTS_COMMON,
    [JSON_SCHEMA_PROPERTY_READ_ONLY]: false,
    [JSON_SCHEMA_PROPERTY_WRITE_ONLY]: false,
    [JSON_SCHEMA_PROPERTY_DEPRECATED]: false,
  },
}
```

## Common Unify Function Patterns

### Pattern 1: Simple Transform
Direct transformation without backward operation:

```typescript
export const unifyJsonSchemaEnums: UnifyFunction = (jso, ctx) => {
  if (!isArray(jso)) {
    return jso
  }
  return removeDuplicatesWithMergeOrigins(jso, ctx.options.originsFlag, deepEqual)
}
```

**When to use**:
- One-way transformations that don't need reversal
- Data cleanup and normalization
- Deduplication

### Pattern 2: Reversible Transform (Forward/Backward)
Transformation that can be undone for de-unification:

```typescript
export const valueDefaults: (map: DefaultValueMapping) => UnifyFunction = (map) => {
  return {
    forward: (jso, ctx) => {
      // Add default values
      // ...
      return modifiedJso
    },
    backward: (jso, ctx) => {
      // Remove default values (mutating)
      // ...
    },
  }
}
```

**When to use**:
- Changes that should be reversed when de-unifying
- Adding/removing synthetic properties
- Value replacements that need to be undone

### Pattern 3: Guard Pattern
Always start with type and state checks:

```typescript
export const myUnifyFunction: UnifyFunction = (jso, ctx) => {
  // 1. Type guards
  if (!isObject(jso) || isArray(jso)) {
    return jso
  }

  // 2. State guards
  if (isPureCombiner(jso)) {
    return jso
  }

  if (isBroken(jso)) {
    return jso
  }

  // 3. Condition guards
  if (!(REQUIRED_PROPERTY in jso)) {
    return jso
  }

  // 4. Actual transformation
  // ...
}
```

**Why**: Prevents errors and unnecessary processing

### Pattern 4: Lazy Shallow Copy
Only copy when modifications are needed:

```typescript
let shallowJso: typeof jso = PLACE_HOLDER_JSO

// Later, when first modification needed:
if (needsModification) {
  if (shallowJso === PLACE_HOLDER_JSO) {
    shallowJso = { ...jso }
  }
  shallowJso[propertyKey] = newValue
}

// At the end:
if (shallowJso === PLACE_HOLDER_JSO) {
  return jso  // No changes made
}
return shallowJso
```

**Why**: Performance optimization - avoid copying when not needed

### Pattern 5: Custom Business Logic
Complex domain-specific transformations:

```typescript
export const pathItemsUnification: UnifyFunction = (value, { options }) => {
  if (!isObject(value)) { return value }

  const pathItem: PathItemObject = value
  const { parameters, servers, summary, description, ...restItems } = pathItem

  // Spread path-level properties to operations
  const newPathItem = OPEN_API_HTTP_METHODS.reduce((result, method) => {
    const operation = pathItem[method]
    if (!operation) {
      return result
    }

    // Merge path-level parameters into operation
    addUniqueElements(pathItem, operation, 'parameters', options.originsFlag, getParameterUniqueKey)
    // ... more business logic

    return result
  }, {})

  return newPathItem
}
```

**When to use**: Specification-specific transformations that don't fit standard patterns

## Guidelines for Writing Unification Rules

### 1. **Structure and Organization**

#### Define Constants at Module Level
```typescript
// Good: Reusable constants
const EMPTY_MARKER = Symbol('empty-items')

const COMPONENT_DEFAULTS: DefaultValueMapping = {
  [PROPERTY_SCHEMAS]: EMPTY_MARKER,
  [PROPERTY_RESPONSES]: EMPTY_MARKER,
}

const COMPONENT_REPLACES: Record<string, ReplaceMapping> = {
  [PROPERTY_SCHEMAS]: TO_EMPTY_OBJECT_MAPPING,
  [PROPERTY_RESPONSES]: TO_EMPTY_OBJECT_MAPPING,
}
```

#### Group Related Rules
```typescript
// Good: Related defaults and replaces together
const OPERATION_DEFAULTS: DefaultValueMapping = { /* ... */ }
const OPERATION_REPLACES: Record<string, ReplaceMapping> = { /* ... */ }

// Applied together:
unify: [
  valueDefaults(OPERATION_DEFAULTS),
  valueReplaces(OPERATION_REPLACES),
]
```

### 2. **Naming Conventions**

```typescript
// Defaults mappings:
const <CONTEXT>_DEFAULTS: DefaultValueMapping = { /* ... */ }

// Replace mappings:
const <CONTEXT>_REPLACES: Record<string, ReplaceMapping> = { /* ... */ }

// Custom unify functions:
const <purpose><Entity>: UnifyFunction = (jso, ctx) => { /* ... */ }
// Examples: unifyJsonSchemaRequired, deduplicateParameters, pathItemsUnification
```

### 3. **Safety and Validation**

#### Always Use Guard Pattern
```typescript
// Required guards in order:
export const myUnify: UnifyFunction = (jso, ctx) => {
  // 1. Type check
  if (!isObject(jso) || isArray(jso)) {
    return jso
  }

  // 2. State checks
  if (isPureCombiner(jso)) {
    return jso
  }
  if (isBroken(jso)) {
    return jso
  }

  // 3. Business condition checks
  if (!hasRequiredProperties(jso)) {
    return jso
  }

  // 4. Transform
  // ...
}
```

#### Preserve Immutability
```typescript
// Bad: Direct mutation
jso.newProperty = value
return jso

// Good: Shallow copy
return {
  ...jso,
  newProperty: value,
}

// Best: Lazy shallow copy
let result: typeof jso = PLACE_HOLDER_JSO
if (needsChange) {
  if (result === PLACE_HOLDER_JSO) {
    result = { ...jso }
  }
  result.newProperty = value
}
return result === PLACE_HOLDER_JSO ? jso : result
```

### 4. **Origins Handling**

Unify functions must properly handle origins metadata for change tracking:

```typescript
// When adding synthetic properties:
if (options.originsFlag) {
  const newOrigins = {
    ...resolveOriginsMetaRecord(shallowJso, options.originsFlag),
    [propertyKey]: options.createOriginsForDefaults(origins),
  }
  setJsoProperty(shallowJso, options.originsFlag, newOrigins)
}

// When removing properties:
cleanSeveralOrigins(jso, [removedKey1, removedKey2], options.originsFlag)

// For array modifications:
setOriginsForArray(newArray, options.originsFlag, itemOrigins)
```

### 5. **Performance Considerations**

#### Use Lazy Evaluation
```typescript
// Don't create unless needed
let shallowCopy = PLACE_HOLDER_JSO

// Only copy when first modification is needed
if (needsChange && shallowCopy === PLACE_HOLDER_JSO) {
  shallowCopy = { ...jso }
}
```

#### Cache Expensive Operations
```typescript
// Bad: Multiple lookups
if (options.originsFlag && jso[options.originsFlag]) {
  const origins = jso[options.originsFlag]
  // ...
}

// Good: Single lookup
const originsFlag = options.originsFlag
if (originsFlag) {
  const origins = jso[originsFlag]
  // ...
}
```

#### Early Return
```typescript
// Good: Exit early when no work needed
if (!pathParameters && !pathServers && !pathSummary) {
  return value  // No changes needed
}

// Continue with expensive transformation...
```

### 6. **Composition Patterns**

#### Reuse Existing Unify Functions
```typescript
// Don't reimplement - compose!
const HEADER_DEFAULTS = {
  ...PARAMETER_DEFAULTS,  // Reuse existing defaults
  // Add header-specific defaults
}

const HEADER_REPLACES = {
  ...PARAMETER_REPLACES,  // Reuse existing replaces
  // Add header-specific replaces
}
```

#### Build Unify Arrays
```typescript
// Simple array
unify: [
  valueDefaults(MY_DEFAULTS),
  valueReplaces(MY_REPLACES),
]

// Complex composition
unify: insertIntoArrayByInstruction(
  concatArrays<UnifyFunction>(baseUnify, extensionUnify),
  replaceValue(oldUnify, newUnify),
)
```

### 7. **Error Handling**

```typescript
// Report errors through context
export const deduplicateParameters: UnifyFunction = (jso, ctx) => {
  const duplicate = findDuplicate(jso)
  if (duplicate) {
    const message = ErrorMessage.duplicateParameter(duplicate.name, duplicate.in)
    ctx.options.onUnifyError?.(message, ctx.path, jso, new Error(message))
  }
  // Continue with transformation
}
```

### 8. **Documentation**

```typescript
/**
 * Unifies path item by spreading path-level properties to operations.
 *
 * Handles:
 * - Merging path-level parameters into operation parameters
 * - Spreading servers array to operations
 * - Copying summary/description if not present in operation
 *
 * @param value - PathItem object
 * @param context - Unify context with options and metadata
 * @returns Transformed PathItem with properties spread to operations
 */
export const pathItemsUnification: UnifyFunction = (value, { options }) => {
  // ...
}
```

## ValueDefaults Pattern Deep Dive

### Purpose
Applies default values according to specification rules. Properties with default values can be:
1. **Missing** → Added with default value (marked as SYNTHETIC)
2. **Present with default value** → Marked as PURE (can be removed during de-unification)
3. **Present with non-default value** → Left unchanged

### Structure

```typescript
type DefaultValueMapping = Record<string, JsonPrimitiveValue | DefaultValueFunction>

type DefaultValueFunction = (
  jso: Record<string, any>,
  ctx: UnifyContext<InternalUnifyOptions>
) => JsonPrimitiveValue | undefined
```

### Static Defaults

```typescript
const MY_DEFAULTS: DefaultValueMapping = {
  deprecated: false,         // boolean default
  minLength: 0,              // numeric default
  required: EMPTY_MARKER,    // marker for later replacement
}
```

**Key Points**:
- Use primitive values for simple defaults
- Use `EMPTY_MARKER` symbol when the default needs later replacement to complex object
- Undefined values are skipped

### Dynamic Defaults (Contextual)

When default depends on object state or parent context:

```typescript
const getStyleDefault = (jso: Record<string, any>): string | undefined => {
  const inValue = jso.in
  switch (inValue) {
    case 'query': return 'form'
    case 'path': return 'simple'
    default: return undefined  // No default for other cases
  }
}

const PARAMETER_DEFAULTS: DefaultValueMapping = {
  style: getStyleDefault,  // Dynamic based on 'in' property
}
```

**Key Points**:
- Function receives current object and context
- Return `undefined` when no default should apply
- Can access `ctx.parentValue` for parent-based defaults

### Example: Parent-Aware Default

```typescript
const getXmlWrappedDefault = (
  jso: Record<string, any>,
  ctx: UnifyContext<InternalUnifyOptions>
): JsonPrimitiveValue | undefined => {
  // Default is false only when parent is array type
  if (ctx.parentValue &&
      typeof ctx.parentValue === 'object' &&
      'type' in ctx.parentValue &&
      ctx.parentValue.type === 'array') {
    return false
  }
  return undefined  // No default in other contexts
}
```

### Metadata Tracking

`valueDefaults` tracks which properties are defaults:

```typescript
// Stored in object if defaultsFlag is set:
{
  propertyName: "value",
  [defaultsFlag]: {
    propertyName: DEFAULT_TYPE_FLAG_PURE  // or DEFAULT_TYPE_FLAG_SYNTHETIC
  }
}
```

- `DEFAULT_TYPE_FLAG_SYNTHETIC`: Property was added (didn't exist)
- `DEFAULT_TYPE_FLAG_PURE`: Property existed with default value

### De-unification (Backward)

The backward operation removes properties that match their default values:

```typescript
backward: (jso, ctx) => {
  // Clean up metadata
  if (options.defaultsFlag) {
    delete jso[options.defaultsFlag]
  }

  // Remove properties matching defaults
  const candidates = Object.entries(map)
    .filter(([key]) => key in jso)
    .filter(([key]) => jso[key] === resolveDefaultValue(map[key], jso, ctx))
    .filter(({ key, value }) => !options.skip?.(value, [...path, key]))

  candidates.forEach(({ key }) => delete jso[key])
  cleanSeveralOrigins(jso, candidates.map(c => c.key), options.originsFlag)
}
```

### Best Practices

#### 1. Group Related Defaults
```typescript
// Good
const PARAMETER_DEFAULTS: DefaultValueMapping = {
  deprecated: false,
  required: false,
  allowEmptyValue: false,
  allowReserved: false,
  style: getOperationParameterStyleDefault,
}
```

#### 2. Use Type-Safe Constants
```typescript
// Good: Use property name constants
const DEFAULTS = {
  [PROPERTY_DEPRECATED]: false,
  [PROPERTY_REQUIRED]: false,
}

// Avoid: Magic strings
const DEFAULTS = {
  'deprecated': false,
  'required': false,
}
```

#### 3. Return Undefined for Conditional Defaults
```typescript
// Good: Clear when default doesn't apply
const getDefault = (jso: Record<string, any>): string | undefined => {
  if (condition) {
    return 'default-value'
  }
  return undefined  // Explicit: no default
}

// Bad: Returning null or empty string
const getDefault = (jso: Record<string, any>): string => {
  if (condition) {
    return 'default-value'
  }
  return ''  // Ambiguous
}
```

#### 4. Extend Base Defaults
```typescript
// Good: Reuse and extend
const BASE_DEFAULTS = {
  deprecated: false,
  required: false,
}

const EXTENDED_DEFAULTS = {
  ...BASE_DEFAULTS,
  style: 'form',  // Add specific defaults
}
```

## ValueReplaces Pattern Deep Dive

### Purpose
Replaces specific values (usually primitives or markers) with more complex objects. Common uses:
1. Replace marker symbols with actual empty arrays/objects
2. Replace boolean values with schema objects
3. Replace sentinel values with generated structures

### Structure

```typescript
interface ReplaceMapping {
  readonly mapping?: Map<JsonPrimitiveValue, Replace>
}

interface Replace {
  readonly value: ReplaceFunction
  readonly reverseMatcher: ReverseMatcherFunction
}

type ReplaceFunction = (
  origins: OriginLeafs | undefined,
  opts: InternalUnifyOptions
) => unknown

type ReverseMatcherFunction = (
  value: unknown,
  extraIgnoreProperties: Set<PropertyKey>,
  opts: InternalUnifyOptions
) => boolean
```

### Simple Replacements

#### Empty Object Replacement
```typescript
const EMPTY_MARKER = Symbol('empty-items')

const TO_EMPTY_OBJECT_MAPPING: ReplaceMapping = {
  mapping: new Map([[EMPTY_MARKER, {
    value: () => ({}),
    reverseMatcher: deepEqualsMatcher({}),
  }]]),
}

const MY_REPLACES = {
  [PROPERTY_HEADERS]: TO_EMPTY_OBJECT_MAPPING,
  [PROPERTY_SCHEMAS]: TO_EMPTY_OBJECT_MAPPING,
}
```

**Usage Pattern**:
1. Default sets property to `EMPTY_MARKER`
2. Replace converts `EMPTY_MARKER` → `{}`
3. Backward converts `{}` → `EMPTY_MARKER` (then default removes it)

#### Empty Array Replacement
```typescript
const TO_EMPTY_ARRAY_MAPPING: ReplaceMapping = {
  mapping: new Map([[EMPTY_MARKER, {
    value: () => ([]),
    reverseMatcher: deepEqualsMatcher([]),
  }]]),
}

const OPERATION_REPLACES = {
  [PROPERTY_PARAMETERS]: TO_EMPTY_ARRAY_MAPPING,
  [PROPERTY_TAGS]: TO_EMPTY_ARRAY_MAPPING,
}
```

### Complex Replacements

#### Schema Object Replacements
```typescript
const ADDITIONAL_PROPERTIES_REPLACES: ReplaceMapping = {
  mapping: new Map([
    // true → empty (allowing all) schema
    [true, {
      value: (origins, opts) =>
        opts.syntheticMetaDefinitions.emptyJsonSchema(origins),
      reverseMatcher: deepEqualsWithEmptySchema,
    }],
    // false → inverted empty (denying all) schema
    [false, {
      value: (origins, opts) =>
        opts.syntheticMetaDefinitions.invertedEmptyJsonSchema(origins),
      reverseMatcher: deepEqualsWithInvertedEmptySchema,
    }],
  ]),
}
```

**Key Points**:
- Can create synthetic metadata objects
- Preserves origins for change tracking
- Uses custom matchers for deep equality

### Reverse Matchers

Reverse matchers determine if a value should be replaced back during de-unification:

#### Simple Matcher
```typescript
// Uses deep equality
export const deepEqualsMatcher: (one: unknown) => ReverseMatcherFunction =
  (one) => (another) => deepEqual(one, another)
```

#### Complex Matcher
```typescript
// Matches empty schemas considering synthetic properties
export const deepEqualsWithEmptySchema: ReverseMatcherFunction =
  (value, extraIgnoreProperties, opts) => {
    const syntheticAny = {
      ...opts.syntheticMetaDefinitions.emptyJsonSchema(IGNORED_IN_FUTURE_ORIGINS)
    }
    const nativeAny = {
      ...opts.nativeMetaDefinitions.emptyJsonSchema(IGNORED_IN_FUTURE_ORIGINS)
    }

    // Remove properties to ignore
    extraIgnoreProperties.forEach(key => {
      delete syntheticAny[key]
      delete nativeAny[key]
    })

    const compareConfig: CompareMeta = {
      cache: createEvaluationCacheService(),
      ignoreProperties: {
        ...syntheticAny,
        ...nativeAny,
        ...[...extraIgnoreProperties].reduce((collector, prop) => {
          collector[prop] = ANY_VALUE
          return collector
        }, {} as Record<PropertyKey, unknown>),
      },
    }

    return deepCircularEqualsWithPropertyFilter(value, {}, compareConfig)
  }
```

### Forward Operation

The forward operation replaces matching values:

```typescript
forward: (jso, { options }) => {
  if (!isObject(jso) || isArray(jso)) {
    return jso
  }
  if (isPureCombiner(jso) || isBroken(jso)) {
    return jso
  }

  let shallowJso: typeof jso = PLACE_HOLDER_JSO

  Object.entries(map).forEach(([propertyKey, replaceMapping]) => {
    if (propertyKey in jso) {
      const value = jso[propertyKey]
      const replace = replaceMapping.mapping?.get(value)

      if (replace) {
        if (shallowJso === PLACE_HOLDER_JSO) {
          shallowJso = { ...jso }
        }
        shallowJso[propertyKey] = replace.value(
          resolveOrigins(shallowJso, propertyKey, options.originsFlag),
          options
        )
      }
    }
  })

  return shallowJso === PLACE_HOLDER_JSO ? jso : shallowJso
}
```

### Backward Operation

The backward operation reverses replacements:

```typescript
backward: (jso, { path, options }) => {
  if (!isObject(jso) || isArray(jso) || isBroken(jso)) {
    return
  }

  const candidates = Object.entries(map)
    .filter(([key]) => key in jso)
    .filter(({ key, value }) =>
      !options.skip || !options.skip(value, [...path, key]))

  const ignorePropertyKeys = new Set([
    ...Object.keys(map),
    ...options.ignoreSymbols,
  ])

  candidates.forEach(({ key: propertyKey, value, f }) => {
    const mapping = f.mapping ?? new Map()

    for (const [replaceMappingValue, possibleValue] of mapping.entries()) {
      if (possibleValue.reverseMatcher(value, ignorePropertyKeys, options)) {
        jso[propertyKey] = replaceMappingValue  // Mutate back
        break
      }
    }
  })
}
```

### Typical Workflow

#### Default + Replace Pattern
Most common workflow combines defaults and replaces:

```typescript
// 1. Define marker
const EMPTY_MARKER = Symbol('empty-items')

// 2. Define default mapping
const MY_DEFAULTS: DefaultValueMapping = {
  [PROPERTY_HEADERS]: EMPTY_MARKER,  // Step 1: Set marker if missing
}

// 3. Define replace mapping
const MY_REPLACES: Record<string, ReplaceMapping> = {
  [PROPERTY_HEADERS]: {  // Step 2: Replace marker with actual value
    mapping: new Map([[EMPTY_MARKER, {
      value: () => ({}),
      reverseMatcher: deepEqualsMatcher({}),
    }]]),
  },
}

// 4. Apply in sequence
unify: [
  valueDefaults(MY_DEFAULTS),    // First: Add markers
  valueReplaces(MY_REPLACES),    // Second: Replace markers
]
```

**Why this pattern?**
1. Defaults work with primitives/symbols (fast comparison)
2. Replaces handle complex object creation
3. Clean separation of concerns
4. Reversible for de-unification

### Best Practices

#### 1. Use Symbols for Markers
```typescript
// Good: Symbol - unique and clear intent
const EMPTY_MARKER = Symbol('empty-items')

// Bad: Magic value - could conflict
const EMPTY_MARKER = '__EMPTY__'
```

#### 2. Reuse Common Mappings
```typescript
// Define once
const TO_EMPTY_OBJECT_MAPPING: ReplaceMapping = { /* ... */ }
const TO_EMPTY_ARRAY_MAPPING: ReplaceMapping = { /* ... */ }

// Reuse everywhere
const REPLACES_A = {
  [PROP_1]: TO_EMPTY_OBJECT_MAPPING,
  [PROP_2]: TO_EMPTY_OBJECT_MAPPING,
}

const REPLACES_B = {
  [PROP_3]: TO_EMPTY_ARRAY_MAPPING,
}
```

#### 3. Match Replacement Complexity to Need
```typescript
// Simple case: Static value
value: () => ({})

// Complex case: Generate with metadata
value: (origins, opts) =>
  opts.syntheticMetaDefinitions.emptyJsonSchema(origins)
```

#### 4. Pair Forward and Backward
```typescript
// Always provide matching reverse matcher
{
  value: () => ([]),                    // Forward
  reverseMatcher: deepEqualsMatcher([]) // Backward
}
```

#### 5. Test Reversibility
```typescript
// Ensure round-trip works
const original = { prop: EMPTY_MARKER }
const unified = unify(original)         // EMPTY_MARKER → []
const restored = deUnify(unified)       // [] → EMPTY_MARKER (then removed)
// restored should equal original (minus defaults)
```

## Common Pitfalls and Solutions

### Pitfall 1: Mutating Input
```typescript
// Bad: Mutates input
const badUnify: UnifyFunction = (jso) => {
  jso.newProp = 'value'
  return jso
}

// Good: Returns new object
const goodUnify: UnifyFunction = (jso) => {
  return {
    ...jso,
    newProp: 'value',
  }
}
```

### Pitfall 2: Forgetting Guards
```typescript
// Bad: Will crash on non-objects
const badUnify: UnifyFunction = (jso) => {
  return { ...jso, newProp: 'value' }
}

// Good: Guards against invalid input
const goodUnify: UnifyFunction = (jso) => {
  if (!isObject(jso) || isArray(jso)) {
    return jso
  }
  return { ...jso, newProp: 'value' }
}
```

### Pitfall 3: Ignoring Origins
```typescript
// Bad: Origins metadata lost
const badUnify: UnifyFunction = (jso) => {
  return { ...jso, newProp: 'value' }
}

// Good: Preserves and updates origins
const goodUnify: UnifyFunction = (jso, ctx) => {
  const result = { ...jso, newProp: 'value' }
  if (ctx.options.originsFlag) {
    const origins = {
      ...resolveOriginsMetaRecord(result, ctx.options.originsFlag),
      newProp: ctx.options.createOriginsForDefaults(ctx.origins),
    }
    setJsoProperty(result, ctx.options.originsFlag, origins)
  }
  return result
}
```

### Pitfall 4: Inefficient Copying
```typescript
// Bad: Always copies even when no changes
const badUnify: UnifyFunction = (jso) => {
  const result = { ...jso }
  if (shouldModify(jso)) {
    result.prop = 'value'
  }
  return result
}

// Good: Lazy copy
const goodUnify: UnifyFunction = (jso) => {
  if (!shouldModify(jso)) {
    return jso
  }
  return { ...jso, prop: 'value' }
}
```

### Pitfall 5: Not Handling Dynamic Defaults
```typescript
// Bad: Static default doesn't account for context
const DEFAULTS = {
  style: 'form',  // Wrong for path parameters
}

// Good: Dynamic based on context
const DEFAULTS = {
  style: (jso) => {
    return jso.in === 'path' ? 'simple' : 'form'
  },
}
```

## Summary Checklist

When writing unification rules:

- [ ] Start with guard pattern (type, state, condition checks)
- [ ] Use lazy shallow copy pattern for performance
- [ ] Return new object (immutability) or original if unchanged
- [ ] Properly handle origins metadata
- [ ] Provide backward operation if changes should be reversible
- [ ] Use constants for property names
- [ ] Group related defaults and replaces
- [ ] Reuse common patterns (TO_EMPTY_OBJECT_MAPPING, etc.)
- [ ] Use symbols for sentinel values
- [ ] Test with guard clause edge cases
- [ ] Test reversibility (unify + deUnify)
- [ ] Document complex business logic
- [ ] Consider performance (early return, caching)
- [ ] Use error reporting via context when appropriate

## Reference Examples

### Complete Example: New Component Type

```typescript
// 1. Define constants
const EMPTY_MARKER = Symbol('empty-items')

// 2. Define defaults
const MY_COMPONENT_DEFAULTS: DefaultValueMapping = {
  [PROPERTY_DEPRECATED]: false,
  [PROPERTY_REQUIRED]: false,
  [PROPERTY_ITEMS]: EMPTY_MARKER,
}

// 3. Define replaces
const MY_COMPONENT_REPLACES: Record<string, ReplaceMapping> = {
  [PROPERTY_ITEMS]: {
    mapping: new Map([[EMPTY_MARKER, {
      value: () => ([]),
      reverseMatcher: deepEqualsMatcher([]),
    }]]),
  },
}

// 4. Define custom unify if needed
const myComponentNormalization: UnifyFunction = (jso, ctx) => {
  if (!isObject(jso) || isArray(jso)) {
    return jso
  }
  if (isPureCombiner(jso) || isBroken(jso)) {
    return jso
  }

  // Custom logic here

  return jso
}

// 5. Apply in rules
const myComponentRules: NormalizationRules = {
  '/myComponent': {
    '/property': { validate: checkType(TYPE_STRING) },
    unify: [
      valueDefaults(MY_COMPONENT_DEFAULTS),
      valueReplaces(MY_COMPONENT_REPLACES),
      myComponentNormalization,
    ],
    validate: checkType(TYPE_OBJECT),
  },
}
```

This guideline should serve as a comprehensive reference for writing and understanding unification rules in the api-unifier system.

