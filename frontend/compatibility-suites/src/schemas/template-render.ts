const SCHEMA_PLACEHOLDER = '__SCHEMA__'

/**
 * Schema fragments used by schema suite templates.
 */
export type SchemaFragments = { schema: string }

/**
 * Normalizes CRLF to LF to keep placeholder matching/output stable across OSes.
 */
const normalizeNewlines = (value: string): string => value.replace(/\r\n/g, '\n')

/**
 * Adds an indent prefix to each non-empty line in a fragment.
 * Uses regex replace for better performance with large schemas (avoids N intermediate strings).
 */
const indentFragment = (fragment: string, indent: string): string => {
  const normalized = normalizeNewlines(fragment).trimEnd()
  if (!normalized) {
    return ''
  }
  if (!indent) {
    return normalized
  }
  // Prepend indent to the first line, then to every line after a newline (if non-empty)
  return indent + normalized.replace(/\n(?=.)/g, `\n${indent}`)
}

/**
 * Replaces the line-only schema placeholder token with an indented fragment.
 * Throws if the placeholder is missing or appears more than once.
 */
const replaceSchemaPlaceholder = (template: string, fragment: string): string => {
  const normalizedTemplate = normalizeNewlines(template)
  const lines = normalizedTemplate.split('\n')
  const matches = lines
    .map((line, index) => (line.trim() === SCHEMA_PLACEHOLDER ? index : -1))
    .filter((index) => index !== -1)

  if (matches.length === 0) {
    throw new Error(
      `Template placeholder '${SCHEMA_PLACEHOLDER}' not found. `
        + `Template start: ${normalizedTemplate.slice(0, 120)}...`,
    )
  }
  if (matches.length > 1) {
    throw new Error(
      `Template placeholder '${SCHEMA_PLACEHOLDER}' must appear only once. `
        + `Found ${matches.length} occurrences. Template start: ${normalizedTemplate.slice(0, 120)}...`,
    )
  }

  const lineIndex = matches[0]

  const indent = lines[lineIndex].match(/^\s*/)?.[0] ?? ''
  const indentedFragment = indentFragment(fragment, indent)

  if (!indentedFragment) {
    lines.splice(lineIndex, 1)
    return lines.join('\n')
  }

  lines.splice(lineIndex, 1, ...indentedFragment.split('\n'))
  return lines.join('\n')
}

/**
 * Renders a schema suite template with the provided fragments.
 * Throws if the template is missing or duplicates the schema placeholder.
 */
export const renderTemplate = (template: string, fragments: SchemaFragments): string => {
  const rendered = replaceSchemaPlaceholder(template, fragments.schema)
  return `${normalizeNewlines(rendered).trimEnd()}\n`
}
