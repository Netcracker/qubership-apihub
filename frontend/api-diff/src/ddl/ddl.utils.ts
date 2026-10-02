import { isObject, isString } from '../utils'

// Shared low-level helpers for the ddlapi diff rules (classifiers, rule tree, descriptions).

/** Reads a node's `kind` discriminant, or `undefined` for a non-object / kind-less value. */
export const readKind = (value: unknown): string | undefined =>
  (isObject(value) && isString(value.kind) ? value.kind : undefined)

/** Reads a `SchemaType`'s canonical SQL type name, or `undefined` when it carries none. */
export const readTypeName = (value: unknown): string | undefined =>
  (isObject(value) && isString(value.type) ? value.type : undefined)
