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
