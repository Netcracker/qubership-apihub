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
 * SQL string literals lose their surrounding single quotes; other shapes are unchanged.
 */
export function formatDefaultValueForDisplay(expr: Expr): string {
  return unwrapSqlStringLiteral(formatDdlExpr(expr))
}

/** Normalises a preformatted default value string for viewer display. */
export function formatDefaultValueDisplayString(value: string): string {
  return unwrapSqlStringLiteral(value)
}

function unwrapSqlStringLiteral(value: string): string {
  if (value.length < 2 || value[0] !== "'" || value[value.length - 1] !== "'") {
    return value
  }

  return value.slice(1, -1).replace(/''/g, "'")
}
