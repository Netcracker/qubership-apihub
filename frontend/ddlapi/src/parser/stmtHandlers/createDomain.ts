// Private module — handles CreateDomainStmt (CREATE DOMAIN).
//
// Domains are a PostgreSQL-specific construct. They are not modelled as a
// first-class SchemaType in the generic ddlapi schema; instead each domain is
// stored as a plain UnknownObject / UnknownType with kind 'Domain'. This
// keeps the core schema model driver-neutral while still allowing PG-aware
// consumers to inspect domain definitions and ensuring that columns whose type
// references a domain resolve to the shared 'Domain' instance rather than
// staying as a raw UnsupportedType.

import type { CreateDomainStmt, RawStmt } from '@pgsql/types'
import type { SchemaObject } from '../../schema'
import type { SchemaType } from '../../types'
import type { Check } from '../../attrs'
import type { Expr } from '../../exprs'
import { DdlErrorKind } from '../../constants'
import { newCheck, unsupportedType } from '../../factories'
import { mapTypeName } from '../typeMapper'
import type { SchemaAccumulator } from '../schemaAccumulator'
import { strVal, stmtRangeOf, nodeToExpr, exprToString, unwrapNode } from '../astHelpers'
import { PgNode, PgConstrType } from '../pgAst'
import type { DdlNonFatalError } from '../buildFromDdl'
import { PgObjectKind } from '../../postgres.constants'

export function handleCreateDomain(
  stmt: CreateDomainStmt,
  rawStmt: RawStmt,
  defaultSchemaName: string,
  acc: SchemaAccumulator,
  onError: (e: DdlNonFatalError) => void,
): void {
  const domainNameParts = stmt.domainname ?? []
  const domainName = strVal(domainNameParts[domainNameParts.length - 1])
  if (!domainName) return
  const schemaName =
    domainNameParts.length > 1
      ? (strVal(domainNameParts[domainNameParts.length - 2]) ?? defaultSchemaName)
      : defaultSchemaName
  const qualifiedName = `${schemaName}.${domainName}`

  if (acc.typeRegistry.has(qualifiedName)) {
    const range = stmtRangeOf(rawStmt)
    onError({
      kind: DdlErrorKind.DuplicateObject,
      objectKind: PgObjectKind.Domain,
      qualifiedName,
      message: `Duplicate domain: ${qualifiedName}`,
      ...(range && { range }),
    })
    return
  }

  const tn = stmt.typeName
  const baseType: SchemaType = tn ? mapTypeName(tn) : unsupportedType('unknown')

  let nullability: boolean | undefined
  let defaultExpr: Expr | undefined
  const checks: Check[] = []

  const constraints = stmt.constraints ?? []
  for (const conNode of constraints) {
    const con = unwrapNode(conNode, PgNode.Constraint)
    if (!con) continue
    const ct = con.contype

    if (ct === PgConstrType.NotNull) {
      nullability = false
    } else if (ct === PgConstrType.Null) {
      nullability = true
    } else if (ct === PgConstrType.Default) {
      const re = con.raw_expr
      if (re) defaultExpr = nodeToExpr(re)
    } else if (ct === PgConstrType.Check) {
      const re = con.raw_expr
      const expr = re ? exprToString(re) : ''
      checks.push(newCheck(expr, con.conname))
    }
  }

  const pgDomain = {
    kind: PgObjectKind.Domain,
    type: domainName,
    baseType,
    ...(nullability !== undefined && { null: nullability }),
    ...(defaultExpr !== undefined && { default: defaultExpr }),
    ...(checks.length > 0 && { checks }),
  }

  acc.registerType(schemaName, domainName, pgDomain as unknown as SchemaType & SchemaObject)
}
