# Expect Decorator Module

## Overview

The `expect-decorator` module is a wrapper around Playwright's assertion library that provides a fluent, chainable API for writing expressive test assertions. It enhances test readability and maintainability by providing specialized assertion methods for various UI testing scenarios.

## Core Concepts

### Factory Function

The module uses a factory function pattern to create consistent interfaces for different types of expectations:

- `expect`: For common UI element assertions
- `expectFile`: For file-related assertions
- `expectText`: For text-specific assertions
- `expectApiVersion`: For API version-related assertions
- `expectApiPackage`: For API package-related assertions

### Features

- **Soft Assertions**: All expect functions support soft assertions that don't stop test execution on failure
- **Negated Assertions**: All expect functions support negated assertions via the `.not` property
- **Custom Error Messages**: All expect functions support custom error messages
- **Automatic Step Reporting**: Assertions are automatically reported as test steps with descriptive messages

## API Reference

### Base Class

All expect classes extend the abstract `BaseExpect<T>` class which provides:

- Abstract `not` getter for negated assertions
- Protected `executeExpectation` method for running assertions with proper error handling
- Protected `formatStepMessage` method for generating descriptive assertion messages

### Common Assertions (`expect`)

```typescript
expect(element).toBeVisible(options?)
expect(element).toBeHidden(options?)
expect(element).toBeEnabled(options?)
expect(element).toBeDisabled(options?)
expect(element).toBeEmpty(options?)
expect(element).toHaveText(expected, options?)
expect(element).toContainText(expected, options?)
expect(element).toHaveValue(expected, options?)
expect(element).toHaveCount(expected, options?)
expect(element).toBePressed(options?)
expect(element).toBeFocused(options?)
expect(element).toBeChecked(options?)
expect(element).toHaveClass(expected, options?)
expect(element).toHaveAttribute(name, value, options?)
expect(element).toHaveIcon(expected, options?)
```

### File Assertions (`expectFile`)

Specialized assertions for downloaded test files.

### Text Assertions (`expectText`)

Specialized assertions for text content.

### Version API Assertions (`expectVersion`)

Specialized API assertions for Version objects.

### Package API Assertions (`expectPackage`)

Specialized API assertions for Package objects.

## Options

The module supports various options for fine-tuning assertions:

- `TimeoutOption`: Controls assertion timeout in milliseconds
- `IgnoreCaseOption`: Controls case sensitivity for text comparisons
- `BeVisibleOptions`: Controls visibility check parameters
- `BeEnabledOptions`: Controls enabled check parameters
- `HaveContainTextOptions`: Controls text comparison parameters
- `BeCheckedOptions`: Controls checked state parameters
- `HaveAttributeOptions`: Controls attribute comparison parameters

## Examples

```typescript
// Basic assertion
expect(component).toBeVisible()

// Soft assertion (continues test even if assertion fails)
expect.soft(component).toHaveText('Expected text')

// Negated assertion
expect(component).not.toBeEmpty()

// With custom error message
expect(component, 'Component should be visible').toBeVisible();

// File assertion
expectFile(downloadedFile).toHaveName();

// Text assertion
expectText('Sample text').toContain('Sample');

// API assertions
expectApiVersion(version).toBePublished();
expectApiPackage(package).toBeCreated();
```

## Integration

This module is designed to work with Playwright Test and enhances its assertion capabilities by providing domain-specific assertions with better error reporting and test structure.
