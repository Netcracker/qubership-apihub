# Qubership APIHUB API Visitor

The APIHUB API Visitor is designed for secure and structured processing of Open API specifications using the `Visitor` pattern. It provides type-safe traversal of complex API schemes, including detecting self-references and preventing infinite recursion.

## Features
- **Type-safe traversal:** The module provides mechanisms for safe traversal and transformation of OpenAPI documents with full TypeScript support.
- **Self loops processing:** Detects and marks self loops in schemas using the unique `valueAlreadyVisited` flag, preventing endless recursion.
- **Visitor Pattern:** Uses the visitor pattern to bypass and transform API specification elements, making it easier to analyze API structure.
- **Multiple distribution** formats: Supports CommonJS, ES modules, and integration with TypeScript projects, providing flexibility in use.

## Self loops
The APIHUB API Visitor automatically identifies and marks self-references in schemas using a reliable mechanism for detecting and processing self-reference cycles during schema traversal. The mechanism is designed to prevent infinite recursion when traversing objects that may contain circular references (direct or indirect).

## Usage
```ts
import { OpenApiWalker } from '@netcracker/qubership-apihub-api-visitor'
import { denormalize, normalize } from '@netcracker/qubership-apihub-api-unifier'
import type { DenormalizeOptions, NormalizeOptions } from '@netcracker/qubership-apihub-api-unifier'

const walker = new OpenApiWalker();

const options: NormalizeOptions = {
  resolveRef: true,
  validate: true,
  mergeAllOf: true,
  unify: true,
  liftCombiners: false,
  allowNotValidSyntheticChanges: true,
  originsAlreadyDefined: false,
  /* Add additional options if necessary */
}
const invertOptions: DenormalizeOptions = {
  ...options,
  originsAlreadyDefined: true,
  /* Add additional options if necessary */
}

/* 
* Normalized OpenAPI document - a Dereferenced and Bundled version of OpenAPI spec, where all $ref references are resolved.
* 
* 'normalize' - process resolves refs, merges allOf-s, sets default values according to specification, 
* unwrap system "anyOf" (type "any") and so on. Some of the stages are revertable, some not. 
* As a result we get completely "normalized" OpenAPI specification 
* which has transparent structure and can be easily matched with another normalized OpenAPI specification. 
* 
* 'denormalize - revertable things will be reverted (e.g. defaults, unified system anyOf-s), but resolved refs and merge allOf-s will be saved. 
* So it results to original specification with resolved refs and merged allOf-s.'
*/
const normalizedOpenApiDocument = denormalize(normalize(operationData, options), invertOptions)

walker.walkPathsOnNormalizedSource(normalizedOpenApiDocument, {
  // Handlers
  responseStart: ({ responseCode }) => {
    /* Do something */
    return true
  },
  responseEnd: () => {
    /* Do something */
  },
  mediaTypeStart: ({ mediaType }) => {
    /* Do something */
    return true
  },
  mediaTypeEnd: () => {
    /* Do something */
  },
  // Add other handlers as needed

}, { /* Options */ })
```


## Contributing
Please run the unit tests before submitting your PR: `npm test`. Hopefully your PR includes additional unit tests to illustrate your change/modification!
