import type { Attr } from './attrs'
import type { Expr, Literal, RawExpr, NamedDefault } from './exprs'
import { ExprKind, ObjectKind } from './constants'

/**
 * Find the first attr whose kind matches the given kind discriminant.
 */
export function findAttr<K extends Attr['kind']>(
  attrs: readonly Attr[] | undefined,
  kind: K,
): Extract<Attr, { kind: K }> | undefined {
  return attrs?.find((a): a is Extract<Attr, { kind: K }> => a.kind === kind)
}

/**
 * Replace the first attr whose kind matches attr.kind, or append to a new array.
 * Returns a new array — inputs are never mutated.
 *
 * IDENTITY CONTRACT: replacement keys on the `kind` string — exactly one attr per
 * kind value is kept. This diverges from Go's ReplaceOrAppend which uses
 * reflect.TypeOf(v) as the key (Go type identity). In TypeScript there is no
 * runtime type identity for plain interfaces, so `kind` string is the closest
 * approximation. Consequence: driver extensions using UnknownAttr MUST assign a
 * unique, stable `kind` string per attr type; two distinct driver attrs with the
 * same `kind` string would collide here just as two Go types would not.
 */
export function replaceOrAppendAttr(attrs: readonly Attr[] | undefined, attr: Attr): Attr[] {
  if (attrs === undefined) return [attr]
  const idx = attrs.findIndex(a => a.kind === attr.kind)
  if (idx === -1) return [...attrs, attr]
  return [...attrs.slice(0, idx), attr, ...attrs.slice(idx + 1)]
}

/**
 * Remove all attrs of the given kind. Returns a new array — inputs are never mutated.
 */
export function removeAttr<K extends Attr['kind']>(
  attrs: readonly Attr[] | undefined,
  kind: K,
): Attr[] {
  if (attrs === undefined) return []
  return attrs.filter(a => a.kind !== kind)
}

/**
 * Unwrap a NamedDefault to its inner Literal | RawExpr.
 * Literal and RawExpr pass through unchanged.
 * Throws on UnknownExpr — caller must guard on kind first.
 *
 * Use when you need the concrete expression value regardless of whether it is named.
 */
export function underlyingExpr(x: Expr): Literal | RawExpr {
  if (x.kind === ExprKind.Literal) return x as Literal
  if (x.kind === ExprKind.RawExpr) return x as RawExpr
  if (x.kind === ObjectKind.NamedDefault) return (x as NamedDefault).expr
  throw new Error(`underlyingExpr: cannot unwrap UnknownExpr with kind '${x.kind}'`)
}
