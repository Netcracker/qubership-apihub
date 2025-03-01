/**
 * @module expect-decorator
 *
 * This module provides a fluent, chainable API for writing expressive test assertions.
 * It wraps Playwright's assertion library and enhances it with domain-specific assertions,
 * improved error reporting, and automatic test step reporting.
 *
 * The module exports several expect functions, each specialized for different types of assertions:
 * - expect: For common UI element assertions
 * - expectFile: For file-related assertions
 * - expectText: For text-specific assertions
 * - expectApiVersion: For API version-related assertions
 * - expectApiPackage: For API package-related assertions
 *
 * All expect functions support:
 * - Soft assertions (via .soft) that don't stop test execution on failure
 * - Negated assertions (via .not)
 * - Custom error messages
 */

export * from './expect'
