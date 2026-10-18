// Private module — the denylist of type names that should NOT raise an
// UnresolvedTypeReference warning when they have no CREATE in the DDL: built-in
// PostgreSQL types and common extension types.
//
// Names are compared against rawTypeName() output, which strips the pg_catalog
// prefix and is already case-folded by the parser's lexer (unquoted →
// lowercase). The list is intentionally extensible — add extension types as
// needed.

/** Built-in names recognised by typeMapper.pgCatalog() (rawTypeName form). */
const BUILTIN_TYPE_NAMES = [
  'bool', 'int2', 'int4', 'int8', 'float4', 'float8', 'numeric',
  'varchar', 'bpchar', 'text', 'bytea', 'date', 'time', 'timetz',
  'timestamp', 'timestamptz', 'interval', 'json', 'jsonb', 'uuid', 'xml',
  'money', 'bit', 'varbit', 'inet', 'cidr', 'macaddr', 'macaddr8',
  'tsvector', 'tsquery', 'point', 'line', 'lseg', 'box', 'path', 'polygon',
  'circle',
  // serial pseudo-types (typeMapper SERIAL map)
  'smallserial', 'serial2', 'serial', 'serial4', 'bigserial', 'serial8',
  // common bare SQL spellings that may reach us unprefixed
  'char', 'character', 'int', 'integer', 'bigint', 'smallint', 'boolean',
  'real', 'decimal', 'float', 'double',
]

/** Common extension types — present via CREATE EXTENSION, never as a CREATE TYPE we'd find. */
const EXTENSION_TYPE_NAMES = [
  'citext', 'hstore', 'ltree', 'lquery', 'ltxtquery', 'vector',
  'geometry', 'geography', 'cube', 'earth', 'isn', 'ean13', 'isbn',
  'isbn13', 'ismn', 'ismn13', 'issn', 'issn13', 'upc', 'seg',
]

const KNOWN_TYPE_NAMES: ReadonlySet<string> = new Set([
  ...BUILTIN_TYPE_NAMES,
  ...EXTENSION_TYPE_NAMES,
])

/**
 * True when `rawName` is a recognised built-in or extension type and therefore
 * should not produce an UnresolvedTypeReference warning. A schema-qualified name
 * (containing a dot) is always treated as a user type and returns false.
 */
export function isKnownTypeName(rawName: string): boolean {
  if (rawName.includes('.')) return false
  return KNOWN_TYPE_NAMES.has(rawName)
}
