import type { DownloadedTestFile } from '@shared/entities/files'
import type { BaseExpect } from './BaseExpect'
import { CommonExpect, type ExpectInput } from './CommonExpect'
import { ExpectApiPackage, type PackageInput } from './ExpectApiPackage'
import { ExpectApiVersion, type VersionInput } from './ExpectApiVersion'
import { ExpectFile } from './ExpectFile'
import { ExpectText } from './ExpectText'

/**
 * Factory function that creates expect functions with a consistent interface
 *
 * This function creates an expect function that instantiates a specific expect class,
 * and adds a .soft property to it for creating soft assertions.
 *
 * @template T The type of value being asserted on
 * @template R The specific expect class to instantiate
 * @param Constructor The constructor for the expect class
 * @returns An expect function with a .soft property
 */
function createExpectFactory<T, R extends BaseExpect<T>>(
  Constructor: new (actual: T, isNot: boolean, isSoft: boolean, message?: string) => R,
): { (actual: T, message?: string): R; soft: (actual: T, message?: string) => R } {
  return Object.assign(
    (actual: T, message?: string) => new Constructor(actual, false, false, message),
    {
      soft: (actual: T, message?: string) => new Constructor(actual, false, true, message),
    },
  )
}

/**
 * Expect function for common UI element assertions
 *
 * @example
 * expect(component).toBeDisabled()
 * expect(component).toBeVisible()
 * expect.soft(component).toHaveText('Expected text')
 */
export const expect = createExpectFactory<ExpectInput, CommonExpect<ExpectInput>>(CommonExpect)

/**
 * Expect function for file-related assertions
 *
 * @example
 * expectFile(downloadedFile).toHaveName()
 */
export const expectFile = createExpectFactory<DownloadedTestFile, ExpectFile>(ExpectFile)

/**
 * Expect function for text-specific assertions
 *
 * @example
 * expectText('Sample text').toContain('Sample')
 */
export const expectText = createExpectFactory<string, ExpectText>(ExpectText)

/**
 * Expect function for API version-related assertions
 *
 * @example
 * expectApiVersion(version).toBePublished()
 */
export const expectApiVersion = createExpectFactory<VersionInput, ExpectApiVersion>(ExpectApiVersion)

/**
 * Expect function for API package-related assertions
 *
 * @example
 * expectApiPackage(package).toBeCreated()
 */
export const expectApiPackage = createExpectFactory<PackageInput, ExpectApiPackage>(ExpectApiPackage)
