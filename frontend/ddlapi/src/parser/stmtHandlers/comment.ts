// Private module — handles CommentStmt (COMMENT ON ...).

import type { CommentStmt, RawStmt, Node } from '@pgsql/types'
import { AttrKind, DdlErrorKind } from '../../constants'
import type { Attr } from '../../attrs'
import { comment as makeComment } from '../../factories'
import { replaceOrAppendAttr, removeAttr } from '../../utils'
import type { SchemaAccumulator } from '../schemaAccumulator'
import { strVal, stmtRangeOf, unwrapNode } from '../astHelpers'
import { PgNode, PgCommentObject } from '../pgAst'
import type { DdlNonFatalError } from '../buildFromDdl'

/**
 * Extracts a list of String sval tokens from a { List: { items: [...] } } node.
 */
function listStrings(node: Node | undefined): string[] {
  const list = unwrapNode(node, PgNode.List)
  if (!list?.items) return []
  return list.items.map(n => strVal(n) ?? '').filter(Boolean)
}

function setAttr(obj: { attrs?: Attr[] }, newAttr: Attr): void {
  obj.attrs = replaceOrAppendAttr(obj.attrs, newAttr)
}

function clearAttr(obj: { attrs?: Attr[] }, kind: string): void {
  const result = removeAttr(obj.attrs, kind as Attr['kind'])
  if (result.length > 0) {
    obj.attrs = result
  } else {
    delete obj.attrs
  }
}

export function handleComment(
  stmt: CommentStmt,
  rawStmt: RawStmt,
  defaultSchemaName: string,
  acc: SchemaAccumulator,
  onError: (e: DdlNonFatalError) => void,
): void {
  const objtype = stmt.objtype
  const commentText = stmt.comment     // undefined when IS NULL
  const range = stmtRangeOf(rawStmt)

  switch (objtype) {
    case PgCommentObject.Table: {
      const parts = listStrings(stmt.object)
      if (parts.length === 0) return
      const tableName = parts[parts.length - 1]!
      const schemaName = parts.length > 1 ? parts[parts.length - 2]! : defaultSchemaName
      const tableKey = `${schemaName}.${tableName}`
      const table = acc.tableRegistry.get(tableKey)
      if (!table) {
        onError({ kind: DdlErrorKind.UnresolvedReference, target: tableKey, message: `COMMENT ON TABLE: unknown table '${tableKey}'`, ...(range && { range }) })
        return
      }
      if (commentText !== undefined) {
        setAttr(table, makeComment(commentText))
      } else {
        clearAttr(table, AttrKind.Comment)
      }
      break
    }

    case PgCommentObject.Column: {
      // parts: [schema?, table, column]
      const parts = listStrings(stmt.object)
      if (parts.length < 2) return
      const colName = parts[parts.length - 1]!
      const tableName = parts[parts.length - 2]!
      const schemaName = parts.length > 2 ? parts[parts.length - 3]! : defaultSchemaName
      const colKey = `${schemaName}.${tableName}.${colName}`
      const col = acc.columnRegistry.get(colKey)
      if (!col) {
        onError({ kind: DdlErrorKind.UnresolvedReference, target: colKey, message: `COMMENT ON COLUMN: unknown column '${colKey}'`, ...(range && { range }) })
        return
      }
      if (commentText !== undefined) {
        setAttr(col, makeComment(commentText))
      } else {
        clearAttr(col, AttrKind.Comment)
      }
      break
    }

    case PgCommentObject.Index: {
      // parts: [schema?, indexName]
      const parts = listStrings(stmt.object)
      if (parts.length === 0) return
      const indexName = parts[parts.length - 1]!
      const schemaName = parts.length > 1 ? parts[parts.length - 2]! : defaultSchemaName
      const idxKey = `${schemaName}.${indexName}`
      const index = acc.indexRegistry.get(idxKey)
      if (!index) {
        onError({ kind: DdlErrorKind.UnresolvedReference, target: idxKey, message: `COMMENT ON INDEX: unknown index '${idxKey}'`, ...(range && { range }) })
        return
      }
      if (commentText !== undefined) {
        setAttr(index, makeComment(commentText))
      } else {
        clearAttr(index, AttrKind.Comment)
      }
      break
    }

    case PgCommentObject.Type: {
      // object is a TypeName node; extract schema + name from its names list
      const tn = unwrapNode(stmt.object, PgNode.TypeName)
      if (!tn?.names || tn.names.length === 0) return
      const names = tn.names
      const typeName = strVal(names[names.length - 1])
      const schemaName = names.length > 1 ? (strVal(names[names.length - 2]) ?? defaultSchemaName) : defaultSchemaName
      if (!typeName) return
      const typeKey = `${schemaName}.${typeName}`
      const typeObj = acc.typeNameLookup.get(typeKey)
      if (!typeObj) {
        onError({ kind: DdlErrorKind.UnresolvedReference, target: typeKey, message: `COMMENT ON TYPE: unknown type '${typeKey}'`, ...(range && { range }) })
        return
      }
      if (commentText !== undefined) {
        setAttr(typeObj as { attrs?: Attr[] }, makeComment(commentText))
      } else {
        clearAttr(typeObj as { attrs?: Attr[] }, AttrKind.Comment)
      }
      break
    }

    case PgCommentObject.Schema: {
      // object is a bare String node holding the schema name (not a List).
      const schemaName = strVal(stmt.object)
      if (!schemaName) return
      const schema = acc.getSchema(schemaName)
      if (!schema) {
        onError({ kind: DdlErrorKind.UnresolvedReference, target: schemaName, message: `COMMENT ON SCHEMA: unknown schema '${schemaName}'`, ...(range && { range }) })
        return
      }
      if (commentText !== undefined) {
        setAttr(schema, makeComment(commentText))
      } else {
        clearAttr(schema, AttrKind.Comment)
      }
      break
    }

    case PgCommentObject.TableConstraint: {
      // parts: [schema?, tableName, constraintName]
      // libpg-query: List items = [tableName String, constraintName String]
      const parts = listStrings(stmt.object)
      if (parts.length < 2) return
      const constraintName = parts[parts.length - 1]!
      const tableName = parts[parts.length - 2]!
      const schemaName = parts.length > 2 ? parts[parts.length - 3]! : defaultSchemaName
      const tableKey = `${schemaName}.${tableName}`
      const table = acc.tableRegistry.get(tableKey)
      if (!table) {
        onError({ kind: DdlErrorKind.UnresolvedReference, target: tableKey, message: `COMMENT ON CONSTRAINT: unknown table '${tableKey}'`, ...(range && { range }) })
        return
      }

      // Search table.attrs for a named Check
      let found = false
      const tableAttrs = (table.attrs ?? []) as Attr[]
      for (const attr of tableAttrs) {
        if (attr.kind === AttrKind.Check && (attr as { name?: string }).name === constraintName) {
          if (commentText !== undefined) {
            setAttr(attr as { attrs?: Attr[] }, makeComment(commentText))
          } else {
            clearAttr(attr as { attrs?: Attr[] }, AttrKind.Comment)
          }
          found = true
          break
        }
      }

      // Search table.foreignKeys for a named ForeignKey
      if (!found) {
        const fks = table.foreignKeys ?? []
        for (const fk of fks) {
          if (fk.symbol === constraintName) {
            if (commentText !== undefined) {
              setAttr(fk, makeComment(commentText))
            } else {
              clearAttr(fk, AttrKind.Comment)
            }
            found = true
            break
          }
        }
      }

      if (!found) {
        onError({
          kind: DdlErrorKind.UnresolvedReference,
          target: `${tableKey}.${constraintName}`,
          message: `COMMENT ON CONSTRAINT: unknown constraint '${constraintName}' on table '${tableKey}'`,
          ...(range && { range }),
        })
      }
      break
    }

    default:
      // All other COMMENT ON object types are silently ignored
      break
  }
}
