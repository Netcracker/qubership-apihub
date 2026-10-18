import {
  Expr,
  ExprKind,
  ObjectKind,
  underlyingExpr,
} from '@netcracker/qubership-apihub-ddlapi'
import {
  isExprWithLiteralValue,
  isExprWithRawText,
  isLiteralExpr,
  isRawExpr,
} from './guards/expr'

/** Formats a ddlapi {@link Expr} for display in DDL table viewers. */
export function formatDdlExpr(expr: Expr): string {
  switch (expr.kind) {
    case ExprKind.Literal:
      return isLiteralExpr(expr) ? expr.value : expr.kind
    case ExprKind.RawExpr:
      return isRawExpr(expr) ? expr.expr : expr.kind
    case ObjectKind.NamedDefault: {
      try {
        return formatDdlExpr(underlyingExpr(expr))
      } catch {
        return expr.kind
      }
    }
    default: {
      if (isExprWithRawText(expr)) {
        return expr.expr
      }
      if (isExprWithLiteralValue(expr)) {
        return expr.value
      }
      return expr.kind
    }
  }
}

/**
 * Formats a column default {@link Expr} for viewer display.
 * SQL string literals lose their surrounding single quotes; other shapes - including a `b'...'`
 * bit literal or an unresolved `E'...'` escape-string literal (see {@link unwrapSqlStringLiteral})
 * - are unchanged. Control characters in the unwrapped content are re-escaped for display - see
 * {@link escapeControlCharsForDisplay}.
 */
export function formatDefaultValueForDisplay(expr: Expr): string {
  return escapeControlCharsForDisplay(unwrapSqlStringLiteral(formatDdlExpr(expr)))
}

/** Normalises a preformatted default value string for viewer display. */
export function formatDefaultValueDisplayString(value: string): string {
  return escapeControlCharsForDisplay(unwrapSqlStringLiteral(value))
}

/**
 * Strips a value's surrounding single quotes only when it is a **plain** SQL string literal -
 * i.e. `value[0]` is itself the opening quote, with nothing before it. A *prefixed* literal (a
 * bit literal `b'101'`, or a Postgres `E'...'` escape string that ddlapi left unresolved - see
 * {@link escapeControlCharsForDisplay}'s doc comment) is left completely untouched, prefix and
 * quotes included: the prefix carries meaning (`b` = bit string; `E` = "read the escapes
 * literally, don't assume they're already resolved") that displaying only the unwrapped content
 * would silently discard, showing something that looks like a resolved value but may not be one.
 */
function unwrapSqlStringLiteral(value: string): string {
  if (value.length < 2 || value[0] !== "'" || value[value.length - 1] !== "'") {
    return value
  }

  return value.slice(1, -1).replace(/''/g, "'")
}

/**
 * A column default value (unlike a validation-row chip or a generated expression, which are
 * always rendered as raw SQL text) is meant to read as the value's literal content, so ddlapi's
 * underlying parser resolves an `E'...'` literal's named escapes (`\n`, `\r`, `\t`) into real
 * control-character bytes before ever handing the value to this layer - see e.g.
 * packages/samples/ddlapi/escaping-spec-chars/default-value-lf (`E'before\nafter'` parses to a
 * value containing a real newline byte, with the `E` prefix already gone - ddlapi only keeps it
 * when it couldn't fully resolve the literal, see below). Rendering that byte as-is either breaks
 * the single-line `Default` row layout (a real newline) or is simply invisible (CR/TAB) - the row
 * must show the same escape notation a person would type/read, matching the literal's original
 * SQL content (`before\nafter`), not the resolved byte.
 *
 * Deliberately does **not** escape a literal backslash: confirmed empirically (see
 * packages/samples/ddlapi/escaping-spec-chars/default-value-backslash) that ddlapi never resolves
 * a `\\` escape into a real single-backslash byte - it always leaves the literal two-character
 * `\\` sequence untouched in the extracted value (keeping the `E` prefix too, e.g.
 * `E'path\\to\\file'`), even when a `\n`/`\r`/`\t` escape elsewhere in the *same* literal does get
 * resolved into a real byte. Escaping a backslash here as well would double an already-correct
 * `\\` into `\\\\`. Since `unwrapSqlStringLiteral` leaves an `E`-prefixed, still-unresolved literal
 * completely alone (prefix, quotes and all), this function only ever needs to convert a real
 * control-character byte, never a backslash - the two concerns compose correctly without needing
 * to special-case the prefix here too.
 */
function escapeControlCharsForDisplay(value: string): string {
  return value
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")
}
