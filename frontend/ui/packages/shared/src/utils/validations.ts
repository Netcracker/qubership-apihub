import { type FileExtension, getFileExtension, createFileFormatEnumeration } from './files'

const RESTRICTED_ALIAS_SYMBOLS = ['.', ' ', '/', '#', '&']

export const ALIAS_VALIDATION_RULES: Record<string, (alias: string) => boolean | string> = {
  limit: alias => alias.length <= 10 || 'Max number of characters is 10',
  restrictedSymbols: alias => !RESTRICTED_ALIAS_SYMBOLS.find(char => alias.includes(char)) || `Next symbols are restricted — "${RESTRICTED_ALIAS_SYMBOLS}"`,
}

const RESTRICTED_FILENAME_SYMBOLS = ['\\', '/', ':', '*', '?', '"', '<', '>', '|']

export const FILENAME_VALIDATION_RULES: Record<string, (alias: string) => boolean | string> = {
  limit: filename => filename.length <= 256 || 'Max number of characters is 256',
  restrictedSymbols: filename => !RESTRICTED_FILENAME_SYMBOLS.find(char => filename.includes(char)) || `Next symbols are restricted — "${RESTRICTED_FILENAME_SYMBOLS}"`,
}

export const RESTRICTED_VERSION_SYMBOLS = ['\\', '/', ':', '*', '?', '"', '<', '>', '|', '#', '&', '^', '@', '!', '$', '%', '(', ')', '+', '=']

export function checkReleaseVersionFormat(version: string, versionPattern: string): boolean | string {
  const regexp = new RegExp(versionPattern)

  return regexp.test(version) || `Release version must match the following regular expression: ${versionPattern}`
}

export function checkVersionRestrictedSymbols(version: string): boolean | string {
  return !RESTRICTED_VERSION_SYMBOLS.find(char => version.includes(char)) || 'Only \'A-Za-z0-9_.~-\' characters are allowed'
}

export function checkVersionNotEqualToPrevious(version: string, previousVersion: string): boolean | string {
  return version !== previousVersion || 'The version must not be the same as the previous one'
}

export function checkFileType(file: File, acceptableExtensions: FileExtension[]): boolean | string {
  const isWrongFileType = !acceptableExtensions?.includes(getFileExtension(file.name))
  return !isWrongFileType || `File format must be ${createFileFormatEnumeration(acceptableExtensions)}`
}
