/**
 * Compile-time exhaustiveness tests for discriminated unions.
 *
 * Each `_exhaustive*` function must handle every known variant via a switch.
 * The `assertNever` call in the `default` branch makes tsc error if any variant
 * is unhandled: the default residual type would not be `never`, so the call
 * would fail to type-check.
 *
 * To add a new known type:
 *  1. Add the interface to the relevant source file and TypeKind/AttrKind/etc.
 *  2. Add the interface to the `Known*` alias below.
 *  3. Add a `case` in the exhaustive function below.
 *  4. tsc will guide you if you miss any of these steps.
 */

import type {
  BoolType, EnumType, IntegerType, DecimalType, FloatType,
  StringType, BinaryType, TimeType, JSONType, SpatialType, UUIDType, UnsupportedType,
  Literal, RawExpr, NamedDefault,
  Comment, Charset, Collation, Check, GeneratedExpr,
} from '@netcracker/qubership-apihub-ddlapi'
import { TypeKind, ExprKind, AttrKind, ObjectKind } from '@netcracker/qubership-apihub-ddlapi'

/** Fails to compile if `x` is not `never` — used as the exhaustiveness sentinel. */
function assertNever(x: never): never {
  throw new Error(`Unhandled discriminant: ${String((x as { kind?: unknown }).kind)}`)
}

// ── SchemaType exhaustiveness ─────────────────────────────────────────────────

/**
 * All known SchemaType variants, excluding the UnknownType escape hatch.
 * Keep in sync with SchemaType / TypeKind when adding new types.
 */
type KnownSchemaType =
  | BoolType | EnumType | IntegerType | DecimalType | FloatType
  | StringType | BinaryType | TimeType | JSONType | SpatialType
  | UUIDType | UnsupportedType

function _exhaustiveSchemaType(t: KnownSchemaType): string {
  switch (t.kind) {
    case TypeKind.BoolType: return t.t
    case TypeKind.EnumType: return t.values.join(',')
    case TypeKind.IntegerType: return t.t
    case TypeKind.DecimalType: return t.t
    case TypeKind.FloatType: return t.t
    case TypeKind.StringType: return t.t
    case TypeKind.BinaryType: return t.t
    case TypeKind.TimeType: return t.t
    case TypeKind.JSONType: return t.t
    case TypeKind.SpatialType: return t.t
    case TypeKind.UUIDType: return t.t
    case TypeKind.UnsupportedType: return t.t
    default:
      return assertNever(t)
  }
}

// ── Expr exhaustiveness ───────────────────────────────────────────────────────

/**
 * All known Expr variants, excluding the UnknownExpr escape hatch.
 * Keep in sync with Expr / ExprKind / ObjectKind.NamedDefault.
 */
type KnownExpr = Literal | RawExpr | NamedDefault

function _exhaustiveExpr(e: KnownExpr): string {
  switch (e.kind) {
    case ExprKind.Literal: return e.v
    case ExprKind.RawExpr: return e.x
    case ObjectKind.NamedDefault: return e.name
    default:
      return assertNever(e)
  }
}

// ── Attr exhaustiveness ───────────────────────────────────────────────────────

/**
 * All known Attr variants, excluding the UnknownAttr escape hatch.
 * Keep in sync with Attr / AttrKind.
 */
type KnownAttr = Comment | Charset | Collation | Check | GeneratedExpr

function _exhaustiveAttr(a: KnownAttr): string {
  switch (a.kind) {
    case AttrKind.Comment: return a.text
    case AttrKind.Charset: return a.v
    case AttrKind.Collation: return a.v
    case AttrKind.Check: return a.expr
    case AttrKind.GeneratedExpr: return a.expr
    default:
      return assertNever(a)
  }
}

// ── Jest placeholder ──────────────────────────────────────────────────────────
// The functions above are compile-time checks; they are never called at runtime.
// This test confirms the module loads and tsc accepted all exhaustive switches.

test('compile-time exhaustiveness: all known union variants are handled', () => {
  // Verify the functions exist (they would fail to compile if any case was missing).
  expect(typeof _exhaustiveSchemaType).toBe('function')
  expect(typeof _exhaustiveExpr).toBe('function')
  expect(typeof _exhaustiveAttr).toBe('function')
})
