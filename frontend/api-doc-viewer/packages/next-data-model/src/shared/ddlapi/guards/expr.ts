import { Expr, ExprKind, Literal, RawExpr } from '@netcracker/qubership-apihub-ddlapi'
import { isObject } from '../../../utilities'

export function isLiteralExpr(value: Expr): value is Literal {
  return value.kind === ExprKind.Literal && typeof value.value === 'string'
}

export function isRawExpr(value: Expr): value is RawExpr {
  return value.kind === ExprKind.RawExpr && typeof value.expr === 'string'
}

export function isExprWithRawText(value: Expr): value is Expr & { expr: string } {
  return isObject(value) && typeof value.expr === 'string'
}

export function isExprWithLiteralValue(value: Expr): value is Expr & { value: string } {
  return isObject(value) && typeof value.value === 'string'
}
