// Private module — handles CommentStmt (COMMENT ON ...).

import type { CommentStmt, RawStmt, Node } from '@pgsql/types'
import { AttrKind, DdlErrorKind } from '../../constants'
import type { Attr } from '../../attrs'
import { comment as makeComment } from '../../factories'
import { replaceOrAppendAttr, removeAttr } from '../../utils'
import type { SchemaAccumulator } from '../schemaAccumulator'
import { strVal, stmtRangeOf } from '../astHelpers'
import type { DdlNonFatalError } from '../buildFromDdl'

/**
 * Extracts a list of String sval tokens from a { List: { items: [...] } } node.
 */
function listStrings(node: Node | undefined): string[] {
  if (!node) return []
  const list = (node as Record<string, unknown>)['List'] as { items?: Node[] } | undefined
  if (!list?.items) return []
  return list.items.map(n => strVal(n) ?? '').filter(Boolean)
}

function setAttr(obj: object, attrs: readonly Attr[] | undefined, newAttr: Attr): void {
  ; (obj as Record<string, unknown>)['attrs'] = replaceOrAppendAttr(attrs, newAttr)
}

function clearAttr(obj: object, attrs: readonly Attr[] | undefined, kind: string): void {
  const result = removeAttr(attrs, kind as Attr['kind'])
    ; (obj as Record<string, unknown>)['attrs'] = result.length > 0 ? result : undefined
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
    case 'OBJECT_TABLE': {
      const parts = listStrings(stmt.object as Node | undefined)
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
        setAttr(table as object, table.attrs, makeComment(commentText))
      } else {
        clearAttr(table as object, table.attrs, AttrKind.Comment)
      }
      break
    }

    case 'OBJECT_COLUMN': {
      // parts: [schema?, table, column]
      const parts = listStrings(stmt.object as Node | undefined)
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
        setAttr(col as object, col.attrs, makeComment(commentText))
      } else {
        clearAttr(col as object, col.attrs, AttrKind.Comment)
      }
      break
    }

    case 'OBJECT_INDEX': {
      // parts: [schema?, indexName]
      const parts = listStrings(stmt.object as Node | undefined)
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
        setAttr(index as object, index.attrs, makeComment(commentText))
      } else {
        clearAttr(index as object, index.attrs, AttrKind.Comment)
      }
      break
    }

    case 'OBJECT_TYPE': {
      // object is a TypeName node; extract schema + name from its names list
      const typeNameNode = stmt.object as Record<string, unknown> | undefined
      const tn = typeNameNode?.['TypeName'] as { names?: Node[] } | undefined
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
        setAttr(typeObj as object, (typeObj as { attrs?: readonly Attr[] }).attrs, makeComment(commentText))
      } else {
        clearAttr(typeObj as object, (typeObj as { attrs?: readonly Attr[] }).attrs, AttrKind.Comment)
      }
      break
    }

    case 'OBJECT_TABCONSTRAINT': {
      // parts: [schema?, tableName, constraintName]
      // pgsql-parser: List items = [tableName String, constraintName String]
      const parts = listStrings(stmt.object as Node | undefined)
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
            ; (attr as Record<string, unknown>)['attrs'] = replaceOrAppendAttr(
              (attr as { attrs?: readonly Attr[] }).attrs,
              makeComment(commentText),
            )
          } else {
            ; (attr as Record<string, unknown>)['attrs'] = removeAttr(
              (attr as { attrs?: readonly Attr[] }).attrs,
              AttrKind.Comment,
            )
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
              setAttr(fk as object, fk.attrs, makeComment(commentText))
            } else {
              clearAttr(fk as object, fk.attrs, AttrKind.Comment)
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
