# qubership-apihub-compatibility-suites

## What is it

It is a collection of most important cases of changes in API for the purposes of changes classification.

Contains cases for OpenAPI and GraphQL

## Structure
The cases path structure is `bin/comparison-base-suite/<apitype>/<case-suite>/<specific-case>`
Each case contains two specifications - `before` and `after`. 

Reflects one specific change (or may contain multiple variations of representing the same change).

## Usages
When installing it as a dependency, it creates a JavaScipt map of cases, which can be accessed using the public `getCompatibilitySuite` method

```JavaScript
export function getCompatibilitySuite(suiteType: TestSpecType, suiteId: string, testId: string): [string, string]
```

This method accepts specification type (`openapi`, `graphql`), suite name and case name

Returns an array of two specifications as a string - [before, after]

When writing tests, it is necessary to follow the structure of the compatibility suite:
- test should be located in a folder separated from all other tests
- tests should be grouped by specification types and suites
- one suite should corresponds to one test-suite
- one case corresponds to one test in a test suite.

It is recommended to have a separate command to run only the compatibility suite tests
```JSON
"scripts": {
  "test:compatibility-suites": "jest --findRelatedTests -- detectOpenHandles test/compatibility-suites/*
}
```